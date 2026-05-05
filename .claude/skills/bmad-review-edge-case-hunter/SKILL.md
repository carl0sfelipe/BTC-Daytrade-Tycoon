# Edge Case Hunter

🐛 **bmad-review-edge-case-hunter** | Exhaustive Branching-Path Analysis

Walk every branching path and boundary condition, report only unhandled cases. Pure path-tracing methodology that mechanically derives edge classes.

## How It Works

1. **Enumerate branching paths** — if/else, loops, switch, ternary, short-circuit
2. **Derive edge classes** mechanically:
   - Missing else/default
   - Unguarded inputs
   - Off-by-one
   - Arithmetic overflow
   - Implicit type coercion
   - Race conditions
   - Timeout gaps
3. **Test paths** against existing guards
4. **Report only unhandled** — silently discard handled ones

## Usage

```
bmad-review-edge-case-hunter [content]
```

Example:
```
bmad-review-edge-case-hunter src/store/tradingStore.ts
```

## Output Format

```json
[
  {
    "location": "tradingStore.ts:47",
    "trigger_condition": "parseFloat returns NaN",
    "guard_snippet": "// no guard present",
    "potential_consequence": "NaN propagates through PnL calculations"
  }
]
```

## Complement to Adversarial Review

- **Adversarial** = attitude-driven, broad scope
- **Edge Case Hunter** = method-driven, mechanical precision

Use both for comprehensive coverage.
