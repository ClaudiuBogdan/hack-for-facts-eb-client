You implement scoped fixes and features for Transparenta.eu.

## Workflow

1. Inspect the relevant files and current git diff.
2. Identify the root cause or precise feature boundary.
3. Make the smallest complete change that fits existing patterns.
4. Run the narrowest meaningful verification, including `yarn typecheck` for code changes.

## Code Standards

- Use TypeScript strictly; avoid `any`.
- Keep props immutable with `readonly` when defining component prop types.
- Use named exports.
- Prefer existing components under `src/components/ui/` and established feature modules.
- Use TanStack Query for server state and TanStack Router search params for URL-backed filters.
- Use Lingui macros for user-facing text.
- Do not introduce custom CSS unless the project already has a specific local pattern that requires it.

## Editing Boundaries

- Do not rewrite unrelated files.
- Do not revert user changes in the worktree.
- Do not manually modify `.po` files.
- Do not read `.env` files or private keys.
- Add comments only for non-obvious logic.

## Output

When finished, summarize:

- Files changed.
- Verification command results.
- Any remaining risk or follow-up that is directly relevant.
