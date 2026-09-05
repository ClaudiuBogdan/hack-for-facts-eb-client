# Transparenta.eu Client

The web app over the Romanian public-money platform — investigative surfaces for
journalists, public-sector staff, and citizens. `AGENTS.md` is the canonical
instruction file; `CLAUDE.md` and `GEMINI.md` are symlinks to it.

Sibling repos — keep the data shape consistent across all three:

- **server** — the API this app consumes (GraphQL + REST + MCP).
  `~/projects/devostack/hack-for-facts-eb-server`
- **scrapper** — extraction, raw DBs, the production DB.
  `~/projects/devostack/hack-for-facts-eb-scrapper` (dataset semantics, join rules,
  and per-source status live there, in `prod-db/TRACKER.md` and `prod-db/*_NOTES.md`)

## Architecture — this is a TanStack Start app, not a Vite SPA

It server-renders. Getting this wrong is the most common and most expensive
mistake here, because client-only patterns appear to work in dev and break in
production:

- `src/start.ts` + `src/client.tsx` are the entrypoints; `src/server/handlers/`
  holds server-side handlers. Nitro builds the server output.
- Routing is **file-based TanStack Router** under `src/routes/` — `routeTree.gen.ts`
  is generated, never hand-edited (`yarn router:generate`).
- Server state is TanStack Query, hydrated through `@tanstack/react-router-ssr-query`.
  Anything that touches `window`/`document` at module scope or during first render
  must be guarded or deferred.
- URL state (filters, periods, scopes) lives in **router search params** — that's
  the app's shareable-state contract, not component state.

## How work is organised

- `src/features/<feature>/` is the unit of work — ~24 of them (procurement,
  parliament, elections, justice, legal, pnrr, private-companies,
  public-enterprises, public-investments, statistics, entities, entity-search,
  campaigns, notifications, learning, …), each with its own `api/`, `hooks/`,
  `components/`, and where relevant `mocks/`.
- `src/components/` holds cross-feature UI: `ui/` (shadcn), `filters/`, `charts/`,
  `maps/`, `tables/`, `sidebar/`.
- `src/lib/` holds the API clients, shared hooks, logging, error handling; `src/schemas/`
  the Zod schemas; `src/locales/{en,ro}/` the Lingui catalogs.

Design work starts from [`DESIGN.md`](DESIGN.md) — the design system: tokens,
principles, component specs, reference patterns, do's and don'ts, the data-trust and
mock-first contracts, and a decision log. See the `ui-and-design-system` skill.

## Mock-first UI development (active)

Parts of the roadmap depend on datasets that are still landing in the scrapper.
Where the API isn't ready, build against **mock data shaped like the real source**
so that connecting the API later is an adapter swap in the feature's `api/` layer,
not a UI rewrite. This is live, not aspirational: mock mode is wired in ~33 files
and 10+ features carry `mocks/`.

- Registry: [`src/lib/scraper-references/`](src/lib/scraper-references/) —
  `getScraperDatasetById`, `isMockDataEnabled`. Register a dataset in `catalog.ts`
  before building its surface.
- Add Zod schemas under `src/schemas/`, mocks under
  `src/features/<feature>/mocks/`, and write the user stories/specs before
  polishing visuals.
- `docs/mock-first-ui-development.md` and `docs/scraper-data-catalog.md` carry the
  workflow and the dataset index — both are **gitignored/local-only**, so create
  them when they're missing rather than assuming they're gone. Set
  `VITE_SCRAPPER_REPO_ROOT` if the scrapper isn't a sibling checkout.
- `DESIGN.md` §Mock-First Contract governs how mocked data must be labelled in the
  UI. Never present mock or partial data as if it were served truth — the
  data-trust rules in `DESIGN.md` §Data Trust & Provenance are a product
  requirement, not decoration.

## Conventions

- **Functional components with hooks only**, named exports, no `any`, `readonly`
  props. Prefer pure functions and the RO-RO pattern (accept an object, return an
  object); compose rather than nest.
- Files kebab-case · components PascalCase · variables/functions camelCase ·
  constants UPPER_CASE · directories kebab-case.
- **shadcn first** — check `src/components/ui/` before building a component.
  Tailwind utilities only, no custom CSS. Mobile-first. Accessibility comes from
  semantic HTML + the Radix primitives underneath shadcn.
- React 19's compiler handles most memoisation — reach for `React.memo` rarely,
  minimise `useEffect`/`useState`, and lazy-load heavy components.
- **All user-facing text is translated** with Lingui macros (`` t`…` ``,
  `<Trans>`). Never hand-edit `messages.po`; run the extract/compile cycle
  (`verify-and-ship` skill).
- Check analytics consent before firing PostHog events; errors go through
  `ErrorContext` / `AppError` and Sentry, not bare `console`.
- Charts with mixed units follow the multi-axis standards in
  [`.continue/rules/multi-axis-chart-standards.md`](.continue/rules/multi-axis-chart-standards.md).

## Working agreements

- **Always finish with `yarn check`** (typecheck via `tsgo` + ESLint at
  `--max-warnings=0`). It is also the pre-commit hook, so a red build blocks the
  commit either way.
- Testing is **manual-first for UI judgement**, but the automated suite is real and
  expected to stay green: Vitest unit tests, Playwright `integration` (mocked API)
  and `e2e` (`E2E_MODE=live` vs `replay` snapshots), CI on `main` and `dev`, plus a
  nightly run. Details in the `verify-and-ship` skill.
- Work lands on the **`dev` branch**. Commit messages follow conventional commits
  (`feat(procurement): …`) by convention — there's no commitlint here to catch you.
- No AI-attribution trailers in commit messages.

## Where to look

| Question | Doc |
|---|---|
| What should this look like? Tokens, components, patterns | [`DESIGN.md`](DESIGN.md) |
| Prototype competing designs locally, then promote the winner | [`docs/design/prototyping.md`](docs/design/prototyping.md) (`/development/*`, `yarn dev` only) |
| Mock-first workflow and the dataset index | `docs/mock-first-ui-development.md` · `docs/scraper-data-catalog.md` (local-only) |
| E2E strategy, reliability, flake triage | [`docs/e2e-testing-spec.md`](docs/e2e-testing-spec.md) · [`docs/e2e-reliability-guide.md`](docs/e2e-reliability-guide.md) |
| Chart schemas and data validation | [`docs/chart-schema-guide.md`](docs/chart-schema-guide.md) · [`docs/chart-data-validation-spec.md`](docs/chart-data-validation-spec.md) |
| Normalization semantics (per-capita, %GDP, EUR) | [`docs/normalization-client-spec.md`](docs/normalization-client-spec.md) |
| What a dataset means / where it came from | scrapper `prod-db/TRACKER.md` + `prod-db/<SOURCE>_NOTES.md` |
| What the API exposes | server `AGENTS.md` + `docs/server-redesign/` |
