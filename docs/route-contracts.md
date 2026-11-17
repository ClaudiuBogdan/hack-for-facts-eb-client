# Route contracts: thin route definitions

Status: **in progress** (started 2026-11-17). Measurements and progress log at the end.

## Why

TanStack Router needs the whole route tree before the first render. It matches URLs, validates search params and
starts loaders from it. So the eager part of every route file is in the entry chunk, and it is evaluated on every
page, whichever page was asked for. Components are already split out (`*.lazy.tsx` and Start's automatic
splitting), and most loaders already load their work with `await import(...)`.

What remains is what the eager route files import. Many schema modules mix two things:

- **the URL contract** (search and params parsing), which the router needs at once;
- **data schemas** (API response shapes), which are needed only once data arrives.

A route that imports one search parser from such a module brings every data schema in it into the entry chunk,
and Zod builds them all at module scope on every page. On the landing, the entry chunk's module evaluation is the
largest blocking task: about 100 ms unthrottled, about 400 ms on Lighthouse's mobile profile, with Zod schema
construction about half of it ([landing note](performance/2026-11-17-landing/README.md), issue 1).

## The rules

1. **A route file's eager part is declarative.** It holds `params` parsing, `validateSearch`, `loaderDeps`,
   `beforeLoad`, `head`, `ssr` options and a loader that imports its work dynamically. Nothing runs when the
   module is evaluated: no schema construction, no `t`/`i18n._` (REV-29), no `Intl` objects, no computed
   constants beyond literals.
2. **The URL contract lives in contract modules.** One per route family, named `*-search.ts` or
   `*-route-contract.ts`. A contract module exports search and params validators and their types, and it imports
   nothing heavier than `zod` and other contract modules.
3. **Contract schemas are built on first use.** They go through `lazySchema` (`src/lib/route-contract.ts`): the
   schema is built the first time a route of the family is matched, then cached. Types are still inferred, so typed
   links and `useSearch` are unchanged.
4. **Data schemas stay out of the route tree.** They are imported only from `api/` code, from loaders through
   `await import(...)`, and from lazy components.
5. **The URL behaviour does not change.** Same params, same defaults, same rejections and same redirects. Each
   migration keeps or adds a test that the family's validators accept and reject what they did before.

## Guardrails

- **The start-up graph test** (`src/routes/-route-tree-weight.test.ts`). It walks the modules the browser loads
  before the first render: from `src/client.tsx`, `src/start.ts`, `src/router.tsx`, the generated route tree and
  every eager route file. It follows what the bundler keeps: value, side-effect and namespace imports,
  `export … from` and `export *`, `require()`, and the matches of eager `import.meta.glob`. It skips what the
  bundler drops or defers: type-only imports and re-exports, `import()`, lazy globs, and `?url`/`?raw` and
  asset imports. It resolves the `@/` alias, root-relative `/src/…`, relative, extensionless, `/index` and
  `.js`-for-`.ts` paths, and it fails rather than skips when it meets a local import it cannot resolve, or a
  compiled format it cannot read (MDX). For each migrated family it fails if the family's data schemas, API
  adapters or mocks are reachable, and it prints the import chain that reached them.
- **Lint** (`eslint.config.js`, `ROUTE_CONTRACT_MODULES`). In a migrated family's contract module, no call runs
  outside a function except `lazySchema(...)`: not in an initializer, a wrapper (`as`, `satisfies`), an object
  or array literal, or a bare statement. It is a guard against the ordinary mistakes, not a proof: a getter read
  at module scope would pass it. Contract modules hold only `as const` lists, builder functions and
  `lazySchema` calls, which keeps them easy to read for that.
- Both are scoped to migrated families, so they are errors from the first family on. When every family is
  migrated, both widen to all route files and all contract modules.

## Ruled out

- **Splitting loaders into their own chunks** (TanStack `codeSplittingOptions`). Loaders already import their
  work lazily, so little is gained, and every client-side navigation would wait for one more chunk before its
  loader starts: the dead-click problem fixed in October 2026.
- **Restructuring the route tree** into lazily loaded domains. TanStack's file routing does not support it.
- **Moving every schema to `zod/mini` now.** Classic Zod attaches about 40 methods to every schema instance at
  construction, which `mini` does not. Revisit, measured, once construction is lazy.

## Migration order

1. Measure. Find the entry chunk's composition by source module, and time each module's evaluation, so that
   families are ranked by what they cost.
2. Pilot one family, with the helper and the guardrails, measure it, and get a review (Codex `gpt-6-astra`
   xhigh, the owner's request).
3. Migrate the rest family by family, one commit each, in the measured order.
4. Widen the guardrails to every route file and contract module.

## Migrating a family

1. Move the family's search and params schemas into its contract module, each as `lazySchema(() => …)`, with
   types from `LazyOutput`. Values the data schemas share (enum values, field shapes) move as plain `as const`
   lists or builder functions, and the data module builds its own schemas from them.
2. Re-export the contract from the data module, so existing imports and tests keep working.
3. Point the route files at the contract module. Any value import of the family's API or data modules in a
   route file moves into the loader as `await import(...)`.
4. Add the family to `KEPT_OUT` in `-route-tree-weight.test.ts` and its contract module to
   `ROUTE_CONTRACT_MODULES` in `eslint.config.js`.
5. Prove parity. The old and new schemas must give identical `safeParse` and `~standard.validate` results over a
   battery of inputs (a temporary test against the previous version of the file), and the existing tests must
   pass unchanged. Check in the browser that every route of the family still parses, drops and redirects as before.
6. Measure, and record the result below.

## Measurements

Start-up graph: the entry chunk plus every chunk it imports statically, from a local production build
(`build-local.sh`). Evaluation: each start-up source module imported alone in Vitest, after a warm-up pass, mean
of three passes. These are not browser numbers, but they rank modules consistently.

| Step | Start-up chunks | Start-up JS | Start-up module evaluation | Family's share |
|---|---|---|---|---|
| Before (79ea80f4) | 185 | 1,872 KB | 183 ms | legislation 17.8 ms (first) |
| Legislation migrated | 181 | 1,846 KB | 159 ms | legislation 0.8 ms |

Families by start-up evaluation before the migration (ms, the same harness): legislation 17.5, the statistics
hub hooks 13.5, campaigns 12.9, certificates 10.3, advanced map analytics 10.0, companies 8.6, the primărie
routes 8.4, entities 8.4, procurement 7.1, challenges 5.9, public investments 5.2. Shared `components/` (20.3)
and `lib/` (11.1) are not route families: they are looked at last.

## Progress log

- **2026-11-17.** Plan written and measured. Pilot: **legislation**. Its five search schemas moved to
  `schemas/legal-search.ts` as lazy schemas, and the act route's loader imports its API on demand. `legal.ts`,
  the legal API adapters and their mock fixtures left the start-up graph, and `elections.ts` went with them
  (−4 chunks, −26 KB). Parity was proven over about 1,200 inputs per schema, the existing tests pass unchanged,
  and typed links stay strict. Helper `src/lib/route-contract.ts`, guardrails as above. Reviewed by Codex
  `gpt-6-astra` xhigh twice: no application regression; its guardrail findings were fixed, except a getter read
  at module scope (lint) and class instance fields (a lint false positive), which contract modules do not use.
