# Code Review

👀 **bmad-code-review** | Quality Validation

Review implemented code against acceptance criteria and quality standards.

## Usage

```
bmad-code-review [story-id-or-diff]
```

## How It Works

1. Read story acceptance criteria
2. Review implementation:
   - Verify acceptance criteria are met
   - Check for performance issues
   - Review test coverage
   - Check adherence to architecture
3. Provide feedback or approve

## Review Checklist

- [ ] All acceptance criteria met
- [ ] Tests pass (unit + E2E)
- [ ] No regression in existing tests
- [ ] Code follows project conventions
- [ ] No security vulnerabilities introduced
- [ ] Performance acceptable
- [ ] Documentation updated (if needed)
