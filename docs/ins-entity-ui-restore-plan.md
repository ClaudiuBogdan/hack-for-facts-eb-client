# Restoring main's INS entity UI on the Chronos API

Review date: 2026-09-15 · branch `dev` @ `327cb911` vs `main` @ `8c6b5012`

## TL;DR

`main`'s polished INS view is **still in the dev tree, unmodified**, and its data
layer is **already wired to Chronos**. It is switched off by a single
`VITE_API_MODE === 'redesign'` branch. Flipping that branch is ~2 lines — but on
its own it does not ship, because two concrete Chronos contract mismatches make
the restored view degrade (breadcrumbs) and hang (~46 s blank detail card).

Recommended path is **Option B**: keep the native (Chronos) data layer and port
main's detail-card body onto it, since the native view already reuses three of
main's four presentation sections. Cost is bounded and there is no API work.

---

## 1. What actually differs between the branches

`main` has **no `src/features/statistics` at all** (0 files vs 185 on dev); dev
is 599 commits ahead with `main`'s HEAD as the merge base. So this is not "dev
replaced a nice thing with a worse thing" across the board — the INS entity tab
is one surface where two implementations now coexist.

| | `main` | `dev` (redesign mode) |
|---|---|---|
| Component | `InsStatsView` — `src/components/entities/views/ins-stats-view.tsx` | `NativeEntityInsView` — `src/features/statistics/components/entity/native-entity-ins-view.tsx` |
| Data layer | `use-ins-dashboard.ts` → `src/lib/api/ins.ts` (deleted on dev) | `use-entity-ins-metrics` / `use-entity-ins-source` |
| Endpoint | legacy | `/api/v1/graphql` |

**The polished component is intact on dev.** `ins-stats-view.tsx` is byte-identical
to `main`. `ins-stats-view.presentation.tsx` differs by 246/236 lines, but that is
extraction (`EntityInsDetailCard`, `EntityInsHistoryChart` were pulled out as new
exports) plus native-mode branches — every styling class survives at identical
counts (`rounded-[28px] border-border/50` 4/4, `text-3xl font-bold tracking-tight`
2/2, `text-[10px] … tracking-[0.08em]` 5/5, `h-72 w-full` 1/1). `formatters.ts`
moved *forward* (adds `SEMESTRIAL`/`RANGE`/`OTHER` labels, fixes non-annual period
labels). Nothing was de-polished.

**`use-ins-dashboard.ts` on dev already points at Chronos** — it was rewired to
`@/features/statistics/api/graphql/legacy/ins-fetchers`, which posts to `/api/v1/graphql`.

### The switch

`src/features/challenges/components/analysis/challenge-entity-analysis-page.tsx:2862`

```ts
case 'ins':
  if (isRedesignOnlyApi && onInsSearchChange) return <DeferredNativeEntityInsView … />
  if (isRedesignOnlyApi)                      return <EntityViewUnavailable … />
  return <DeferredInsStatsView entity={entity} reportPeriod={reportPeriod} />
```

`isRedesignOnlyApi` = `VITE_API_MODE === 'redesign'`, set in exactly two places:
`k8s/overlays/chronos-dev/configmap-patch.yaml:11` and your local `.env.local`.
Everywhere else defaults to `legacy` (`src/config/env.ts:42`) — which is why
`main` and non-Chronos environments still show the polished view.

The overlay README states the gate's original purpose: it *"prevents this
redesign-only canary from dispatching requests for auxiliary entity panels that
have not moved off the legacy API."* **For INS that premise no longer holds** —
see §2.

---

## 2. Chronos serves the legacy INS surface — verified

The server (`hack-for-facts-eb-server` @ `dev`) carries a deliberate compatibility
slice: `src/modules/ins-native/shell/graphql/legacy/{typedefs,resolvers}.ts`,
registered at `src/modules/ins-native/index.ts:81`. Its header says it is the
legacy INS SDL *"byte-for-byte … for the 8 roots the client sends"*, pinned by a
CI identity test, minus only `insUatIndicators` and `insCompare` (decision D5).

Served: `insDatasets`, `insDataset`, `insDatasetDimensionValues`, `insTerritories`,
`insContexts`, `insObservations`, `insUatDashboard`, `insLatestDatasetValues`.

**Neither dropped root is used by the dev client** — the only match for
`insUatIndicators|insCompare` in `src/` is a comment.

Fired the client's own query constants at `https://dev-chronos-api.transparenta.eu/api/v1/graphql`
(browser UA + origin header; anonymous requests are 403 without them):

| Query | Result |
|---|---|
| `INS_CONTEXTS_QUERY` | OK |
| `INS_DATASETS_QUERY` | OK |
| `INS_DATASET_DIMENSIONS_QUERY` | OK |
| `INS_DATASET_DIMENSION_VALUES_QUERY` | OK |
| `INS_UAT_DASHBOARD_QUERY` | OK |
| `INS_DATASET_HISTORY_QUERY` (limit 200 and 1000) | OK |
| batch `insObservations` (summary tiles) | OK |

**So "main's UI on the Chronos API" is not blocked by the API.**

---

## 3. Running it proves the point — and exposes two real gaps

Ran the app twice against `dev-chronos-api`, same entity (`/entities/4305857?view=ins`,
Municipiul Cluj-Napoca), only `VITE_API_MODE` differing.

### Legacy view on Chronos (`VITE_API_MODE=legacy`) — mostly works

Renders correctly: all four summary tiles with values, the three-column
`Indicatori derivați` card with complete values and short unit labels
("7,64 · persons / 1.000 locuitori"), the dataset explorer, the detail card
title and breadcrumb. (Indicator *names* truncate to a letter at this viewport —
"R", "S", "M" — in **both** modes; that is not a native-mode regression.)

Three defects:

**(a) Breadcrumb / explorer grouping degrades.** Chronos returns
`context_path` as `>`-delimited *labels*:

```
"B. STATISTICA ECONOMICA > AGRICULTURA Comunicate de presa > FONDUL FUNCIAR"
```

`getContextPathSegments` (`ins-stats-view.formatters.ts:221`) splits on `.` and
the caller matches segments against `INS_ROOT_CONTEXTS` codes `'1'..'8'`. Nothing
matches. Visible in the render as one un-split crumb: `STATISTICA SOCIALA >
POPULATIE SI STRUCTURA …`. `insContexts.path` has the same label format, so the
existing `contextByCode` fallback does not rescue it.

*Fix already exists in the repo*: `nativeContext()` in
`src/features/statistics/lib/entity-ins-dashboard.ts` splits on `>` and maps the
leading `A.`–`H.` letter via `INS_ROOT_CONTEXTS.shortLabel`. Alternatively resolve
roots by walking `context_code` → `insContexts.parent_code` (both fields are served).

**(b) The detail card body never renders — ~46 s of blocking pagination.**
Measured directly against Chronos for POP107D at one UAT:

```
page 1..10: nodes=1000  hasNext=true   totalCount=-1  (~4.1s each)
page 11:    nodes=920   hasNext=false  totalCount=10920
TOTAL rows=10920  pages=11  elapsed=45.7s
```

`getInsDatasetHistory` (`ins-fetchers.ts:192`) pages sequentially at
`pageSize: 1000, maxPages: 30` (`ins-stats-view.tsx:329`) and pulls the **entire
10,920-cell cube** before the chart, selectors or table can paint. Chronos also
reports `pageInfo.totalCount: -1` on every page but the last, so any mid-flight
count read is wrong.

This is a pagination/perf contract mismatch, not a schema one. The native view
sidesteps it by binding reads to a publication and pinning dimensions
(`sourcePins`), fetching one series instead of the cube.

**(c) One untriaged `GraphQL transport error`.** The console logged exactly one,
and the tiles briefly dropped back to skeletons after having rendered. Every INS
query passes when fired directly, so it is probably a non-INS legacy-path request
(entity details via `routes/entities.$cui.lazy.tsx:151`) or the dev proxy timing
out a 4 s+ page. Not run down — but Option A would have to.

### Native view on Chronos (current dev) — the polish regressions

Same presentation components, leaner row model. Two genuine presentation bugs and
one product decision that is showing up as three symptoms.

**Presentation bug 1 — derived values are clipped** ("7," "8," "-1," instead of
"7,64" "8,79" "-1,15"). Root cause is one line:
`entityInsDerivedIndicators` (`entity-ins-dashboard.ts`) passes
`unit: { ...observation.unit, symbol: null }`. `derived.ts:45` picks the unit
label as `[unit.symbol, unit.name_ro, unit.code]` — with `symbol` nulled it falls
through to `name_ro` ("Numar persoane" vs the symbol "persons"), and the longer
string squeezes the value out of its column. Candidate one-line fix.

**Presentation bug 2 — an empty group renders as a dead grid cell.** UTILITĂȚI has
zero eligible rows and the card renders an empty right third rather than an
empty-state. That is a rendering gap regardless of what the data says.

**Product decision — strict period matching.** `entityInsDerivedIndicators`
requires each row's `iso_period` to equal POP107D's (2025) and rejects any
`value_status`; the utilities datasets' latest is older, so they drop entirely —
that is why UTILITĂȚI has no rows. The same decision is why `ANGAJAȚI (MEDIE)`
shows `N/A` where legacy shows `195,03 mii · Perioadă: 2024 (ultima disponibilă)`.
Legacy mixes periods by design — its card header literally reads **"Perioadă:
Mixt (ultima disponibilă)"** and it has `fallbackIndicatorsSnapshotQuery` /
`hasFallback` for exactly this. The native view was written to refuse it.
**This is the one thing that needs a product call**, against `DESIGN.md`
§Data Trust & Provenance — it is not a bug to "fix".

Separately, the detail card is a source-cell inspector (pins, `value_status`, CSV
export) rather than main's chart + series/unit/temporal selectors.

**What the native view already gets right:** it reuses main's
`SummaryMetricsSection`, `DerivedIndicatorsSection`, `DatasetExplorerSection` and
the `EntityInsDetailCard` chrome. Three of four sections are already main's code.

**So once the two presentation bugs are fixed, exactly two things separate the
two views: (i) the detail-card body, and (ii) the strict-vs-fallback period
decision.** Everything else is already main's UI.

---

## 4. Options

### Option A — flip the gate, keep main's view wholesale

Render `DeferredInsStatsView` in redesign mode too.

- Change: the `case 'ins'` branch, `isIndependentNativeView` (line 1137), the UAT
  guard (line 2499), `routes/entities.$cui.tsx:199` (SSR bootstrap),
  `routes/entities.$cui.lazy.tsx:151`, plus mocks in
  `-entities.$cui.lazy.test.tsx` and `challenge-entity-analysis-page.test.tsx`.
- **Must also fix (a) and (b) above** or the tab ships broken.
- **Loses** everything commit `9fad24aa` added: publication-bound dimension reads,
  source pins, unmodified source cells, `value_status` markers, complete CSV export.
- **Re-introduces** the period fallback (data-trust call).

Honest cost: the gate is trivial, (b) is not. Fixing (b) properly means teaching
the legacy view to pin dimensions server-side — i.e. rebuilding the thing the
native layer already does.

### Option B — keep the Chronos/native data layer, restore main's detail UI ✅ recommended

Port `DatasetDetailSection`'s body (series/unit/temporal selector row +
`EntityInsHistoryChart`) onto `useEntityInsSource`, keeping `EntityInsSourceControls`'
pins as the selector model, and render it inside the existing `EntityInsDetailCard`.

- Three of four sections need no work — already main's components.
- No API change, no 46 s fetch, no data-trust regression.
- Separately fix the two native-mode presentation bugs (clipped values via the
  nulled `symbol`; empty-state for a zero-row group) — cheap, and they are most
  of what reads as "less polished".
- Open question to decide explicitly: keep the strict same-period behaviour
  (`N/A`, no UTILITĂȚI) or restore main's "Mixt (ultima disponibilă)" fallback
  with a provenance label.

### Option C — flip the gate behind a temporary per-surface flag

Ship A and B side by side on the canary for one review cycle, pick the winner,
delete the loser. Useful only if the visual call is contested; costs a flag.

---

## 4b. Decisions taken (2026-09-15)

Option B confirmed: **keep Chronos / the native data layer, polish the UI.**

1. **Periods — split.** Summary tiles may fall back to the latest available value,
   labelled `Perioadă: <year> (ultima disponibilă)`. Derived indicators keep strict
   same-period matching, because they divide one dataset by population and a
   mixed-period ratio is wrong rather than merely stale. A group with zero eligible
   rows renders an empty-state that says why, not a dead grid cell.
2. **Observations table — main's 3 columns only** (`Perioadă | Valoare | Detalii`),
   formatted values, `Afișează toate perioadele`. Raw source cells stay reachable
   through CSV export, which is kept along with `value_status` markers.
3. **Selectors — compact by default, pins under `Avansat`.** Only dimensions with a
   real choice render as selectors, with the rest in main's `Criterii active pentru
   serii: …` sentence; the full pin grid (`Șterge`, source-default hints) moves
   behind an `Avansat: fixare sursă` disclosure so no publication-binding
   capability is lost.

Not doing: the `getContextPathSegments` fix (§3a) is moot while we stay on the
native view — it only affects `InsStatsView`. Left in this doc for the record.

## 5. Suggested order of work (Option B)

1. Fix the two native presentation bugs — (a) stop nulling `unit.symbol` in
   `entityInsDerivedIndicators` so values stop clipping; (b) render an empty-state
   instead of a dead grid cell for a group with zero eligible rows. Smallest
   change, biggest visible win, and independent of the decision below.
2. Decide the period question (strict same-period `N/A` vs main's labelled
   "Mixt / ultima disponibilă"). This is what makes UTILITĂȚI and the employees
   tile populate or not — a product call, not an implementation one.
3. Port the series/unit/temporal selector row + `EntityInsHistoryChart` into the
   native detail card over `useEntityInsSource`.
4. Fix `getContextPathSegments` for `>`-delimited paths (reuse `nativeContext()`)
   — needed regardless, and unblocks Option A if it is ever wanted.
5. `yarn run check`, Vitest, Playwright `integration`.

Independently worth filing against the server: `pageInfo.totalCount: -1` on all
but the final page makes any paged INS consumer unable to size its work up front.

---

## Reproduction notes

```bash
# native (current dev behaviour)
yarn dev --port 3007                      # .env.local already sets VITE_API_MODE=redesign
# legacy view on Chronos
VITE_API_MODE=legacy yarn dev --port 3008
# then open /entities/4305857?view=ins in both
```

Anonymous GraphQL probes against `dev-chronos-api.transparenta.eu` need a browser
`user-agent` **and** an `origin` header, otherwise they 403. Introspection is off.
