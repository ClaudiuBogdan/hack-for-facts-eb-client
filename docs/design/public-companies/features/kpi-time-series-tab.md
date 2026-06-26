# Feature: KPI Time Series tab

> MVP-3. Tab `?tab=indicatori` on `/intreprinderi-publice/$cui`. Ships on the live
> AMEPIP core lane — this is the core analytical content of the domain. Read with
> `enterprise-profile.md`, `source-lineage-verify.md`, and `../design.md`.

## Feature owner profile

Frontend feature implementation subagent (React 19 + TypeScript + Recharts +
shadcn/ui + Tailwind v4 + Lingui). Needs care with mixed `value_kind` rendering
and chart↔table accessibility parity.

## Summary

Makes the 213,680 indicator values legible per enterprise: an indicator picker
over the 43-KPI dictionary (search by name or `kpi_code`, grouped by
`source_sheet`), a multi-year multi-series line chart for the selected indicators,
and a year × indicator table with conditional heat-shading. Every value shows its
`measure_unit` and `kpi_code`, renders all four `value_kind` variants, and exposes
per-row `warnings`. Selection is URL-addressable so an analyst can share a view.

## Facts, decisions, assumptions

- Fact (UX §5/§13 MVP-3): Data is `indicator_values` (213,680 rows) +
  `indicator_dictionary` (43 rows), both live today. `indicator_values` columns:
  `cui, year, source_sheet ('calculated'|'form'), version, indicator_key,
  kpi_code, raw_value, numeric_value, boolean_value, value_kind ('number'|
  'boolean'|'text'|'empty'), warnings`.
- Fact (UX §5): `indicator_dictionary` columns: `indicator_key, kpi_code
  (nullable), kpi_id, indicator_name, measure_unit, source_sheet, source_header`.
- Fact (UX §6/§15): Values are ratios/KPIs, mixed `value_kind`, nullable
  `kpi_code`. Charts/tables must not break on `text`/`boolean`/`empty`.
- Fact (UX §6): Some enterprises have incomplete year coverage (95 invalid/blank
  year rows excluded from `enterprise_years`). Missing years must be honest gaps,
  not zeros.
- Decision: Only `value_kind === 'number'` series are charted. `boolean`/`text`/
  `empty` indicators are table-only, with an inline note "indicator ne-numeric —
  vezi tabelul". This prevents the highest correctness risk (charting a boolean as
  0/1 or a ratio as currency).
- Decision: Default selection on tab open with no `kpis` param = the same
  `HEADLINE_KPI_KEYS` as the profile band (continuity), capped at 4 numeric
  series. The full year range is selected by default.
- Decision: `source_sheet` (`calculated` vs `form`) is a visible facet because the
  same `indicator_key` can appear in both; the picker groups by it and the table
  labels it. (Fact UX §5.)

## Route and URL state

- Fact: This is a panel of the `/intreprinderi-publice/$cui` route; it adds search
  params to that route's schema (no new route).
- Decision: Search params (in `parsePublicEnterpriseProfileSearch`):
  - `kpis`: comma-separated `indicator_key`s (multi-value per README; validated
    against the dictionary, unknowns dropped by the parser, not by an effect).
  - `years`: a compact range or comma list (e.g. `2019-2024` or `2021,2023`);
    default = all available years.
  - `sheet`: `calculated | form | all` (`.catch('all')`).
  - `view`: `chart | table | both` (`.catch('both')`).
- Decision: Changing the picker/year/sheet updates the URL via `navigate({ search:
  prev => … })`; back/forward restores the exact view.

## Data contract and mock states

Two calls (mock↔live by `soe-amepip`):

```ts
// Dictionary — cached, fetched once per session
fetchIndicatorDictionary(): Promise<readonly IndicatorDictEntry[]>
type IndicatorDictEntry = {
  indicatorKey: string
  kpiCode: string | null
  kpiId: string | null
  indicatorName: string                 // RO
  plainLabel: string | null             // curated gloss for headline KPIs; null otherwise
  measureUnit: string | null
  isRatio: boolean                       // derived: true unless unit denotes a count/currency
  sourceSheets: ReadonlyArray<'calculated' | 'form'>
}

// Values for one enterprise across all years/indicators
fetchEnterpriseIndicators(cui: string): Promise<EnterpriseIndicatorSet>
type EnterpriseIndicatorSet = {
  cui: string
  availableYears: readonly number[]
  rows: readonly IndicatorValueRow[]    // long form, design.md §6 IndicatorValue
  lineage: SourceLineage
}
```

- Decision: Fetch the full long-form set once and pivot client-side (1,342 CUIs ×
  43 KPIs × ~6 years is small per enterprise — at most a few hundred rows). No
  per-selection server round-trip.
- Mock: fixtures must include at least one of each `value_kind` and one row with a
  non-empty `warnings` array, plus an indicator missing a `kpi_code` and one with
  a year gap, so all render paths are exercised.

### States

- **Loading**: picker skeleton + chart skeleton + table skeleton.
- **Empty** (enterprise has no indicator rows — rare): `EmptyState` "Nu există
  indicatori AMEPIP pentru această întreprindere." + lineage.
- **No selection**: if the user clears all KPIs, show a prompt "Alege unul sau mai
  mulți indicatori" rather than an empty chart.
- **Non-numeric selection only**: hide the chart, show the table + the
  "indicator ne-numeric" note.
- **Error**: inline `Alert` + retry; the picker (from the cached dictionary) stays
  usable.
- **Partial year coverage**: missing years are gaps in the line (Recharts
  `connectNulls={false}`) and blank "—" cells in the table, with a tooltip "fără
  date pentru {year}".
- **Stale**: inherits the profile's snapshot note.

## UI structure

Within the tab panel:

1. **IndicatorPicker** (top, sticky on desktop): a searchable multi-select
   (`styled-multi-select`/`multi-select`) listing dictionary entries grouped by
   `source_sheet`; each option shows `indicatorName` + a muted `kpi_code` +
   `measure_unit`. A small `sheet` toggle (`Calculat / Formular / Toate`) and a
   `years` range control (reuse `amount-range-picker` styling or a simple
   year `Select`/slider). A `view` toggle (`Grafic / Tabel / Ambele`).
2. **Selected-KPI chips**: `filter-tag`s for current selection, each removable;
   an "Resetează" clears to defaults.
3. **Chart** (numeric series only): Recharts multi-series line chart, one line per
   selected numeric indicator, x = year, synchronized tooltip showing each
   indicator's plain label + value + `measure_unit`. A legend maps line → indicator
   (name + unit). Y-axis is unit-aware; if selected indicators have incompatible
   units, split into small multiples (one mini-chart per unit group) rather than a
   misleading shared axis. (Pattern D.)
4. **Table** (always available): rows = years (desc), columns = selected
   indicators; each cell rendered by `KpiValueKindRenderer`:
   - `number`: locale number + unit suffix; heat-shade background by relative value
     within the column (conditional formatting), with the numeric value always in
     text (not color-only).
   - `boolean`: `Da` / `Nu` badge.
   - `text`: the raw text, truncated with tooltip.
   - `empty`: muted "—" with `aria-label="fără valoare"`.
   - `warnings`: a small warning icon (`AlertTriangle`) with a tooltip listing the
     warnings; the icon is in addition to the value, never replacing it.
   - Each cell/column carries its `source_sheet` and `kpi_code` (column header
     shows name + unit + a `kpi_code` chip; `source_sheet` shown when `sheet=all`).
5. **Per-indicator definition**: an expandable "Ce înseamnă acest indicator?"
   accordion under the table listing each selected indicator's `indicatorName`,
   `measure_unit`, `kpi_code`, `source_sheet`, and plain-language gloss where
   curated; explicit "Acesta este un indicator/raport, nu o valoare contabilă
   absolută" line for ratios.
6. **Lineage**: a `SourceLineageBadge` on the chart and on the table footer.

## Component reuse and proposed new components

- Reuse: `multi-select`/`styled-multi-select`, `filter-tag`, `Select`, `slider`,
  `Table`, `accordion`, `Tooltip`, `Badge`, `skeleton`, `empty-state`, existing
  Recharts chart wrappers in `src/components/charts`.
- New: `IndicatorPicker`, `KpiValueKindRenderer` (shared with profile),
  `IndicatorTimeSeriesChart`, `IndicatorMatrixTable`, `IndicatorDefinitionList`.

## Interactions

- Select/deselect indicators → chart + table + URL update; chart and table stay in
  sync (same selection, same order).
- Hover a chart point → tooltip with all series at that year (plain label + value +
  unit). Hover a table cell warning → warnings tooltip.
- Toggle `sheet`/`years`/`view` → re-pivot client-side, update URL.
- "Copiază vizualizarea" (optional `ShareFilteredView`) copies the current URL.

## Loading, empty, error, partial, stale states

See Data contract → States. Invariant: a `text`/`boolean`/`empty`/`warning` row
never crashes the chart or table; non-numeric indicators are table-only.

## Accessibility and i18n

- Chart has an adjacent always-present table (the table IS the tabular fallback,
  README requirement) and a short text summary of the trend direction for the
  primary indicator.
- Table is semantic `<table>` with `<th scope>` on year rows and indicator
  columns; heat-shade has sufficient contrast and the number is the source of
  truth (color is redundant per README).
- Picker is keyboard-operable (Radix); chips removable by keyboard; warning icons
  have `aria-label` + tooltip.
- All copy Lingui; numbers/percentages via `Intl.NumberFormat('ro-RO')`; the unit
  string comes from the dictionary, not hard-coded.

## Privacy, provenance, and source-citation behavior

- Lineage badge on chart + table; drawer cites AMEPIP snapshot + workbook hash +
  source URL (Pattern B). No person-level data.
- Ratio/KPI tagging and unit display are mandatory (Pattern D); the explicit
  "not an absolute value" line appears for ratios.

## Acceptance checklist

- [ ] Opening `?tab=indicatori` with no `kpis` shows the default headline KPIs as
      numeric series + the matrix table.
- [ ] Picker searches by `indicator_name` and `kpi_code`, grouped by
      `source_sheet`.
- [ ] Selection, year range, sheet, and view are reflected in the URL and restored
      on reload/back.
- [ ] Chart shows only numeric series; selecting a `boolean`/`text` indicator adds
      it to the table with the non-numeric note, not to the chart.
- [ ] Mixed-unit selections do not share a misleading axis (small multiples or
      unit grouping).
- [ ] Table renders `number`/`boolean`/`text`/`empty` distinctly; `warnings` show
      an icon + tooltip; missing years are gaps, not zeros.
- [ ] Every value shows `measure_unit`; ratios carry the "not absolute" note.
- [ ] Lineage badge reaches the official AMEPIP URL.
- [ ] Lingui-wrapped; `yarn typecheck` clean.

## Non-goals

- No multi-enterprise comparison (that is `/intreprinderi-publice/comparare`,
  reserved).
- No absolute financials (link to `/companies/$cui`).
- No cross-snapshot diff (reserved, UX §14).

## Open questions (blockers only)

- None for MVP. The `isRatio` derivation and plain-language glosses are content
  decisions resolved from the dictionary, not build blockers.
