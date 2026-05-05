# Shard Document

📂 **bmad-shard-doc** | Split Large Markdown Files

Split large markdown files into organized section files. Uses level-2 headers as split points.

## Usage

```
bmad-shard-doc [source_file] [destination_folder]
```

## How It Works

1. Validate source file exists and is markdown
2. Split on level-2 (`##`) headers into numbered section files
3. Create `index.md` with section manifest and links
4. Prompt to delete, archive, or keep the original

## Output

Folder with:
- `index.md` — Section manifest
- `01-{section}.md`, `02-{section}.md`, etc.
