# Party Mode

🎉 **bmad-party-mode** | Multi-Agent Group Discussion

Orchestrate multi-agent group discussions. Load all installed BMad agents and facilitate a natural conversation where each agent contributes from their unique expertise and personality.

## How It Works

1. **Load the agent roster** — Read `_bmad/config.toml` and `_bmad/custom/config.toml` to discover all available agents
2. **Analyze the topic** — Determine which 2–4 agents are most relevant to the discussion
3. **Activate agents** — Load each selected agent's persona, principles, and communication style
4. **Facilitate discussion** — Agents take turns contributing, with natural cross-talk and disagreements
5. **Rotate participation** — Ensure diverse perspectives over time
6. **Synthesize** — Summarize key points, agreements, and action items

## Usage

Invoke with a topic or question:

```
bmad-party-mode
```

Or with a specific topic:

```
bmad-party-mode "Should we refactor the trading store monolith?"
```

## Agent Selection

The Party Mode orchestrator selects agents based on the topic:

| Topic Keywords | Likely Agents |
|---------------|---------------|
| architecture, scalability, patterns | Winston (Architect), Amelia (Dev) |
| features, roadmap, priorities | John (PM), Sally (UX) |
| user experience, interface, design | Sally (UX), John (PM) |
| code quality, testing, bugs | Amelia (Dev), Winston (Architect) |
| research, market, competitors | Mary (Analyst), John (PM) |
| documentation, clarity, structure | Paige (TW), Winston (Architect) |

## Discussion Format

Each agent responds in character:
- Uses their assigned icon (📋, 🏗️, 💻, 🎨, 📊, 📚)
- References their principles and domain expertise
- May agree, disagree, or build on other agents' points
- Provides specific, actionable input

## Exit Commands

- `goodbye` — End discussion with summary
- `end party` — Same as goodbye
- `quit` — Exit immediately

## Example Session

**User:** "Our trading simulation has performance issues during fast-forward. What should we do?"

**Winston 🏗️:** "First, we need to profile. My guess is the chart re-renders on every tick. We discussed this in the architecture — the TradingChart should use `series.update()` not `setData()` for current candle updates."

**Amelia 💻:** "Agree with Winston on the chart. But I also see the price history array growing unbounded. We're storing every interpolated price point. We should cap it or use a circular buffer."

**Sally 🎨:** "From a UX perspective, users don't need per-tick precision during fast-forward. Could we lower the update frequency visually while keeping simulation accuracy?"

**John 📋:** "Good points all. Let's scope this: P0 = chart optimization (Amelia + Winston), P1 = history cap (Amelia), P2 = visual throttling research (Sally). Winston, can you update the architecture doc with the pattern?"

## Output

On exit, produces a summary document at:
`_bmad-output/party-mode-sessions/party-mode-{timestamp}.md`

Containing:
- Topic
- Agents present
- Key points raised
- Agreements reached
- Disagreements noted
- Action items with owners
