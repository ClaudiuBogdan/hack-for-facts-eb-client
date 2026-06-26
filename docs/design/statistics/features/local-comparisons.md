# Feature: Local comparisons

> Domain: statistics · Route: `/statistici/comparatii` · High-value next #5
> Consumes: `docs/design/statistics/design.md`, `docs/design/statistics/ux.md`.

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + TanStack Query +
recharts). Strength: multi-entity selection state, side-by-side tables and
comparative charts. Writes a thin comparison adapter (or composes existing
per-territory adapters).

## Summary

Pick one dataset + 2–N territories + a time range, and read them side by side:
a comparison table (latest value + rank) and a bar chart (latest period) or line
chart (trend), with unit, source, and CSV export. Answers "how does my area
compare to neighbors / county / national" — the top journalist/analyst job.

## Facts, decisions, assumptions

- **Fact:** There is **no client `compareInsUats` adapter** (verified —
  `src/lib/api/ins.ts` has no such export). The server use case exists per UX doc
  §5 but is not wired to the client.
- **Fact:** Per-territory values are obtainable today via
  `getInsLatestDatasetValues({ entity, datasetCodes, preferredClassificationCodes? })`
  (latest snapshot per territory) and `getInsDatasetHistory` (trend per territory).
- **Decision:** Build comparison by **fanning out existing adapters per
  territory** behind a single feature hook `useInsComparison({ datasetCode,
  territories, range, classification?, unit? })` that runs N
  `getInsLatestDatasetValues`/`getInsDatasetHistory` queries (TanStack
  `useQueries`) and assembles a normalized matrix. If/when a server
  `compareInsUats` lands, swap inside this hook only.
- **Decision:** Comparison is **single-dataset, multi-territory** for MVP-next
  (UX doc High-value). Adding a second dataset for correlation is an advanced
  feature and out of scope.
- **Decision:** Enforce homogeneity — all territories compared at the same level
  and the same periodicity; mixed periodicity is blocked with a clear message
  (UX doc §15). Only datasets in `Date disponibile` are selectable.
- **Assumption:** "Neighbors" is offered as a convenience only if neighbor
  adjacency is available; otherwise users add peers manually via the territory
  picker. Marked Assumption because adjacency data is not confirmed in the client.
- **Assumption:** Practical cap N ≤ 8 territories to keep charts readable and
  query fan-out bounded.

## Route and URL state

- **Route:** `/statistici/comparatii` (file:
  `src/routes/statistici/comparatii.tsx` + lazy). Default renders an empty
  builder (no params).
- **Search params** (zod `validateSearch`):
  - `dataset` — matrix code (must be available; required to show results).
  - `territory` — repeated/comma SIRUTA codes (the compare set; 2–8).
  - `level` — `LAU|NUTS3` (derived from selection; enforced homogeneous).
  - `range` — `latest` (default) | `YYYY-YYYY`.
  - `classification` — optional classification value code.
  - `unit` — selected unit key.
  - `view` — `tabel` (default) | `bare` (bar) | `linie` (line).
  - `sort` — `valoare|nume` (default `valoare`).
- **Decision:** `territory` doubles as the foundation `compare` state; deep links
  from the hub (`?territory=$siruta&dataset=…`) seed the builder with the primary
  territory + national as the default peer.

## Data contract and mock states

```ts
type CompareTerritory = { siruta: string; name: string; level: 'LAU' | 'NUTS3' }
type CompareCell = {
  siruta: string
  latest: { value: string | null; numericValue: number | null; period: string; statusLabel: string | null }
  series?: { period: string; numericValue: number | null }[]   // when range set
  rank?: number
  status: 'available' | 'no-data'
}
type CompareResult = {
  datasetCode: string; datasetName: string
  unit: { symbol: string | null; name: string | null }
  periodicity: InsPeriodicity
  territories: CompareTerritory[]
  cells: CompareCell[]
}
```

Mock states (`src/features/statistics/comparisons/mocks`):
- **3 counties, latest:** ranked table + bar chart.
- **UAT + county + national, trend:** line chart over `range`, one series with a
  gap.
- **One territory has no data:** its row renders "fără date", excluded from rank.
- **Mixed periodicity attempt:** blocked-state message.
- **Single territory selected:** prompt to add at least one peer.

## UI structure

```
<header band> "Comparații locale" + CoverageRibbon
<builder bar (sticky)>
  <DatasetPicker> (available only) · <TerritoryPicker multi> (chips, 2–8) ·
  <Select> Perioadă (Cele mai recente | interval) · [classification] [unit] ·
  <ToggleGroup view> Tabel | Bare | Linie · [Descarcă CSV] · ShareFilteredView
<results>
  view=tabel: <Table> rows=territories, cols= Teritoriu | Valoare | Rang | Perioadă | Status
              (sortable; primary/highlight territory emphasized)
  view=bare: bar chart, latest period, one bar/territory, unit axis label
  view=linie: line chart, one line/territory over range, gaps honest
  unit + source line + SourceProvenanceDrawer under the result
```

- **Decision:** Table is the canonical/accessible result; charts are the visual
  layer with the table as fallback. No card-in-card; result is a full-width band.

## Component reuse and proposed new components

- **Reuse:** `getInsLatestDatasetValues`/`useInsLatestDatasetValues`,
  `getInsDatasetHistory`/`useInsDatasetHistory`, `series-selection.ts`,
  formatters; `Table`, `ToggleGroup`, `Select`, `MultiSelect`, `Command`,
  recharts chart components under `src/components/charts`; `copy-button`,
  `Skeleton`, `EmptyState`.
- **New (domain):** `useInsComparison` (fan-out + assemble), `DatasetPicker`,
  `TerritoryPicker` (multi mode), `ComparisonTable`, `ComparisonChart`,
  `DataStatusBadge`, `CoverageRibbon`, `FreshnessBadge`, `SourceProvenanceDrawer`,
  CSV builder.

## Interactions

- Add/remove territory chips, change dataset/range/classification/unit/view →
  URL updates; results recompute.
- Sort table by value/name; highlight the primary (deep-linked) territory.
- "Descarcă CSV" exports the comparison matrix with provenance header.
- Row/bar/line → "Deschide teritoriul" link to `/statistici/teritorii/$siruta`.
- `ShareFilteredView` copies the comparison URL.

## Loading, empty, error, partial, stale states

- **Loading:** per-territory query skeletons; table fills incrementally as
  queries resolve (don't block the whole table on the slowest).
- **Empty (no dataset/territories):** builder guidance "Alege un set și cel puțin
  două teritorii".
- **Partial (some territories failed/no-data):** failed rows show "fără date"/retry
  inline; the comparison still renders for the rest with a note.
- **Mixed periodicity / level mismatch:** blocked message + how to fix.
- **Error (all failed):** error band + retry; URL preserved.
- **Stale:** `FreshnessBadge`; if territories have different `last_sync_at`, note
  "Datele pot fi din perioade diferite" and show each cell's period explicitly.

## Accessibility and i18n

- Charts paired with the comparison table (required fallback); chart `aria-hidden`.
- Territory chips removable by keyboard; picker is a labelled combobox.
- Rank conveyed numerically + position, not color alone.
- Romanian labels: "Comparații locale", "Teritoriu", "Valoare", "Rang",
  "Perioadă", "Cele mai recente", "Tabel", "Bare", "Linie", "fără date",
  "Deschide teritoriul", "Descarcă CSV", "Alege un set și cel puțin două
  teritorii". Numbers/periods locale-formatted.

## Privacy, provenance, source citation

- Aggregate public data. One source line + `SourceProvenanceDrawer` per result;
  each cell shows its own period so different freshness is never hidden. Neutral
  language — a rank is a value comparison, not a judgment. `CoverageRibbon`
  present. CSV includes provenance header.

## Acceptance checklist

- [ ] Select available dataset + 2–8 territories → ranked table + bar/line chart.
- [ ] Comparison built via `useInsComparison` fan-out of existing adapters; swap
      point isolated for a future `compareInsUats`.
- [ ] Homogeneous level + periodicity enforced; mismatches blocked with guidance.
- [ ] Per-cell period shown; partial failures degrade gracefully.
- [ ] CSV export + provenance; deep link from hub seeds the builder.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled; chart has table fallback.

## Non-goals

- Two-dataset correlation / dual-axis overlay (advanced).
- Saved comparisons (advanced).
- Auto neighbor detection unless adjacency data is available.

## Open questions (blockers only)

None. The missing `compareInsUats` adapter is handled by the documented fan-out
Decision; neighbor adjacency is an Assumption-gated convenience.
