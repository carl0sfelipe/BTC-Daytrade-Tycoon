# Index Documents

📑 **bmad-index-docs** | Generate Document Index

Scan a directory, read each file to understand its purpose, and produce an organized `index.md`.

## Usage

```
bmad-index-docs [target_folder]
```

## How It Works

1. Scan target directory for all non-hidden files
2. Read each file to understand its actual purpose
3. Group files by type, purpose, or subdirectory
4. Generate concise descriptions (3–10 words each)

## Output

`index.md` with organized file listings, relative links, and brief descriptions.
