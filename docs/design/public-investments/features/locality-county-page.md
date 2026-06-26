# Feature — Locality & County Territory Pages (MVP-5)

> Read with `design.md` (shared shapes/routes/guardrails) and `ux.md`. This is
> the casual user's most common real-world entry: "what's being built in my
> commune/county, and is it progressing?"

## Feature owner profile

Territory / geo front-end subagent. One shared territory page core renders two
routes (locality by SIRUTA, county by code) — mirror how
`src/features/entities/page-core/route-adapters` shares a core across
`entities.$cui` and `primarie/$cui`.

## Summary

Two territory-scoped surfaces sharing one core:
- `/investitii-publice/localitati/$siruta` — a UAT/locality.
- `/investitii-publice/judete/$countyCode` — a county.

Each shows: territory header, a map of objectives there, an absorption summary,
totals by program/domain, the objectives list, and evidence-led cross-links to
the local authority (`/primarie/$cui`, `/entities/$cui`) and budget.

## Facts / Decisions / Assumptions

- **Fact (UX MVP-5):** `territory_links` (SIRUTA→territory) + objectives serve
  today; beneficiary authority links to `core.public_entities` /`/primarie/$cui`.
- **Fact:** SIRUTA is territory identity only (UX §1); the page is scoped by
  territory, not by a merged entity.
- **Fact (UX R7):** coverage is uneven; a territory may have only some programs.
- **Decision:** Two routes, one `TerritoryPageCore` parameterized by scope
  (`locality` | `county`). County aggregates all child UATs.
- **Decision:** The authority cross-link is **evidence-led**: shown only when a
  beneficiary CUI is present in the objectives' facts; labeled "autoritate
  beneficiară (din sursă)". No money-flow merge.
- **Assumption:** County code is the two-letter mnemonic (e.g. `CJ`); the adapter
  resolves it to county name + child UATs. Unknown SIRUTA/county → domain 404.

## Route and URL state

- Routes:
  `src/routes/investitii-publice/localitati.$siruta.tsx` (+ `.lazy.tsx`)
  `src/routes/investitii-publice/judete.$countyCode.tsx` (+ `.lazy.tsx`)
- Search params (shared, zod, defaults stripped):

```
programs: ProgramCode[]?
domains:  string[]?
stages:   StageBucket[]?
sort:     'contracted'|'reimbursed'|'absorption'|'title'|'stage'  // default 'contracted'
order:    'asc'|'desc'   // default 'desc'
view:     'list'|'map'|'split'   // default 'split' desktop, 'list' mobile
selected: string?        // objectiveId map↔list highlight
dovada:   string?        // evidence deep-link
```

- **Decision:** A "Vezi toate filtrele" link routes to
  `/investitii-publice/cautare` pre-scoped (`?siruta=` or `?counties=`) for full
  filtering; the territory page keeps a lighter local filter set.

## Data contract and mock states

Adapter: `src/features/public-investments/api/territory.live.ts` +
`territory.mock.ts`.

```ts
type TerritoryScope = 'locality' | 'county'
type TerritoryData = {
  readonly scope: TerritoryScope
  readonly siruta: string | null            // for locality
  readonly countyCode: string
  readonly countyName: string
  readonly localityName: string | null      // for locality
  readonly authority: {                      // evidence-led, may be null
    readonly cui: string | null
    readonly name: string | null
    readonly isPrimarie: boolean
    readonly evidenceRef: EvidenceRef | null
  } | null
  readonly summary: {
    readonly objectiveCount: number
    readonly contractedTotal: MoneyValue     // guarded
    readonly reimbursedTotal: MoneyValue     // guarded
    readonly absorptionPct: number | null
    readonly stalledCount: number            // contractat/in_executie, low absorption
  }
  readonly byProgram: ReadonlyArray<{ program: ProgramCode; count: number; contracted: MoneyValue }>
  readonly byDomain: ReadonlyArray<{ key: string; label: string; count: number; contracted: MoneyValue }>
  readonly objectives: readonly ObjectiveSummary[]
  readonly mapPoints: readonly ObjectiveMapPoint[]
  readonly childUats?: ReadonlyArray<{ siruta: string; name: string; objectiveCount: number; absorptionPct: number | null }>  // county only
  readonly status: DomainDataStatus
}
```

- **Mock states:** (1) locality with several objectives across programs;
  (2) county with `childUats` ranking; (3) territory with one program only
  (partial coverage note); (4) authority null (no beneficiary CUI in source);
  (5) PI-1 active (summary amounts guarded); (6) empty territory ("Nu există
  obiective înregistrate aici").

## UI structure

1. **Header band** — breadcrumb (`Investiții publice › {county}` and for
   locality `› {locality}`), H1 = locality/county name, scope subtitle. For
   locality: a "Vezi județul {county}" link → county route.
   `CoverageRibbon` compact + `FreshnessBadge`.
2. **Authority strip** (when `authority` present) — "Autoritate beneficiară:
   {name}" with links to `/primarie/$cui` (if `isPrimarie`), `/entities/$cui`,
   `/budget-explorer?...`, each with a one-line "why" ("din facturile sursei") +
   `EvidenceLink`. `PrivacyBoundaryNotice` is **not** needed (authorities are
   institutions, not gated parties).
3. **Summary row** (unframed `divide-x`): Obiective, Contractat
   (`AmountWithEvidence`), Decontat, Absorbție (`AbsorptionBar`), Blocate
   ({stalledCount} → links to filtered list).
4. **Breakdown band** — two compact horizontal-bar lists: "Pe program"
   (`ProgramChip` + count + contracted bar) and "Pe domeniu" (domain + count +
   bar). Each row filters the list below (sets `programs`/`domains`).
5. **County only — child UAT ranking** — a small sortable table of child UATs
   (name, # obiective, absorbție) each linking to the locality route.
6. **Objectives band** (`MapListSync`) — same map+list pattern as `cautare` but
   scoped: map of local points, list of `ObjectiveListRow` (title, program,
   contracted, decontat, absorbție, stadiu), row → objective detail, `selected`
   sync. Local filter chips (program/domain/stage) + "Vezi toate filtrele →".
7. **Footer** — source attribution + `RequestDatasetAction` for not-yet-captured
   programs in this territory.

## Component reuse and proposed new components

- Reuse: `InteractiveMap`, `MapLegend`, `Table`, `Badge`, `Tooltip`, `Sheet`,
  `Skeleton`, `EmptyState`, `breadcrumb`, county/uat filter components,
  `toggle-group`, `Pagination`.
- Shared trust: `CoverageRibbon`, `FreshnessBadge`, `DataStatusBadge`,
  `EvidenceLink`, `SourceProvenanceDrawer`, `MapListSync`, `RelatedLinksRail`.
- New PI: `AmountWithEvidence`, `AbsorptionBar`, `StageBadge`, `ProgramChip`,
  `ObjectiveListRow`, `ObjectiveCard`, `HowToReadData`. Shared
  `TerritoryPageCore` consumed by both routes.

## Interactions

- Breakdown row click → sets local filter param + scrolls list.
- Child UAT row (county) → locality route.
- Authority links → entity/primărie/budget with context params.
- Map↔list `selected` sync; row → objective detail; "Vezi toate filtrele" →
  `cautare` pre-scoped. "Vezi dovada" on summary amounts → drawer.

## Loading / empty / error / partial / stale

- **Loading:** header + summary skeleton; map dot loader; list skeleton rows.
- **Empty:** zero objectives → `EmptyState` "Nu există obiective de investiții
  înregistrate aici (din sursele captate)" + link to county/landing +
  `RequestDatasetAction`.
- **Error:** fetch error → error card + retry, URL intact. Unknown
  SIRUTA/county → domain 404 with search CTA.
- **Partial:** programs absent from this territory shown as "fără date aici";
  authority null → strip hidden with a small "autoritate beneficiară
  neidentificată în sursă" note.
- **Stale:** `FreshnessBadge` muted; data-status notice when PI-1 active.

## Accessibility and i18n

- Map paired with the objectives list (accessible equivalent); breakdown
  bar-lists are semantic lists with text values, not chart-only.
- County child-UAT table is semantic with `aria-sort`. All amounts stated in
  text; `AbsorptionBar`/`StageBadge` accessible. Lingui throughout; SIRUTA/UAT/
  CUI expanded on first use.

## Privacy / provenance

- Authorities (beneficiary UAT/primărie) are institutions — shown with CUI and
  links; **not** subject to the party privacy gate. Contractor/designer names do
  **not** appear on this page (it is territory-scoped); if a future variant adds
  them, they pass the `served` gate.
- Summary amounts carry `EvidenceLink`; authority link carries its `EvidenceRef`
  ("why this authority"). Coverage/freshness shown near the result.

## Acceptance checklist

- [ ] Both routes render via one `TerritoryPageCore`; default (no params) shows
      scoped split view sorted by contracted desc.
- [ ] Summary amounts guarded (`AmountWithEvidence`); PI-1 notice when active.
- [ ] Authority strip appears only with a source-backed beneficiary CUI and
      links to primărie/entity/budget with a "why".
- [ ] County page shows child-UAT ranking; locality page links up to county.
- [ ] Breakdown rows filter the objectives list; "Vezi toate filtrele" routes to
      `cautare` pre-scoped.
- [ ] Empty/partial/error/404 states implemented; map has list equivalent;
      `yarn typecheck` clean; i18n done.

## Non-goals

- Full filter set (delegated to `cautare`).
- Authority financials/budget rendering (link out to existing budget surfaces).
- Cross-source money-flow merge (guardrail).
- Planning-reference "Planificare" tab (ADV-5, inert lane — out of MVP).

## Open questions (blockers only)

- None. Authority resolution is evidence-led and may be null; PI-1 + gating
  handled by shared guards.
