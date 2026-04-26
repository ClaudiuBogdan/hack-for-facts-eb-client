# OpenCode Configuration

> Configuration for [OpenCode](https://opencode.ai) AI coding assistant.
> Official docs: https://opencode.ai/docs

## Directory Structure

```
.opencode/
├── agents/                # Standalone markdown agents (auto-loaded)
│   └── devops.md          # CI/CD and deployment expert
├── commands/              # Slash command prompts
│   ├── build.md
│   ├── i18n.md
│   ├── lint.md
│   ├── plan.md
│   ├── review.md
│   ├── test.md
│   └── typecheck.md
├── plugins/               # Plugins for extending OpenCode
│   └── env-protection.js  # Blocks access to local secrets
├── prompts/               # Prompt files referenced by opencode.jsonc
│   ├── build.md          # Build agent prompt
│   ├── plan.md           # Planning agent prompt
│   ├── architect.md      # Architecture agent prompt
│   ├── reviewer.md       # Code review agent prompt
│   ├── implement.md      # Implementation agent prompt
│   ├── qa.md             # Verification agent prompt
│   └── i18n.md           # Lingui/i18n agent prompt
├── AGENTS.md              # Project context for all agents
└── README.md              # This file
```

The active project config is `opencode.jsonc` in the repository root. Current OpenCode loads project config from the repo root and auto-loads `.opencode/agents`, `.opencode/commands`, and `.opencode/plugins`.

## Quick Start

| Task            | How                                  |
| --------------- | ------------------------------------ |
| Switch agents   | Press `Tab`                          |
| Run command     | Type `/test`, `/build`, `/i18n`, etc.|
| Invoke subagent | Type `@devops help with deployment`  |

Press `Tab` to cycle through agents with different reasoning modes:

```
build → implement → plan → architect → review
```

## Agents

### Primary Agents (Tab to switch)

| Agent       | Description                         |
| ----------- | ----------------------------------- |
| `build`     | Default development agent           |
| `implement` | Scoped fixes and features           |
| `plan`      | Read-only planning                  |
| `architect` | Architecture and design             |
| `review`    | Review, security, a11y, regressions |

### Subagents (@mention to invoke)

| Agent      | Description                          |
| ---------- | ------------------------------------ |
| `@qa`     | Verification and regression triage |
| `@i18n`   | Lingui and locale checks |
| `@devops` | CI/CD, Docker, deployment |

> Docs: https://opencode.ai/docs/agents

## Custom Commands

| Command      | Description                    |
| ------------ | ------------------------------ |
| `/test`      | Run all tests                  |
| `/typecheck` | Run TypeScript type checking   |
| `/lint`      | Run ESLint                     |
| `/build`     | Run app production build       |
| `/i18n`      | Check Lingui state             |
| `/review`    | Review recent code changes     |
| `/plan`      | Produce an implementation plan |

> Docs: https://opencode.ai/docs/commands

## Permissions

Three permission levels: `"allow"` | `"ask"` | `"deny"`

### Bash Permissions (glob patterns)

```jsonc
"permission": {
  "bash": {
    "yarn *": "allow",           // Package manager
    "git status": "allow",       // Read git state
    "git diff*": "allow",        // View changes
    "git push*": "ask",          // Require confirmation
    "rm *": "ask",               // Destructive operations
    "cat .env*": "deny",         // Block secrets
    "*": "ask"                   // Default for unmatched
  }
}
```

> Docs: https://opencode.ai/docs/permissions

## Files Reference

| File                       | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `../opencode.jsonc`        | Main config (agents, permissions) |
| `AGENTS.md`                | Project context loaded for all agents               |
| `prompts/*.md`             | System prompts referenced by agents in config       |
| `agents/*.md`              | Standalone agent definitions (auto-loaded)          |
| `commands/*.md`            | Slash command definitions (auto-loaded)             |
| `plugins/env-protection.js`| Security plugin to block local secret reads         |

## Security

### .env File Protection

The `plugins/env-protection.js` plugin prevents OpenCode from reading `.env` files:

- Blocks `read` tool from accessing any file with `.env` in the path
- Blocks bash commands like `cat .env`, `head .env`, etc.
- Throws descriptive error directing to `.env.example` instead

> Docs: https://opencode.ai/docs/plugins/#env-protection

---

**Official Documentation:** https://opencode.ai/docs
