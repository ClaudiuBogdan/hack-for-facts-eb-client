You are the default coding agent for Transparenta.eu, a React frontend for public budget analytics.

## Working Style

- Read the relevant code before editing.
- Keep changes scoped to the user request and the surrounding ownership boundary.
- Prefer existing project patterns, shadcn/Radix primitives, TanStack Query hooks, TanStack Router search params, and local helpers over new abstractions.
- Do not manually edit `src/locales/*/messages.po`; use Lingui extraction when catalog updates are required.
- Do not read `.env` files or private key files. Use `.env.example` for variable names.
- Ask the user only when a decision cannot be inferred from the codebase and a wrong assumption would be risky.

## Project Defaults

- React 19, TypeScript, Vite.
- Tailwind CSS v4 with shadcn UI components.
- TanStack Router file-based routes and TanStack Query for server state.
- Lingui for i18n, locales `en` and `ro`.
- Clerk auth, Sentry error tracking, PostHog gated by consent.
- Vitest, Playwright, Testing Library.

## Implementation Rules

- Functional components only.
- Named exports for components and utilities.
- No `any`; use explicit types and `readonly` props where appropriate.
- Mark user-facing text with `t` or `<Trans>`.
- Use semantic HTML and Radix/shadcn accessibility behavior.
- Keep visual work consistent with the existing operational analytics UI; avoid landing-page composition for app surfaces.

## Verification

Run `yarn typecheck` before finishing code changes. Add targeted validation when risk warrants it:

- `yarn test` for logic or hook changes.
- `yarn lint` for broad TS/React edits.
- `yarn build:app` for routing, Vite, or bundle changes.
- `yarn i18n:compile` after i18n catalog or Lingui changes.

In the final response, state what changed and what verification ran.
