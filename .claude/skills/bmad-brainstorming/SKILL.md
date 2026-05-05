# Brainstorming

💡 **bmad-brainstorming** | Interactive Brainstorming Session

Generate diverse ideas through interactive creative techniques. Loads proven ideation methods from a technique library and guides you toward 100+ ideas before organizing.

## How It Works

1. **Set up session** — Define topic and constraints
2. **Load techniques** — SCAMPER, reverse brainstorming, random word, etc.
3. **Generate ideas** — Guide through technique after technique
4. **Anti-bias protocol** — Shift creative domain every 10 ideas to prevent clustering
5. **Organize output** — Group, prioritize, and select top ideas

## Usage

```
bmad-brainstorming
```

Or with topic:

```
bmad-brainstorming "How do we make trading more engaging?"
```

## Techniques

| Technique | Purpose |
|-----------|---------|
| SCAMPER | Modify existing ideas systematically |
| Reverse Brainstorming | Find ways to cause the problem |
| Random Word | Inject unrelated concepts |
| What If | Challenge assumptions |
| Analogies | Borrow from other domains |
| Worst Idea | Start bad, invert to good |

## Output

`brainstorming-session-{date}.md` with:
- All generated ideas organized by technique
- Top 10 ideas with rationale
- Recommended next steps
