# Adversarial Review (General)

🔍 **bmad-review-adversarial-general** | Cynical Review

A review technique where the reviewer MUST find issues. No "looks good" allowed. Adopts a cynical stance — assume problems exist and find them.

## How It Works

1. **Read content** with a cynical, critical perspective
2. **Identify issues** across completeness, correctness, and quality
3. **Search for what's missing** — not just what's present and wrong
4. **Minimum threshold** — Must find 10+ issues or re-analyze deeper

## Usage

```
bmad-review-adversarial-general [content]
```

Example:
```
bmad-review-adversarial-general src/store/tradingStore.ts
```

## Review Dimensions

- **Completeness** — What's missing? Edge cases? Error handling?
- **Correctness** — Does it do what it claims? Are there bugs?
- **Quality** — Is the code clean? Are there code smells?
- **Security** — Are there vulnerabilities?
- **Performance** — Are there inefficiencies?
- **Maintainability** — Will future developers understand this?

## Output Format

```markdown
## Adversarial Review: [Artifact]

### Findings

1. **[SEVERITY]** — [Location] — [Description]
2. **[SEVERITY]** — [Location] — [Description]
...

### Summary
- Critical: N
- High: N
- Medium: N
- Low: N

### Recommendations
[Prioritized action items]
```

## Human Filtering Required

The AI is instructed to find problems, so it will find problems even when they don't exist. **You decide what's real.** Review each finding, dismiss false positives, fix what matters.
