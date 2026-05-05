#!/usr/bin/env python3
"""
BMad Customization Resolver

Resolves customization overrides using a three-layer merge model:
  Priority 1 (wins): _bmad/custom/{skill-name}.user.toml  (personal, gitignored)
  Priority 2:        _bmad/custom/{skill-name}.toml        (team/org, committed)
  Priority 3 (last): skill's own customize.toml            (defaults)

And a four-layer merge for central config:
  Priority 1 (wins): _bmad/custom/config.user.toml
  Priority 2:        _bmad/custom/config.toml
  Priority 3:        _bmad/config.user.toml
  Priority 4 (base): _bmad/config.toml

Usage:
  python3 resolve_customization.py --skill /path/to/skill --key agent
  python3 resolve_customization.py --central --key agents

Requirements: Python 3.11+ (uses stdlib tomllib)
"""

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import tomllib
except ImportError:
    print("ERROR: Python 3.11+ required (tomllib not available)", file=sys.stderr)
    sys.exit(1)


def load_toml(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, "rb") as f:
        return tomllib.load(f)


def is_scalar(value):
    return isinstance(value, (str, int, float, bool))


def has_identifier_key(arr):
    """Check if array of tables has a consistent identifier key (code or id)."""
    if not arr or not isinstance(arr, list):
        return None
    if not all(isinstance(item, dict) for item in arr):
        return None
    codes = ["code" in item for item in arr]
    ids = ["id" in item for item in arr]
    if all(codes) and not any(ids):
        return "code"
    if all(ids) and not any(codes):
        return "id"
    return None


def merge_array_of_tables(base, override, key_field):
    """Merge arrays of tables by identifier key."""
    base_map = {item.get(key_field): item for item in base if isinstance(item, dict)}
    result = list(base)
    for item in override:
        if not isinstance(item, dict):
            result.append(item)
            continue
        key = item.get(key_field)
        if key and key in base_map:
            # Replace in place
            for i, existing in enumerate(result):
                if isinstance(existing, dict) and existing.get(key_field) == key:
                    result[i] = merge_dicts(existing, item)
                    break
        else:
            result.append(item)
    return result


def merge_arrays(base, override):
    """Append arrays: base first, then override items."""
    return list(base) + list(override)


def merge_dicts(base: dict, override: dict) -> dict:
    """Deep merge two dicts using BMad structural rules."""
    result = dict(base)
    for key, override_value in override.items():
        if key not in result:
            result[key] = override_value
            continue

        base_value = result[key]

        if is_scalar(override_value):
            result[key] = override_value
        elif isinstance(override_value, dict) and isinstance(base_value, dict):
            result[key] = merge_dicts(base_value, override_value)
        elif isinstance(override_value, list) and isinstance(base_value, list):
            id_key = has_identifier_key(override_value) or has_identifier_key(base_value)
            if id_key:
                result[key] = merge_array_of_tables(base_value, override_value, id_key)
            else:
                result[key] = merge_arrays(base_value, override_value)
        else:
            # Type mismatch — override wins
            result[key] = override_value

    return result


def resolve_skill_customization(skill_root: Path, key: str = None):
    """Resolve customization for a single skill."""
    skill_name = skill_root.name
    project_root = skill_root.parent.parent.parent.parent  # .claude/skills/{name} -> project root
    custom_dir = project_root / "_bmad" / "custom"

    defaults = load_toml(skill_root / "customize.toml")
    team = load_toml(custom_dir / f"{skill_name}.toml")
    user = load_toml(custom_dir / f"{skill_name}.user.toml")

    resolved = merge_dicts(merge_dicts(defaults, team), user)

    if key:
        parts = key.split(".")
        value = resolved
        for part in parts:
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                return {}
        return value
    return resolved


def resolve_central_config(project_root: Path, key: str = None):
    """Resolve central configuration."""
    bmad_dir = project_root / "_bmad"
    custom_dir = bmad_dir / "custom"

    base = load_toml(bmad_dir / "config.toml")
    user_install = load_toml(bmad_dir / "config.user.toml")
    team = load_toml(custom_dir / "config.toml")
    user = load_toml(custom_dir / "config.user.toml")

    resolved = merge_dicts(merge_dicts(merge_dicts(base, user_install), team), user)

    if key:
        parts = key.split(".")
        value = resolved
        for part in parts:
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                return {}
        return value
    return resolved


def main():
    parser = argparse.ArgumentParser(description="BMad Customization Resolver")
    parser.add_argument("--skill", help="Path to skill directory")
    parser.add_argument("--central", action="store_true", help="Resolve central config")
    parser.add_argument("--key", help="Dot-separated key to extract")
    parser.add_argument("--project-root", help="Project root directory")

    args = parser.parse_args()

    if args.central:
        project_root = Path(args.project_root) if args.project_root else Path.cwd()
        resolved = resolve_central_config(project_root, args.key)
    elif args.skill:
        resolved = resolve_skill_customization(Path(args.skill), args.key)
    else:
        print("ERROR: Must specify --skill or --central", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(resolved, indent=2, default=str))


if __name__ == "__main__":
    main()
