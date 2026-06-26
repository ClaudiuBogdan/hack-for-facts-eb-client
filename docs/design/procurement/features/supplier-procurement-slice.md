# Feature: Supplier procurement slice (`/companies/$cui?tab=achizitii`)

> MVP-5. Completes the money trail from the payee end: how much public money a
> company receives, from whom, in what categories — on the private-company page.

## Feature owner profile

Implementation subagent type: **frontend feature engineer** (private-company tab
system + Recharts + shadcn). Depends on `coverage-data-as-of-layer.md` and the
shared chart/record components from the authority slice.

## Summary

A "Achiziții publice" (or "Venituri din achiziții publice") tab on the company page
showing total public revenue from procurement, top public buyers, category
breakdown, first/last-seen, and cross-domain link chips (PNRR, investments,
litigation). The supplier mirror of the authority slice.

## Facts / Decisions / Assumptions

- **Fact:** Company pages are tabbed via `PRIVATE_COMPANY_TAB_IDS`
  (`src/features/private-companies/lib/tab-config.ts`) + the `tab` search param
  (`src/schemas/private-company.ts`); current tabs: summary, activity, governance,
  financials, location.
- **Fact:** Supplier data: `procurement_flow_facts_v1`, `org_edge_monthly_rollups`
  (authority×supplier), `supplier_cpv_division_monthly_rollups` (UX §5.2, §13 MVP-5).
- **Fact:** Supplier CUI↔company match rate ~97–99% (UX §5.3) — high confidence,
  but still surface `IdentityConfidenceBadge` on the rare partial.
- **Fact:** `supplier_region_filter` is blocked v1 (UX §6.4) — no supplier-territory
  view here.
- **Decision:** Add `achizitii` to `PRIVATE_COMPANY_TAB_IDS` and the `tab` param
  enum. Tab label "Achiziții publice", icon `Landmark` (lucide). Insert after
  `activity` (procurement is the company's public-sector business).
- **Decision:** "Public revenue" here = sum of procurement flows to this supplier
  CUI (contracts + DAs), currency-safe (RON; native-only flows disclosed, not
  summed). It is **procurement-sourced revenue**, labeled as such — not the
  company's total turnover (that is `financials`).
- **Assumption:** The supplier CUI equals the company CUI from the route; no extra
  identity resolution.

## Route and URL state

- **Route:** existing `/companies/$cui` (no new route file).
- **Activation:** `?tab=achizitii`.
- **New tab-local params (add to `private-company` search schema, optional):**
  - `acqYear`: number — revenue/chart horizon (default last 12 months).
  - `acqCategory`: CPV division code — drills buyers/records into a category.
- **Decision:** Default render with no params. Invalid normalized by `validateSearch`.

## Data contract and mock states

Adapter: `src/features/procurement/api/supplier-slice-api.{ts,mock,live}.ts`.

```ts
type SupplierProcurementSlice = {
  readonly supplierCui: string
  readonly summary: {
    readonly window: { from: string; to: string }
    readonly totalPublicRevenue: MoneyValue
    readonly buyersCount: number
    readonly contractsCount: number
    readonly directAcquisitionsCount: number
    readonly firstSeen: string | null
    readonly lastSeen: string | null
  }
  readonly topBuyers: TopPartyRow[]             // authorities; share where allowed
  readonly categoryBreakdown: CategoryRow[]
  readonly revenueOverTime: MonthlyPoint[]
  readonly recentRecords: ProcurementRecordSummary[]
  readonly crossDomain: {
    readonly pnrr: boolean
    readonly publicInvestments: boolean
    readonly litigation: boolean
    readonly moneyFlows: boolean
  }
  readonly gate: CapabilityGate
}
```

Mock states:

- **Healthy supplier** — full KPIs, top buyers with share, category donut.
- **Single-buyer concentration** — one buyer ≈ all revenue → a neutral
  "concentrare a veniturilor dintr-un singur cumpărător" `ReviewSignalBadge` note
  (PC-14 teaser; full analysis in concentration feature).
- **Partial amount coverage** — spend KPI partial; share suppressed.
- **Mixed currency** — RON subtotal + native-only note.
- **No procurement revenue** — `EmptyState` ("Această companie nu apare ca furnizor
  în achizițiile publice acoperite").
- **Young supplier** — first-seen recent → neutral "furnizor nou" note (PC-9/15
  teaser).
- **Stale sync** — coverage note.

## UI structure

Inside the company tab content area (matches `private-company-tab-content`):

1. **Coverage/freshness strip** — `CoverageRibbon` + `FreshnessBadge` +
   `DataStatusBadge`.
2. **KPI row** (`grid-cols-2 md:grid-cols-4`): Venituri din achiziții (window),
   # cumpărători, # contracte, # achiziții directe; plus first/last-seen line.
3. **Top buyers:** `TopBuyersChart` + table; rows → `/entities/$cui`, count, value,
   share (gated), `EvidenceLink`. Action: "Vezi toate" →
   `/achizitii/cautare?supplier_cui=…&grain=contracts&sort=value`.
4. **Category breakdown:** `CategoryBreakdown` donut (CPV division); slice click sets
   `acqCategory`.
5. **Revenue over time:** `SpendOverTime`, amount-present vs missing.
6. **Recent records:** `ProcurementRecordCard` list → detail pages + e-licitatie.
7. **Concentration teaser** (optional): single-buyer / young-supplier neutral note +
   CTA to `supplier-concentration-analysis.md` view.
8. **Cross-domain chips** (`RelatedLinksRail`, entity-360 variant): PNRR contractor,
   public investments, litigation, money flows — only chips that resolve (truthy in
   `crossDomain`), each showing the CUI-join basis.
9. **Explainer** (`Collapsible`): "Ce înseamnă venituri din achiziții publice"
   (vs cifra de afaceri), achiziție directă vs contract, valoare nativă.

## Component reuse and proposed new components

- Reuse: private-company tab system, `Card` (records), `Badge`, `Tooltip`,
  `Collapsible`, `EmptyState`, `Skeleton`, Recharts.
- Shared: `CoverageRibbon`, `FreshnessBadge`, `DataStatusBadge`, `EvidenceLink`,
  `IdentityConfidenceBadge`, `ReviewSignalBadge`, `RelatedLinksRail`,
  `SourceProvenanceDrawer`.
- New/shared: `TopBuyersChart`, `CategoryBreakdown`, `SpendOverTime`,
  `ValueWithCurrency`, `CpvLabel`, `ProcurementRecordCard`.

## Interactions

- Tab select → load slice (query keyed on `[supplierCui, acqYear, acqCategory]`).
- Donut slice → `acqCategory` drill; buyer row → entity; "Vezi toate" → filtered
  search with `from=companies`.
- Cross-domain chip → respective domain page with `from=companies` + CUI.
- Concentration teaser CTA → concentration view scoped to this supplier.

## Loading, empty, error, partial, stale states

- **Loading:** skeleton mirroring KPI + chart blocks (reuse company tab skeleton).
- **Empty:** `EmptyState` (not a supplier in covered data).
- **Error:** isolated inline retry (`handleError(e, 'procurement-supplier-slice')`),
  never blanks the company page.
- **Partial:** spend KPI/share gated; partial badges.
- **Stale:** freshness stale + suspended-sync note.

## Accessibility and i18n

- Tab keyboard-reachable + labelled; charts have text + table fallbacks.
- Status text+icon+color.
- All strings Lingui-wrapped; RO: "Venituri din achiziții publice", "Cumpărători
  principali", "Pe categorii (CPV)", "Achiziții recente", "Prima/ultima apariție".
- Concentration/young-supplier notes use neutral "semnal de verificare" language.

## Privacy, provenance, source citation

- No contact PII. Coverage + freshness exposed; rows cite sources + e-licitatie.
- Cross-domain chips show the join basis (CUI) and only render when the link
  resolves — evidence-led, never speculative.
- Revenue is labeled procurement-sourced, not company turnover (avoids over-claiming).

## Acceptance checklist

- [ ] `tab=achizitii` added to tab config + schema; tab renders the slice.
- [ ] KPIs, top buyers, category breakdown, revenue-over-time, recent records render.
- [ ] Share gated by `spend_ranked_top_n`; supplier-region absent (blocked).
- [ ] Mixed currency never summed; native disclosed.
- [ ] Cross-domain chips render only for resolving links, with join basis.
- [ ] Concentration/young-supplier teasers are neutral + linked.
- [ ] All mock states render; charts have fallbacks.
- [ ] `yarn typecheck`; strings extracted/compiled; a11y pass.

## Non-goals

- No supplier-region map (blocked v1).
- No full concentration/HHI here (lives in `supplier-concentration-analysis.md`).
- No company turnover/financials (that is the `financials` tab).
- No EUR totals (no FX).

## Open questions (blockers only)

None. Ships against served rollups + mocks; partial coverage and suspended sync are
designed-for states.
