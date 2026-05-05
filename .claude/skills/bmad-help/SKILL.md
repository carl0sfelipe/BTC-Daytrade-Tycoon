# BMad Help

🆘 **bmad-help** | Your Intelligent Guide

Inspect your project state, detect what's been done, and recommend the next required or optional step.

## How It Works

1. **Scan project** — Look for existing artifacts (PRD, architecture, stories, sprint status, etc.)
2. **Detect modules** — Check which BMad modules are installed
3. **Recommend next steps** — Prioritized: required first, then optional
4. **Present with commands** — Each recommendation includes the skill command

## Usage

```
bmad-help
```

Or with a specific question:

```
bmad-help I have a trading app idea, where do I start?
bmad-help What should I do next?
bmad-help Show me what's been done so far
```

## Project State Detection

Scans for these artifacts:

| Artifact | Path | Indicates |
|----------|------|-----------|
| Project Context | `_bmad-output/project-context.md` | Context generated |
| Product Brief | `_bmad-output/planning-artifacts/product-brief.md` | Analysis phase started |
| PRD | `_bmad-output/planning-artifacts/PRD.md` | Planning phase complete |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` | Solutioning phase complete |
| Epics & Stories | `_bmad-output/planning-artifacts/epics-and-stories.md` | Stories created |
| Sprint Status | `_bmad-output/implementation-artifacts/sprint-status.yaml` | Sprint tracking active |
| Stories | `stories/*.md` | Stories in progress |

## Recommendations

Based on detected state, recommends:

**If nothing exists:**
1. Generate project context (`bmad-generate-project-context`)
2. Or start with brainstorming (`bmad-brainstorming`)

**If only project context exists:**
1. Create product brief (`bmad-product-brief`)
2. Or jump to PRD (`bmad-create-prd`)

**If PRD exists but no architecture:**
1. Create architecture (`bmad-create-architecture`)

**If architecture exists but no stories:**
1. Create epics & stories (`bmad-create-epics-and-stories`)

**If stories exist but no sprint:**
1. Initialize sprint planning (`bmad-sprint-planning`)

**If sprint is active:**
1. Pick next story and implement (`bmad-dev-story`)
2. Or run code review (`bmad-code-review`)

## Output

Context-aware recommendations with clear next steps and commands.
