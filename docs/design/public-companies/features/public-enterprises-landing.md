# Feature: Întreprinderi Publice — Landing page

> MVP-1. Route `/intreprinderi-publice` (no query state). Ships on the live AMEPIP
> core lane. Read with `../design.md` and `../ux.md`.

## Feature owner profile

Frontend feature implementation subagent (React 19 + TypeScript + TanStack Router
file routes + shadcn/ui + Tailwind v4 + Lingui). Comfortable with the shipped
`private-companies` and `entity-search` feature patterns and mock-first API
adapters.

## Summary

The discoverable home of the domain. A plain-language explainer of what a
state-owned enterprise (întreprindere publică) and AMEPIP/OUG 109/2011 are,
headline counts with a visible "as-of" snapshot date, a primary search box that
deep-links into the listing/profile, and a short "featured SOEs" rail. It sets
context for every other page and is the entry point the sidebar links to.

This route shares its path with the enterprise listing (`enterprise-listing.md`):
with no query params it renders landing mode; any active facet/`q`/`sort`/`page`
renders listing mode.

## Facts, decisions, assumptions

- Fact (UX §13 MVP-1): There is no entry point to SOEs today; users only reach
  them via global search. Headline data comes from `enterprise_years` (counts,
  distinct CUIs), `ticker_symbol` (listed count), current snapshot date, AMEPIP
  status distribution.
- Fact (UX §5): AMEPIP core is live: 1,342 distinct CUIs, 6,886 enterprise-year
  rows, 19 tickered SOEs, current snapshot `amepip-core-3a44f2c099fb711c`,
  CC-BY-4.0.
- Fact (UX §15): SNP/EL/FP are liquid BVB symbols but NOT SOEs — the explainer and
  "listed" framing must not imply every BVB symbol is a state enterprise.
- Decision: "Sanctioned this year" and "received state aid" headline stats degrade
  to a "în curând" chip until the sanctions/RegAS lanes deploy (UX MVP-1 says
  these counts degrade). The four primary stat cards use only live AMEPIP data.
- Decision: Default (no query) renders landing; the page mounts the listing's
  search input so typing/Enter transitions to listing mode on the same route.
- Assumption: Exact headline numbers are read from the API at runtime, not
  hard-coded; mock fixtures seed plausible values for development.

## Route and URL state

- Fact: `createFileRoute('/intreprinderi-publice/')` (index), lazy + non-lazy
  split like `companies.index.tsx` / `companies.index.lazy.tsx`.
- Decision: `validateSearch` uses the same Zod parser as the listing
  (`parsePublicEnterpriseSearch` in `src/schemas/public-enterprise.ts`) so both
  modes share one search contract. With an empty/normalized-empty search object →
  landing mode; otherwise → listing mode.
- Decision: `head()` returns RO SEO meta:
  - title: `Întreprinderi publice de stat — Transparenta.eu`
  - description: `Caută și analizează întreprinderile publice (de stat) din
    România: cine le controlează, indicatori AMEPIP pe ani și sursa oficială a
    fiecărei cifre.`

## Data contract and mock states

Landing needs one lightweight summary call. Mock-first via
`fetchPublicEnterpriseLandingSummary()` (mock↔live switch by `soe-amepip`).

```ts
type PublicEnterpriseLandingSummary = {
  totalEnterprises: number          // distinct CUIs in current workbook (1,342)
  enterpriseYearRows: number        // 6,886
  listedCount: number               // ticker_symbol not null (≈19)
  statusDistribution: ReadonlyArray<{ status: string; count: number }>
  snapshot: SourceLineage           // see design.md §6 (snapshotId, workbookDate, sourceUrl, license)
  // Gated headline stats: null until the lane is live (render "în curând")
  sanctionedCount: number | null
  stateAidCount: number | null
  featured: ReadonlyArray<{
    cui: string
    companyName: string
    amepipStatus: string | null
    tickerSymbol: string | null
    caenOnrc: string | null
  }>
}
```

- Decision: `featured` is a small curated/served list (e.g. largest or
  most-salient SOEs). Mock seeds Hidroelectrica, Romgaz, Nuclearelectrica,
  Transgaz, Transelectrica (UX §2 names these). No invented metrics on the rail —
  name + status + ticker badge only.

### States

- **Loading**: skeletons for 4 stat cards + 5 featured rows (use `skeleton.tsx`).
- **Empty/never** (summary returns zero enterprises — should not happen on live):
  `EmptyState` "Nu există date AMEPIP încărcate momentan." + lineage note.
- **Error**: inline `Alert` with retry; explainer text still renders (it is
  static), so the page is never blank.
- **Partial**: gated headline stats show a `DataStatusBadge` `gated` + "în curând"
  in place of the number, with a tooltip explaining the lane is not yet live.
- **Stale**: snapshot date older than ~9 months → append a muted "ultima
  actualizare AMEPIP" note (no alarming styling; AMEPIP is yearly, Fact UX §15).

## UI structure

Container `max-w-5xl mx-auto px-6`, 8pt grid.

1. **CoverageRibbon** (top): `Sursă: AMEPIP (OUG 109/2011) · date la zi:
   {workbookDate} · licență CC-BY-4.0`. Compact, full-width band.
2. **Hero / explainer** (restrained, no orb backgrounds):
   - Title `text-2xl font-semibold tracking-tight`: `Întreprinderi publice de
     stat`.
   - One paragraph: what an ÎP is, AMEPIP's role, OUG 109/2011 in plain language,
     and the key caveat: "Indicatorii AMEPIP sunt rate și KPI, nu valori
     contabile absolute." (Pattern D correctness).
3. **Headline stat cards** (4, equal but with a primary one): total enterprises;
   enterprise-year rows or distinct years covered; listed on BVB; + one status
   summary (e.g. "active" share) OR the gated "sancționate / ajutor de stat — în
   curând" pair. Each card: big number, RO label, tiny unit/denominator
   ("din 1.342").
4. **Primary search**: large input "Caută o întreprindere publică după nume sau
   CUI" → transitions to listing mode (`enterprise-listing.md`). Reuse the
   listing's `entity-search-input` analog.
5. **Featured rail**: "Întreprinderi de stat reprezentative" — 5 compact rows
   (name + status badge + ticker badge if listed), each linking to
   `/intreprinderi-publice/$cui`. Reuse the `EnterpriseResultRow` row style.
6. **Secondary entry**: links to listing presets — "Listate la BVB",
   "După autoritate tutelară" (the latter may be `gated`), "Toată lista".
7. **Source footer**: snapshot id + workbook hash + verify link (Pattern B).

## Component reuse and proposed new components

- Reuse: `src/components/ui/*` (`Badge`, `Button`, `skeleton`, `alert`,
  `tooltip`, `card`), the listing search input, `EnterpriseResultRow`.
- New: `CoverageRibbon` (shared candidate), `DataStatusBadge` (shared candidate),
  `LandingStatCard` (local), `SourceLineageBadge` (shared candidate). Defined
  once and reused by the profile and listing.

## Interactions

- Typing in search + Enter (or selecting a typeahead hit) → navigate to listing
  mode (`?q=…`) or directly to a profile if an exact CUI is entered.
- Clicking a featured row → `/intreprinderi-publice/$cui`.
- Clicking a gated stat's "în curând" → tooltip/popover explaining the lane and a
  `RequestDatasetAction`/"anunță-mă" affordance (optional, low priority).
- Clicking the CoverageRibbon "verifică" → opens the AMEPIP CKAN resource URL in a
  new tab (Pattern B), `rel="noopener noreferrer"`.

## Loading, empty, error, partial, stale states

Covered under Data contract → States. Key rule: the static explainer always
renders, so the page never appears broken even if the summary call fails.

## Accessibility and i18n

- All copy via Lingui; expand ÎP/AMEPIP/OUG 109/2011/BVB/CUI on first use.
- Search input has a visible `<label>`; stat cards are not links (numbers are
  text), preset entries are real `<a>`/`<Link>`.
- Numbers via `Intl.NumberFormat('ro-RO')`; snapshot date via
  `Intl.DateTimeFormat`.
- Focus-visible rings on all interactive elements; the featured rail is a
  semantic list.

## Privacy, provenance, and source-citation behavior

- Every data block carries lineage; the ribbon + footer cite AMEPIP snapshot +
  CC-BY-4.0. No person-level data on this page.
- Explainer must state the ratio/KPI caveat (Pattern D) so the framing is honest
  from the first screen.

## Acceptance checklist

- [ ] `/intreprinderi-publice` with no query renders landing mode.
- [ ] Sidebar has an "Întreprinderi publice" entry pointing here.
- [ ] Four headline stat cards render from live AMEPIP data with a visible
      snapshot date; gated stats show "în curând", never a fake zero.
- [ ] Explainer states the ratio/KPI (not absolute) caveat.
- [ ] Search transitions to listing mode on the same route; exact-CUI input can go
      straight to a profile.
- [ ] Featured rail links resolve to `/intreprinderi-publice/$cui`.
- [ ] CoverageRibbon "verifică" opens the official AMEPIP URL in a new tab.
- [ ] All strings are Lingui-wrapped; `yarn typecheck` clean.

## Non-goals

- No analytics/rankings here (that is `/intreprinderi-publice/analiza`, reserved).
- No live sanction/state-aid counts until those lanes deploy.
- No per-enterprise metrics on the featured rail (avoid implying a ranking).

## Open questions (blockers only)

- None. Headline-KPI curation does not affect this page; gated counts degrade.
