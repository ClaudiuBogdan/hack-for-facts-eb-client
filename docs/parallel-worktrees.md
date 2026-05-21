# Parallel Worktrees

Last updated: 2026-05-21

Use this workflow when several mock-first dataset surfaces need to progress in
parallel without stepping on each other.

Foundation branch: **`feat/new-datasets`**

Related:

- [`AGENTS.md`](../AGENTS.md) — mock-first UI scope
- [`.cursor/worktrees.json`](../.cursor/worktrees.json) — Cursor Agents Window setup
- [`scripts/create-worktree.sh`](../scripts/create-worktree.sh) — manual/Codex/OpenCode setup

## Quick start

From the main checkout on `feat/new-datasets`:

```bash
yarn worktree:create political feat/new-datasets-political
yarn worktree:create private-companies feat/new-datasets-private-companies
yarn worktree:create soe feat/new-datasets-soe
yarn worktree:create ngo feat/new-datasets-ngo
yarn worktree:create procurement feat/new-datasets-procurement
```

Each command creates:

```text
~/.codex/worktrees/<slug>/hack-for-facts-eb-client
```

and bootstraps `.env`, optional `.env.local`, HTTPS certs, and `yarn install`.

## Tool-specific notes

### Cursor Agents Window

Cursor reads [`.cursor/worktrees.json`](../.cursor/worktrees.json) when it
creates a worktree and runs [`.cursor/setup-worktree-unix.sh`](../.cursor/setup-worktree-unix.sh).

Cursor provides **`ROOT_WORKTREE_PATH`** pointing at the main checkout so secrets
can be copied into the isolated worktree.

Debug setup failures in the editor: **Output → Worktrees Setup**.

Open the **repository root** in Cursor when using parallel agents. Opening a
child folder can break Apply paths.

Editor-window skills: `/worktree`, `/apply-worktree`, `/delete-worktree`,
`/best-of-n`.

### Codex

Prefer the same layout as the creation script:

```text
~/.codex/worktrees/<slug>/hack-for-facts-eb-client
```

Open that folder as the workspace root for the session.

### OpenCode

OpenCode has no built-in worktree manager. Always pass the worktree path:

```bash
~/.opencode/bin/opencode run \
  --dir ~/.codex/worktrees/political/hack-for-facts-eb-client \
  "<prompt>"
```

## Recommended lane split

| Slug | Branch | Focus |
| --- | --- | --- |
| `political` | `feat/new-datasets-political` | political map / mandates mock UI |
| `private-companies` | `feat/new-datasets-private-companies` | ONRC/ANAF company profile mock UI |
| `soe` | `feat/new-datasets-soe` | SOE profile mock UI |
| `ngo` | `feat/new-datasets-ngo` | NGO profile mock UI |
| `procurement` | `feat/new-datasets-procurement` | SEAP/contracts mock UI |

One dataset domain per worktree. Do not share a worktree across unrelated features.

## Bootstrap behavior

Shared script: [`scripts/bootstrap-worktree.sh`](../scripts/bootstrap-worktree.sh)

Copies from the main checkout when present:

- `.env`
- `.env.local`
- `.env.*.local`
- `localhost-key.pem`
- `localhost-cert.pem`

Then runs `yarn install --frozen-lockfile`, falling back to `yarn install`.

Do not symlink `node_modules` into worktrees.

If the scrapper repo is not a sibling checkout, set `VITE_SCRAPPER_REPO_ROOT` in
the worktree `.env`.

## Environment overrides

| Variable | Default | Purpose |
| --- | --- | --- |
| `WORKTREE_BASE_BRANCH` | `feat/new-datasets` | Branch new worktrees start from |
| `CODEX_WORKTREES_ROOT` | `~/.codex/worktrees` | Parent directory for slug folders |
| `ROOT_WORKTREE_PATH` | main checkout | Source for env/cert copy during bootstrap |
| `OPENCODE_BIN` | `~/.opencode/bin/opencode` | Printed OpenCode command path |

## Cleanup

List worktrees:

```bash
git worktree list
```

Remove one:

```bash
git worktree remove ~/.codex/worktrees/political/hack-for-facts-eb-client
git worktree prune
```

Cursor may also auto-clean older worktrees via machine settings such as
`cursor.worktreeMaxCount` and `cursor.worktreeCleanupIntervalHours`.

## Verification checklist

- [ ] `git worktree list` shows the path and branch
- [ ] `.env` exists in the worktree
- [ ] `yarn typecheck` passes
- [ ] `yarn dev` starts when needed
- [ ] HTTPS dev works if certs were copied

## Existing worktrees

The older embed checkout at `hack-for-facts-eb-client-embed-worktree` on
`feat/embed-worktree` is separate. Do not remove it unless that lane is finished.
