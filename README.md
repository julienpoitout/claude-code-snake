# claude-snake

Play **Snake in a separate terminal window** while Claude Code works on your prompt. When Claude finishes a turn, the game pauses automatically. On your next prompt, you can continue, start a new game, or opt out for the session.

## Requirements

- [Claude Code](https://code.claude.com/) with hooks support
- Node.js 18+

## Install

### As a plugin (recommended)

```bash
git clone https://github.com/YOUR_ORG/claude-snake.git
claude --plugin-dir /path/to/claude-snake
```

Or add the repo via the `/plugin` UI in Claude Code.

### Verify hooks

In Claude Code, run `/hooks` and confirm these events are registered:

- `SessionStart` (matcher: `startup|resume`)
- `UserPromptSubmit`
- `Stop`

## How it works

| When | What happens |
|------|----------------|
| You **submit a prompt** | A dialog asks to play Snake (or continue / new game if paused) |
| **Claude is working** | Snake runs in a separate terminal window |
| **Claude finishes** | `Stop` hook pauses the game and shows a PAUSED banner |
| **Next prompt** | Choose Continue, New game, or Don't play |
| **Resume session** with a paused save | `SessionStart` offers Continue / New / Don't play |

State is stored per session at:

`~/.claude/claude-snake/state/<session_id>.json`

## Controls (Snake window)

- Arrow keys or WASD — move
- `P` — manual pause/resume
- `R` — restart after game over
- `Ctrl+C` — quit daemon

## Development

```bash
npm test
```

Run the daemon manually:

```bash
node game/daemon.js --session test-session
```

## Limitations

- Snake runs in a **second window**, not inside the Claude Code transcript.
- Hooks cannot draw into Claude's terminal; a detached process is required.
- **Don't play** applies for the rest of the Claude session (per `session_id`).
- `UserPromptSubmit` runs before each prompt and may show a dialog unless you opted out.
- `SessionEnd` is not used for pause; **`Stop`** pauses when the agent finishes responding.

## License

MIT
