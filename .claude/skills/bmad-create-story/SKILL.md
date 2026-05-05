# Create Story

📄 **bmad-create-story** | Create Individual Story File

Generate a complete story file from epic for implementation.

## Usage

```
bmad-create-story [story-id]
```

## How It Works

1. Read epic and existing story references
2. Generate story file in `stories/` with:
   - Title and description
   - Acceptance criteria (definition of done)
   - Technical notes from architecture
   - Test cases
   - Dependencies
3. Update sprint-status.yaml

## Output

`stories/{story-id}.md`
