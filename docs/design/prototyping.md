# Prototyping variants at `/development/*`

The surface for trying several designs of one page or component inside the real
app shell, comparing them, and promoting the winner. It exists only under
`yarn dev`. Every production build — the deployed `dev` environment included —
answers 404 on `/development/*`, ships none of `src/development/`, and is checked
for that on every CI build and every image build.

## What holds

- `src/routes/development.tsx` throws `notFound()` unless `import.meta.env.DEV`,
  which is true only for a Vite process that is not building for production.
  Anyone who can reach your dev server can reach the surface — including over
  Tailscale. It is not machine-exclusive, and does not try to be.
- The gate is deliberately **not** `VITE_APP_ENVIRONMENT`. The deployed `dev`
  environment sets that to `development` while being a production build, so an
  env gate would expose the surface there. Verified: serving the production build
  with `VITE_APP_ENVIRONMENT=development` still answers 404.
- `src/development/` is in `.dockerignore`, so images never contain it and
  Tailwind never scans it there. Full-checkout builds (CI, Playwright, a local
  `yarn build`) do scan it for utilities — which is why the arbitrary-value rule
  below exists.
- `yarn build:validate` fails if a marker, a `src/development/` path, or a file
  named after a prototype or the harness reaches `.output/`.
- Committing prototypes is expected. `yarn run check` covers them.

## Run it

```bash
yarn dev --mode <your-machine-mode>          # loads .env.<mode>.local
```

Over Tailscale, bind the port `tailscale serve` proxies to, and make it strict:

```bash
yarn dev --mode <your-machine-mode> --port 3000 --strictPort
```

Without `--strictPort`, Vite sees the tailnet listener occupying port 3000 on a
wildcard address, silently falls back to 3001, and the tailnet URL 502s. With it,
Vite binds `127.0.0.1:3000` — which is what `tailscale serve` forwards to — and
the surface is reachable at your tailnet hostname.

## Add a prototype (one file)

1. Copy `src/development/prototypes/_example/hello.prototype.tsx` to
   `src/development/prototypes/<domain>/<name>.prototype.tsx`. `<domain>` is the
   feature or domain the work targets.
2. Define variants as zero-prop components that own their data — fixtures from
   the feature's `mocks/`, or the feature's real hooks (the real QueryClient is
   in the shell).

   ```tsx
   import type { PrototypeDefinition } from '@/development/harness/entry'

   export const prototype = {
     title: 'Procurement hub header',
     spec: 'docs/design/procurement/features/phase-a-spine.md',
     variants: {
       dense: { title: 'One line, counts as chips', component: HubHeaderDense },
       airy: { title: 'Two rows, counts as a stat band', component: HubHeaderAiry },
     },
     compare: ['dense', 'airy'],
   } satisfies PrototypeDefinition
   ```

3. Open `/development/<domain>/<name>`. No registry, no route file, no
   `yarn router:generate`, no `yarn i18n:extract`.

### Rules

- Variant keys match `^[a-z][a-z0-9-]*$` and are never `true`, `false` or `null`.
  The router JSON-parses search values, so those three arrive as non-strings.
- Iterate in sibling files (`<name>.dense.tsx`): the `.prototype.tsx` file
  full-reloads on edit, sibling components hot-swap.
- shadcn primitives, Tailwind utilities, `t`/`<Trans>` with Romanian source
  strings. Prototypes are excluded from catalog extraction, so new strings render
  as their source text and `messages.po` stays out of prototype commits.
- **No arbitrary-value utility carrying text or a URL** (`content-[…]`,
  `bg-[url(…)]`). Full-checkout CSS is generated from prototype source and would
  carry the literal. This one is not machine-checked.
- Components bound to a route (`Route.useSearch()`, `useNavigate({ from })`)
  cannot render here. Prototype the presentational component, or write a small
  adapter inside the prototype.
- Nothing outside `src/development/` may import from it. ESLint enforces it; the
  Docker build fails on it later anyway.

## URLs

| URL | Shows |
|---|---|
| `/development` | Index of prototypes on disk, by domain; broken ones with their error |
| `/development/<domain>/<name>` | Default comparison (`compare`, else every variant) |
| `?v=dense` | One variant, full width — the link to share and to open in devtools device mode |
| `?v=dense,airy` | Ordered comparison; unknown keys are dropped and listed in a notice |
| `&layout=stack` | Stacked instead of side by side |
| `&currency=…&inflation_adjusted=…` | Global params pass through |
| anything else | Yours; read it with `useSearch({ strict: false })` |

`v` and `layout` are reserved. An unknown prototype id renders the list of ids
that do exist, rather than a 404: a throw from inside the harness cannot set a
status — React reports *"Switched to client rendering because the server
rendering errored"* and the response stays 200 — and on a local-only surface the
useful answer to a typo is the list of real ids.

## Server rendering — what the browser cannot tell you

Prototypes server-render like real pages. A server-side error in a variant is
recovered by React on the client, so **a working browser view proves nothing**.
Check SSR with curl and watch the dev-server terminal:

```bash
curl -s 'http://127.0.0.1:3000/development/<domain>/<name>?v=<key>' | grep '<text you expect>'
```

A module-scope `window` access in any variant file breaks the whole prototype;
the index shows it as broken, with the error.

## Promote the winner

1. Decide. Curl for SSR. Check the single-variant link at mobile widths.
2. Record it in the feature's design doc
   (`docs/design/<domain>/features/<slug>.md`, or `design.md`): date, chosen
   variant and its deep link, each rejected variant and why. Add a `DESIGN.md`
   decision-log entry only if a cross-cutting rule changed.
3. Move the code into `src/features/<feature>/components/` and wire it as pages
   are wired: thin route + `.lazy.tsx`, feature `api/` and hooks, Lingui,
   `yarn i18n:extract`, tests, `yarn run check`. On the destination route: curl
   for SSR, switch locale, navigate. "Moves as-is" holds only for presentational
   components — the shell is real here, but the route context is not.
4. `git rm` the prototype and its sibling files in the same commit, losers
   included. Commit shape:
   `feat(<scope>): <thing> (promoted from prototype <domain>/<name>, variant <key>)`.

Partial promotion: promote the decided part, and rename the remainder so its id
says what is still open. Stale prototypes are deleted by whoever next touches the
domain.

## When you touch the routes, harness, `.dockerignore`, the validator or CI

```bash
yarn router:generate            # only if you added or renamed a route file
yarn run check
yarn build && yarn build:validate
PORT=3000 VITE_API_URL=… yarn start
curl -sI http://127.0.0.1:3000/development        # expect 404
yarn test:integration -g development
```

After deploy: `curl -sI https://dev-chronos.transparenta.eu/development` → 404.

## Non-goals

No knobs panel, no viewport emulation, no screenshots or visual diffing, no
per-prototype docs pages, no status lifecycle, no sidebar entry, no access in
deployed environments, no network exclusivity for the dev server.
