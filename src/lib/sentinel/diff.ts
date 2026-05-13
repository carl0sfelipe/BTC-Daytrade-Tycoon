import type { EngineStateDelta } from "./types";

/**
 * Compute a structural delta between two plain JS objects.
 *
 * Arrays are diffed by `id` when items are objects with an `id` field,
 * avoiding serialising the entire order book when only one order changed.
 */
export function diffState(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
): EngineStateDelta {
  const changedPaths: EngineStateDelta["changedPaths"][number][] = [];
  diffObjects(previous, current, "", changedPaths);
  return { changedPaths, isCheckpoint: false };
}

function diffObjects(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  path: string,
  acc: EngineStateDelta["changedPaths"][number][],
): void {
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    const childPath = path ? `${path}.${key}` : key;
    const left = prev[key];
    const right = next[key];

    if (!Object.hasOwn(next, key)) {
      acc.push({ path: childPath, oldValue: left, newValue: undefined });
      continue;
    }
    if (!Object.hasOwn(prev, key)) {
      acc.push({ path: childPath, oldValue: undefined, newValue: right });
      continue;
    }
    if (typeof left !== typeof right) {
      acc.push({ path: childPath, oldValue: left, newValue: right });
      continue;
    }
    if (Array.isArray(left) && Array.isArray(right)) {
      diffArrays(left, right, childPath, acc);
      continue;
    }
    if (isPlainObject(left) && isPlainObject(right)) {
      diffObjects(left, right, childPath, acc);
      continue;
    }
    if (left !== right) {
      acc.push({ path: childPath, oldValue: left, newValue: right });
    }
  }
}

function diffArrays(
  prev: ReadonlyArray<unknown>,
  next: ReadonlyArray<unknown>,
  path: string,
  acc: EngineStateDelta["changedPaths"][number][],
): void {
  if (prev.length !== next.length) {
    acc.push({ path, oldValue: prev, newValue: next });
    return;
  }

  for (let i = 0; i < prev.length; i++) {
    const itemPath = `${path}[${i}]`;
    const left = prev[i];
    const right = next[i];

    if (left === right) continue;

    if (hasId(left) && hasId(right) && left.id === right.id) {
      diffObjects(left, right, itemPath, acc);
      continue;
    }

    acc.push({ path: itemPath, oldValue: left, newValue: right });
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasId(v: unknown): v is { id: string } {
  return isPlainObject(v) && typeof v.id === "string";
}
