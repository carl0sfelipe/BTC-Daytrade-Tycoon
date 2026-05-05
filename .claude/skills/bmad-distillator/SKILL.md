# Distillator

🗜️ **bmad-distillator** | Lossless LLM-Optimized Compression

Compress documents for efficient LLM consumption while preserving all information. Verifiable through round-trip reconstruction.

## Usage

```
bmad-distillator [source_documents]
```

Options:
- `--downstream-consumer` — What consumes this (e.g., "PRD creation")
- `--token-budget` — Approximate target size
- `--validate` — Run round-trip reconstruction test

## How It Works

1. **Analyze** — Read source documents, identify information density and structure
2. **Compress** — Convert prose to dense bullet-point format, strip decorative formatting
3. **Verify** — Check completeness to ensure all original information is preserved
4. **Validate** (optional) — Round-trip reconstruction test proves lossless compression

## Output

Distillate markdown file(s) with compression ratio report (e.g., "3.2:1")
