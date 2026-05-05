# Editorial Review (Structure)

📐 **bmad-editorial-review-structure** | Structural Editing

Reviews document organization and proposes substantive changes: cuts, merges, moves, and condensing.

## Usage

```
bmad-editorial-review-structure [document]
```

Options:
- `--purpose` — Intended purpose (e.g., "quickstart tutorial")
- `--target-audience` — Who reads this
- `--reader-type` — `humans` or `llm`
- `--length-target` — Target reduction (e.g., "30% shorter")

## Output

Prioritized recommendations:
- **CUT** — Remove redundant or off-topic content
- **MERGE** — Combine related sections
- **MOVE** — Reorder for better flow
- **CONDENSE** — Shorten without losing meaning
- **QUESTION** — Flag unclear or unsupported claims
- **PRESERVE** — Explicitly keep high-value content
