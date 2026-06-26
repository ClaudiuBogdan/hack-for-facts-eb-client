# Feature: CPV category page (`/achizitii/cpv/$code`)

> MVP-4. Makes the opaque CPV dimension navigable and plain-language. "45210000" →
> "Lucrări de construcții": total spend, top authorities/suppliers, trend.

## Feature owner profile

Implementation subagent type: **frontend feature engineer** (dynamic route + Recharts
+ shadcn). Depends on `coverage-data-as-of-layer.md` and shared chart/record
components.

## Summary

A page per CPV code/division showing the human label (RO when populated, EN
fallback), the parent/division hierarchy, total spend + record counts over time, the
top authorities and top suppliers in the category (capability-gated), a trend chart,
and related categories. It is the category lens that underpins the breakdown panels
elsewhere.

## Facts / Decisions / Assumptions

- **Fact:** CPV is procurement-owned (`procurement.cpv_codes` 9,760 loader-derived
  8-digit; `procurement.cpv_divisions` 46 seeded), never in `core.classification_codes`
  (UX §5.1, §7).
- **Fact:** `cpv_divisions.label_ro` is **not populated** (EN only); RO labels for
  codes are loader-derived/partial (UX §6.1, Open Q2). UI must fall back to EN and
  show the code.
- **Fact:** Category rollups exist: `authority_cpv_division_monthly_rollups`,
  `supplier_cpv_division_monthly_rollups` (UX §5.2). `cpv_category_filter` is gated
  on CPV coverage ≥0.85 (UX §6.4).
- **Decision:** `$code` accepts both a 2-digit division code and an 8-digit CPV
  code; the page resolves the level and renders division-level rollups (codes roll
  up to their division for aggregates, since rollups are division-grained).
- **Decision:** When RO label is missing, show EN label + "(etichetă oficială RO
  indisponibilă)" note, not a blank.
- **Assumption:** Code-level (8-digit) spend aggregates may be unavailable (rollups
  are division-grained); the page shows division-level aggregates and lists the
  code within the division. Implementer confirms grain; if code-level rollups exist,
  use them.

## Route and URL state

- **Route file:** `src/routes/achizitii.cpv.$code.tsx` (+ `.lazy.tsx`).
- **Loader:** resolve label + hierarchy by `$code`; `notFound()` if the code is
  invalid/unknown.
- **Search params:** `year`, `period` (YEAR default), `view` (`'spend' | 'count'` —
  which metric drives top-N + trend; default `count`, upgraded to `spend` only when
  `spend_ranked_top_n` allowed), `sort`. Default renders with no params.

## Data contract and mock states

Adapter: `src/features/procurement/api/cpv-category-api.{ts,mock,live}.ts`.

```ts
type CpvCategoryPage = {
  readonly code: string
  readonly level: 'division' | 'code'
  readonly labelRo: string | null
  readonly labelEn: string
  readonly divisionCode: string
  readonly parentCode: string | null
  readonly summary: {
    readonly totalSpend: MoneyValue
    readonly recordCounts: { contracts: number; directAcquisitions: number;
      procedures: number }
  }
  readonly spendOverTime: MonthlyPoint[]
  readonly topAuthorities: TopPartyRow[]   // gated
  readonly topSuppliers: TopPartyRow[]     // gated
  readonly relatedCategories: { code: string; labelRo: string | null;
    labelEn: string }[]
  readonly gate: CapabilityGate
}
```

Mock states:

- **Healthy division** (e.g. construcții) — full top-N with share + trend.
- **RO label missing** — EN fallback + note.
- **CPV coverage below threshold** — top-N shown as count-ranked only; spend top-N
  hidden with reason.
- **Sparse category** — few records; `EmptyState` for top-N, trend still shown.
- **Mixed currency** — totals follow currency rule; native-only suppliers noted.
- **Stale sync** — coverage banner note.

## UI structure

1. **Header band:** `CpvLabel` large (code + RO/EN), parent/division breadcrumb
   (`Breadcrumb`), `CoverageRibbon` + `FreshnessBadge`, plain-language one-liner
   ("Ce înseamnă această categorie").
2. **KPI row:** total spend (gated), # contracte, # achiziții directe, # proceduri.
3. **Spend/volume over time:** `SpendOverTime` (metric per `view`), amount-present
   vs missing split + text/table fallback.
4. **Top authorities** in category: `TopBuyersChart` + table; rows link to
   `/entities/$cui` and to `/achizitii/cautare?cpv_division=$code&authority_cui=…`.
5. **Top suppliers** in category: `TopSuppliersChart` + table; rows link to
   `/companies/$cui` and to filtered search.
6. **Related categories:** chips to sibling divisions/codes.
7. **CTA:** "Vezi toate înregistrările din această categorie" →
   `/achizitii/cautare?cpv_division=$code`.
8. **Explainer** (`Collapsible`): what CPV is, division→plain-language mapping.

## Component reuse and proposed new components

- Reuse: `Breadcrumb`, `Badge`, `Tooltip`, `Collapsible`, Recharts, `Table`,
  `EmptyState`, `Skeleton`.
- Shared: `CoverageRibbon`, `FreshnessBadge`, `DataStatusBadge`, `EvidenceLink`.
- New/shared-with-slices: `CpvLabel`, `SpendOverTime`, `TopBuyersChart`,
  `TopSuppliersChart`, `ValueWithCurrency`.

## Interactions

- `view` toggle (count/spend) switches the metric; spend disabled+reason when gated.
- `year` switch refetches (query keyed on `[code, year, view]`).
- Top-N row → entity/company; "Vezi toate" / per-row → filtered search.
- Related-category chip → another CPV page.

## Loading, empty, error, partial, stale states

- **Loading:** skeleton KPIs + chart.
- **Empty:** sparse category → `EmptyState` for rankings; trend still attempts.
- **Error:** inline retry (`handleError(e, 'procurement-cpv')`).
- **Partial:** spend top-N gated → count-ranked; RO label missing → EN + note.
- **Stale:** coverage banner note + "data as of".

## Accessibility and i18n

- h1 = category label; charts have text + table fallbacks.
- CPV code never the only identifier — always paired with a label (or EN fallback).
- All strings Lingui-wrapped; RO: "Categorie de achiziții (CPV)", "Cheltuieli
  totale", "Autorități principale", "Furnizori principali", "Categorii înrudite".
  "CPV" expanded ("Vocabularul comun privind achizițiile") on first use.

## Privacy, provenance, source citation

- Aggregate-only page; no PII. Coverage + freshness exposed.
- Top-N rows carry `EvidenceLink` to representative records; identity confidence on
  party links where partial.
- RO-label gap disclosed honestly (it is a data state, not hidden).

## Acceptance checklist

- [ ] Page resolves 2-digit and 8-digit `$code`; division-level aggregates render.
- [ ] RO label with EN fallback + missing-label note.
- [ ] KPIs + trend + top authorities + top suppliers render; spend gated correctly.
- [ ] Links to entity/company + filtered search work, carrying CPV context.
- [ ] All mock states render; charts have fallbacks.
- [ ] `yarn typecheck`; strings extracted/compiled; a11y pass.

## Non-goals

- No supplier-region breakdown (blocked v1).
- No EUR totals (no FX).
- No code-level aggregates if rollups are division-grained (documented Assumption).
- No editing/seeding of CPV labels in the client (data-side concern).

## Open questions (blockers only)

None. RO-label gap and division-grain are designed-for states with explicit
fallbacks; CPV RO seeding (UX Open Q2) improves labels later but does not block.
