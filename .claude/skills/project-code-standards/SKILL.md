# Project Code Standards

📐 **project-code-standards** | Rigorous coding principles for this codebase

Every agent that reads this skill MUST follow these principles when writing or refactoring code in this project. No exceptions.

---

## Code Style

### Function Size
- **4–20 lines per function.** If a function exceeds 20 lines, split it.
- One thing per function. One responsibility per module (SRP).

### File Size
- **Under 500 lines per file.** Split by responsibility.
- Prefer small focused modules over god files.

### Naming
- Names must be **specific and unique**.
- Avoid generic names: `data`, `handler`, `Manager`, `utils`, `helpers`.
- Prefer names that return **<5 grep hits** in the codebase.
- Example: prefer `calcBreakevenPrice` over `getPrice`.

### Types
- **Explicit types only.** No `any`, no `Dict`, no untyped functions.
- Return types on all public functions.
- Interface names: noun or adjective + noun (`FloatingPnL`, `CandleUpdate`).

### Duplication
- **No code duplication.** Extract shared logic into a function/module immediately.
- Rule of three: if you see the same shape three times, extract it.

### Control Flow
- **Early returns over nested ifs.**
- **Maximum 2 levels of indentation** per function.
- Use guard clauses at the top.

### Error Messages
- Exception messages must include the **offending value** and the **expected shape**.
- Bad: `"Invalid price"`
- Good: `"Invalid price: received NaN, expected positive number"`

---

## Comments

### Keep Intent
- **Keep your own comments.** Don't strip them on refactor — they carry intent and provenance.
- If you move code, move the comment with it.

### Write WHY, Not WHAT
- Skip `// increment counter` above `i++`.
- Explain why a non-obvious choice was made.
- Example:
  ```ts
  // Lightweight-charts requires Time as a branded type cast.
  // See: https://github.com/tradingview/lightweight-charts/issues/1234
  time: c.time as Time,
  ```

### Docstrings
- Public functions get a docstring: **intent + one usage example**.
  ```ts
  /**
   * Calculates breakeven price including the taker fee round-trip.
   * @example
   * calcBreakevenPrice({ side: "long", entry: 50000, feePct: 0.0006 })
   * // => 50030
   */
  ```

### Provenance
- Reference issue numbers / commit SHAs when a line exists because of a specific bug or upstream constraint.
  ```ts
  // Workaround for Safari iOS private mode throwing on localStorage.
  // See: commit a29730f, issue #42
  ```

---

## Tests

### Run Command
- Tests run with a single command: `npm test`.

### Coverage Rule
- **Every new function gets a test.**
- **Every bug fix gets a regression test.**

### Mocking
- Mock external I/O (API, DB, filesystem) with **named fake classes**, not inline stubs.
- Bad: `jest.mock("fs", () => ({ readFile: jest.fn() }))`
- Good: `class FakeFilesystem implements Filesystem { ... }`

### F.I.R.S.T
- **Fast** — run in <100ms per test file.
- **Independent** — no shared mutable state between tests.
- **Repeatable** — same result every run, any environment.
- **Self-validating** — boolean pass/fail, no manual inspection.
- **Timely** — written before or with the code, never after.

---

## Dependencies

### Injection
- Inject dependencies through **constructor/parameter**, not global/import.
- If a function needs `fetch`, accept `fetch` as an argument.

### Wrapping Third-Party
- Wrap third-party libraries behind a **thin interface owned by this project**.
- Example: `createSimulationChart(container, options)` wraps `createChart` from lightweight-charts.
- This isolates breaking changes and makes testing possible without the real lib.

---

## Structure

### Framework Convention
- Follow the framework's convention (Next.js: `app/`, `components/`, `hooks/`, `lib/`, `store/`).

### Predictable Paths
- `src/lib/chart/` — chart-specific pure functions
- `src/hooks/chart/` — chart-specific React hooks
- `src/components/trading/` — trading UI components
- One module per file. One responsibility per folder.

---

## Formatting

- Use the language default formatter: **Prettier** for TypeScript/TSX.
- Do not discuss style in code review. Let the formatter decide.
- Run `npx prettier --write` before committing.

---

## Logging

### Structured JSON
- When logging for debugging / observability, use **structured JSON**.
  ```ts
  console.log(JSON.stringify({ event: "candle_update", idx: 42, price: 50000 }));
  ```

### Plain Text
- Use plain text **only** for user-facing CLI output.

---

## Checklist Before Commit

- [ ] No function >20 lines
- [ ] No file >500 lines
- [ ] No `any` or untyped exports
- [ ] Early returns used, max 2 indent levels
- [ ] Tests pass: `npm test`
- [ ] New functions have tests
- [ ] Bug fixes have regression tests
- [ ] Prettier formatted
- [ ] Comments explain WHY, not WHAT
- [ ] Docstrings on public functions
