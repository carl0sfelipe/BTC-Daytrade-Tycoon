# Check Implementation Readiness

✅ **bmad-check-implementation-readiness** | Validate Planning Cohesion

Validate that PRD, Architecture, and Stories are aligned before implementation starts.

## Usage

```
bmad-check-implementation-readiness
```

## How It Works

1. Read all planning artifacts:
   - PRD.md
   - architecture.md
   - epics-and-stories.md
2. Check alignment:
   - Every story traces to a PRD requirement
   - Architecture supports all stories
   - No conflicting technical decisions
   - Dependencies are resolvable
3. Report gaps or approve for implementation

## Output

Readiness report with:
- Status: READY or NOT READY
- Gaps found
- Recommended fixes
