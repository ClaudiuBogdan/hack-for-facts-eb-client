# OpenCode Configuration

> Project-specific OpenCode context for Transparenta.eu.
> Official docs: https://opencode.ai/docs

## Directory Structure

```
.opencode/
├── plugins/
│   └── env-protection.js  # Blocks local secret reads
├── prompts/
│   ├── build.md           # Build agent prompt
│   └── plan.md            # Planning agent prompt
├── AGENTS.md              # Project context
└── README.md
```

The active project config is `opencode.jsonc` in the repository root. This project intentionally defines only the native `build` and `plan` agents.

Global user-level shortcuts and MCP-backed agents live in `~/.config/opencode`.

## Agents

| Agent   | Description               |
| ------- | ------------------------- |
| `build` | Default development agent |
| `plan`  | Read-only planning agent  |

## Files Reference

| File                        | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `../opencode.jsonc`         | Project config and permissions               |
| `AGENTS.md`                 | Project context loaded by OpenCode           |
| `prompts/build.md`          | Build agent prompt                           |
| `prompts/plan.md`           | Planning agent prompt                        |
| `plugins/env-protection.js` | Extra guard against reading local secret files |

## Security

The `plugins/env-protection.js` plugin blocks reads of `.env` files and private key files. Use `.env.example` for variable names.
