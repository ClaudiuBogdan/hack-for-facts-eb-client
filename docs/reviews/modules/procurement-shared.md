# Src/components/shared/procurement Data Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/procurement-shared.json`

## Summary

Nine shared trust/provenance primitives (capability hook, coverage ribbon, status/freshness badges, evidence link, provenance drawer, share copy, dataset request) consumed exclusively by eight procurement feature components. Capability gating is applied correctly on search/CPV/supplier surfaces for spend downgrades and blocked filters, but page-level DataStatus is hardcoded to mock everywhere despite a schema helper for dynamic status. Provenance drawer and copy/share affordances are partially implemented: drawer opens and renders payload, but dates are unformatted and RequestDatasetAction is a non-functional stub. The module duplicates parallel trust stacks under data-trust/, statistics/, provenance/, and other domains; only CoverageRibbon and SourceProvenanceDrawer have unit tests—six exports and the capability hook have none.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| high | src/features/procurement/components/procurement-landing-page.tsx:64 | DataStatus is hardcoded to mock on every surface; procurementDataStatus() is never used | Centralize status via procurementDataStatus(gate) (extend it for stale/cadence) and isProcurementMockEnabled(); pass derived status into CoverageRibbonFromGate and MockDataStatusBadge only when mock mode is active. |
| high | src/components/shared/procurement-data/request-dataset-action.tsx:32 | RequestDatasetAction is a dead affordance with no action handler | Wire to a contact path (mailto, issue form, or shared dataset-request dialog/API) or downgrade to a link; match statistics implementation or extract a shared request dialog. |
| medium | src/components/shared/procurement-data/share-filtered-view.tsx:24 | Copy success/failure is toast-only with no screen-reader announcement | Add aria-live status region (mirror statistics) and unit tests for copy success, clipboard unavailable, and write rejection. |
| medium | src/features/procurement/components/procurement-search-page.tsx:513 | Invalid HTML: interactive button nested inside paragraph via RequestDatasetAction | Replace `<p>` with `<div>` or move RequestDatasetAction outside the text block. |
| medium | src/components/shared/procurement-data/source-provenance-drawer.tsx:79 | Provenance dates rendered as raw ISO strings, inconsistent with FreshnessBadge formatting | Reuse FreshnessBadge date formatter or shared formatIsoDate helper for retrievedAt/publishedAt; extend tests for formatted output and missing-date fallbacks. |
| medium | src/features/procurement/components/procurement-record-detail.tsx:37 | Provenance drawer payload is partially synthetic, not record-driven | Map provenance fields from the record/API bundle; surface record-specific parser notes when present and fall back to dataset defaults. |
| medium | src/components/shared/procurement-data/data-status-badge.tsx:27 | Status pill labels are English literals, not i18n-wrapped | Wrap STATUS_META labels with t`/Trans`; align visible text with CoverageStatusText semantics; add tests for each status + tooltip. |
| medium | src/components/shared/procurement-data/coverage-ribbon.tsx:96 | Stale sync semantics split across props: FreshnessBadge stale but DataStatusBadge stays mock | Unify stale/partial/mock derivation in one helper; pass coherent status into CoverageRibbon; replace cadence string matching with structured syncState. |
| medium | src/features/procurement/components/procurement-landing-page.tsx:126 | Landing page bypasses useCapabilityGate for spend downgrade signaling | Use useCapabilityGate(data.gate) and canShowSpendRanked() to drive chart metric and partial badge, matching cpv-category-page.tsx pattern. |
| low | src/components/shared/procurement-data/use-capability-gate.ts:19 | isAllowed() and meets()/coverageOf() are unused by all consumers | Add consumer checks for filter visibility/sort options tied to isAllowed, or trim unused API and document which classes pages must enforce. |
| low | src/components/shared/procurement-data/index.ts:2 | CoverageStatusText exported but dead code | Use inside CoverageRibbon summary or remove export until wired. |
| low | src/components/shared/procurement-data/source-provenance-drawer.tsx:18 | trigger={null} is misleading; nullish coalescing falls back to default button | Use explicit optional trigger or a showDefaultTrigger boolean; document intended footer placement. |
| low | src/components/shared/procurement-data/coverage-ribbon.tsx:126 | Collapsible 'Detalii' control lacks explicit accessible name tying it to coverage panel | Add aria-expanded (if not forwarded), aria-controls pointing to details region id, and aria-label like 'Detalii acoperire date'. |
| info | src/components/shared/procurement-data/evidence-link.tsx:31 | Procurement EvidenceLink is a direct external anchor; data-trust EvidenceLink opens provenance drawer | Rename to ExternalEvidenceLink or document domain split in index; avoid cross-import confusion. |
| info | src/components/shared/procurement-data | Broad duplication with other shared trust modules across the repo | Extract domain-agnostic trust primitives (status enum UI, copy-link, collapsible coverage) with schema adapters per feature; consolidate ShareFilteredView and RequestDatasetAction first. |
| info | src/components/shared/procurement-data | Missing unit tests for six of eight exported components and the capability hook | Add focused tests: canShowSpendRanked matrix; share clipboard + aria-live; request action behavior; DataStatusBadge tooltip keyboard focus; EvidenceLink new-tab announcement; FreshnessBadge stale/cadence; provenance drawer empty URL and empty parserNotes. |
| info | src/features/procurement/components/procurement-search-page.tsx:250 | Capability gating correctly applied for value sort and blocked supplier-region filter | Preserve this pattern when wiring live API; add test that value sort options are disabled when amount coverage is sub-threshold. |
| info | src/features/procurement/components/cpv-category-page.tsx:52 | CPV and supplier slices apply capability gate consistently for spend downgrades | Extract shared useSpendMetricState(capability) hook to align landing page and reduce duplication. |

## Detailed Evidence

### high: DataStatus is hardcoded to mock on every surface; procurementDataStatus() is never used

- Location: `src/features/procurement/components/procurement-landing-page.tsx:64`
- Evidence: All consumers pass status="mock" to CoverageRibbonFromGate (e.g. landing line 64, search line 217, detail line 89). schemas/procurement.ts exports procurementDataStatus(gate) (lines 539–551) to derive live/partial/unverified from gate coverage, but grep shows zero call sites. mock-mode.ts documents mock-first behavior, yet suspended cadence and sub-threshold amount never elevate ribbon badge beyond Mock.
- Recommendation: Centralize status via procurementDataStatus(gate) (extend it for stale/cadence) and isProcurementMockEnabled(); pass derived status into CoverageRibbonFromGate and MockDataStatusBadge only when mock mode is active.
- Residual risk: Live API cutover will require editing every consumer manually; users may see Mock + stale cadence simultaneously, understating sync suspension.

### high: RequestDatasetAction is a dead affordance with no action handler

- Location: `src/components/shared/procurement-data/request-dataset-action.tsx:32`
- Evidence: Button (lines 32–40) has no onClick, href, or Dialog; tooltip text claims it opens a channel but nothing happens on click/Enter. Contrasts with src/features/statistics/components/request-dataset-action.tsx which opens a Dialog and submits via useDatasetRequest (tested in request-dataset-action.test.tsx).
- Recommendation: Wire to a contact path (mailto, issue form, or shared dataset-request dialog/API) or downgrade to a link; match statistics implementation or extract a shared request dialog.
- Duplicate of: `src/features/statistics/components/request-dataset-action.tsx`
- Residual risk: WCAG 4.1.2 violation (control with no operation); users believe they reported missing data when they have not.

### medium: Copy success/failure is toast-only with no screen-reader announcement

- Location: `src/components/shared/procurement-data/share-filtered-view.tsx:24`
- Evidence: Uses toast.success/error (lines 25–27) only. Statistics ShareFilteredView (share-filtered-view.tsx lines 49–51) adds sr-only role="status" aria-live="polite" and has three clipboard tests; procurement variant has zero tests.
- Recommendation: Add aria-live status region (mirror statistics) and unit tests for copy success, clipboard unavailable, and write rejection.
- Duplicate of: `src/features/statistics/components/share-filtered-view.tsx`
- Residual risk: Assistive-tech users get no confirmation that the investigative URL was copied.

### medium: Invalid HTML: interactive button nested inside paragraph via RequestDatasetAction

- Location: `src/features/procurement/components/procurement-search-page.tsx:513`
- Evidence: FilterRail renders `<p className="mt-2 ...">...<RequestDatasetAction /></p>` (lines 513–517). RequestDatasetAction renders a Button inside TooltipTrigger, producing `<p><button>` which is invalid and can cause inconsistent focus/DOM behavior.
- Recommendation: Replace `<p>` with `<div>` or move RequestDatasetAction outside the text block.
- Residual risk: Browser a11y tree and keyboard navigation may behave unpredictably around the blocked-filter notice.

### medium: Provenance dates rendered as raw ISO strings, inconsistent with FreshnessBadge formatting

- Location: `src/components/shared/procurement-data/source-provenance-drawer.tsx:79`
- Evidence: DateRow displays value ?? indisponibil without formatting (lines 120–125). FreshnessBadge uses toLocaleDateString('ro-RO') (freshness-badge.tsx lines 15–23). Test fixture uses ISO timestamps (source-provenance-drawer.test.tsx lines 13–14) and expects them verbatim.
- Recommendation: Reuse FreshnessBadge date formatter or shared formatIsoDate helper for retrievedAt/publishedAt; extend tests for formatted output and missing-date fallbacks.
- Duplicate of: `src/components/data-trust/freshness-badge.tsx`
- Residual risk: Investigators see machine timestamps in the trust drawer while the ribbon shows localized dates.

### medium: Provenance drawer payload is partially synthetic, not record-driven

- Location: `src/features/procurement/components/procurement-record-detail.tsx:37`
- Evidence: provenanceInfo() hardcodes scraperRef 'public-contracts-seap' and static parserNotes array (lines 43–50) regardless of record.provenance content; only sourceUrl/retrievedAt/publishedAt come from the record.
- Recommendation: Map provenance fields from the record/API bundle; surface record-specific parser notes when present and fall back to dataset defaults.
- Residual risk: Drawer over-claims scraper/parser context on records whose provenance differs or is absent.

### medium: Status pill labels are English literals, not i18n-wrapped

- Location: `src/components/shared/procurement-data/data-status-badge.tsx:27`
- Evidence: STATUS_META uses label: 'Live', 'Mock', 'Parțial', etc. (lines 27–32). CoverageStatusText (lines 80–94) uses Trans for Romanian descriptions but is exported and unused. ProcurementSearchPage test asserts visible text 'Mock' (procurement-search-page.test.tsx line 81).
- Recommendation: Wrap STATUS_META labels with t`/Trans`; align visible text with CoverageStatusText semantics; add tests for each status + tooltip.
- Duplicate of: `src/components/data-trust/data-status-badge.tsx`
- Residual risk: Romanian UI surfaces English trust labels; inconsistent with project i18n rules.

### medium: Stale sync semantics split across props: FreshnessBadge stale but DataStatusBadge stays mock

- Location: `src/components/shared/procurement-data/coverage-ribbon.tsx:96`
- Evidence: FreshnessBadge stale when status === 'stale' OR cadence?.includes('suspendat') (line 96). All consumers pass status="mock" while mock fixtures set cadence: 'zilnic (suspendat)' (fixtures.ts line 60). Ribbon shows Mock badge + 'sincronizare suspendată' simultaneously (coverage-ribbon.test.tsx lines 21–22). procurementDataStatus does not return stale.
- Recommendation: Unify stale/partial/mock derivation in one helper; pass coherent status into CoverageRibbon; replace cadence string matching with structured syncState.
- Duplicate of: `src/components/data-trust/coverage-ribbon.tsx`
- Residual risk: Trust semantics are ambiguous: mock demo data vs genuinely suspended production sync.

### medium: Landing page bypasses useCapabilityGate for spend downgrade signaling

- Location: `src/features/procurement/components/procurement-landing-page.tsx:126`
- Evidence: PartyRankingChart hardcodes metric="count" and DataStatusBadge status="partial" (lines 126–128) without calling useCapabilityGate(data.gate). CPV/supplier/search pages derive canSpend from the hook. Mock gate has amount meetsThreshold: false (fixtures.ts lines 54–55).
- Recommendation: Use useCapabilityGate(data.gate) and canShowSpendRanked() to drive chart metric and partial badge, matching cpv-category-page.tsx pattern.
- Residual risk: Landing partial/spend semantics drift if gate payload changes independently of hardcoded assumptions.

### low: isAllowed() and meets()/coverageOf() are unused by all consumers

- Location: `src/components/shared/procurement-data/use-capability-gate.ts:19`
- Evidence: Grep shows consumers only call isBlocked, canShowSpendRanked (search, cpv, supplier). isAllowed is never referenced outside the hook. allowed answer classes like buyer_region_filter and cpv_category_filter have no UI enforcement.
- Recommendation: Add consumer checks for filter visibility/sort options tied to isAllowed, or trim unused API and document which classes pages must enforce.
- Residual risk: Gate payload may advertise capabilities the UI still exposes without gating.

### low: CoverageStatusText exported but dead code

- Location: `src/components/shared/procurement-data/index.ts:2`
- Evidence: Exported from index.ts line 2; grep shows no imports outside data-status-badge.tsx definition.
- Recommendation: Use inside CoverageRibbon summary or remove export until wired.
- Residual risk: Maintainers assume status copy is centralized when pages duplicate tooltip strings instead.

### low: trigger={null} is misleading; nullish coalescing falls back to default button

- Location: `src/components/shared/procurement-data/source-provenance-drawer.tsx:18`
- Evidence: Props type allows React.ReactNode; procurement-record-detail.tsx passes trigger={null} (line 140). Implementation uses trigger ?? defaultButton (line 32), so null renders default 'Proveniență' button. Test also passes trigger={null} (source-provenance-drawer.test.tsx line 20).
- Recommendation: Use explicit optional trigger or a showDefaultTrigger boolean; document intended footer placement.
- Residual risk: Callers cannot suppress the default trigger without passing a custom node.

### low: Collapsible 'Detalii' control lacks explicit accessible name tying it to coverage panel

- Location: `src/components/shared/procurement-data/coverage-ribbon.tsx:126`
- Evidence: CollapsibleTrigger button label is only 'Detalii' (line 127) with no aria-controls/aria-labelledby link to expanded content. Radix may set aria-expanded, but the relationship to 'Acoperire parțială' summary is implicit.
- Recommendation: Add aria-expanded (if not forwarded), aria-controls pointing to details region id, and aria-label like 'Detalii acoperire date'.
- Residual risk: Screen-reader users may not understand what expands when multiple collapsibles exist on a page.

### info: Procurement EvidenceLink is a direct external anchor; data-trust EvidenceLink opens provenance drawer

- Location: `src/components/shared/procurement-data/evidence-link.tsx:31`
- Evidence: Procurement variant is `<a href target=_blank>` with sr-only new-tab hint (lines 35–48). data-trust/evidence-link.tsx opens SourceProvenanceDrawer via useProvenance context. Same export name, different contract.
- Recommendation: Rename to ExternalEvidenceLink or document domain split in index; avoid cross-import confusion.
- Duplicate of: `src/components/data-trust/evidence-link.tsx`
- Residual risk: Future refactor may wire wrong EvidenceLink and break trust UX.

### info: Broad duplication with other shared trust modules across the repo

- Location: `src/components/shared/procurement-data`
- Evidence: Parallel stacks: src/components/data-trust/ (CoverageRibbon, DataStatusBadge, FreshnessBadge, SourceProvenanceDrawer, EvidenceLink), src/features/statistics/components/ (same names + tests for share/request), src/components/provenance/source-provenance.tsx (NGO drawer/badges), src/features/justice/components/data-trust.tsx, src/features/legal/components/legal-trust.tsx, src/features/public-investments/components/. Procurement module comment in coverage-ribbon.tsx line 61 references PnrrDataQualityBanner pattern.
- Recommendation: Extract domain-agnostic trust primitives (status enum UI, copy-link, collapsible coverage) with schema adapters per feature; consolidate ShareFilteredView and RequestDatasetAction first.
- Duplicate of: `src/components/data-trust/index.ts`
- Residual risk: Trust UX and a11y fixes must be repeated N times; drift already visible (statistics share has aria-live, procurement does not).

### info: Missing unit tests for six of eight exported components and the capability hook

- Location: `src/components/shared/procurement-data`
- Evidence: Tests exist only for source-provenance-drawer.test.tsx (1 case) and coverage-ribbon.test.tsx (1 case). No tests for use-capability-gate.ts, share-filtered-view.tsx, request-dataset-action.tsx, evidence-link.tsx, freshness-badge.tsx, data-status-badge.tsx. Integration: procurement-search-page.test.tsx covers ribbon expand and blocked-filter copy (lines 75–96) but not ShareFilteredView clipboard or provenance drawer on detail pages.
- Recommendation: Add focused tests: canShowSpendRanked matrix; share clipboard + aria-live; request action behavior; DataStatusBadge tooltip keyboard focus; EvidenceLink new-tab announcement; FreshnessBadge stale/cadence; provenance drawer empty URL and empty parserNotes.
- Duplicate of: `src/features/statistics/components/share-filtered-view.test.tsx`
- Residual risk: Regressions in trust gating and copy/share flows ship unnoticed until manual QA.

### info: Capability gating correctly applied for value sort and blocked supplier-region filter

- Location: `src/features/procurement/components/procurement-search-page.tsx:250`
- Evidence: canShowSpendRanked() disables value_desc/value_asc SelectItems (lines 251–262). isBlocked('supplier_region_filter') shows v1 notice + RequestDatasetAction (lines 512–517). Fallback gate while loading blocks both dimensions (lines 119–127). Test asserts sub-prag sort suffix and blocked-filter message (procurement-search-page.test.tsx lines 84–96).
- Recommendation: Preserve this pattern when wiring live API; add test that value sort options are disabled when amount coverage is sub-threshold.
- Residual risk: Low if gate shape stable; value sort could re-enable incorrectly if canShowSpendRanked logic changes untested.

### info: CPV and supplier slices apply capability gate consistently for spend downgrades

- Location: `src/features/procurement/components/cpv-category-page.tsx:52`
- Evidence: useCapabilityGate + canShowSpendRanked drives metric toggle disabled state (cpv lines 120–127), MetricCard partial status (lines 94–95), PartyRankingChart metric, and SpendOverTime metric. Supplier slice mirrors pattern (procurement-supplier-slice.tsx lines 56–100).
- Recommendation: Extract shared useSpendMetricState(capability) hook to align landing page and reduce duplication.
- Residual risk: Minor inconsistency until landing page adopts the same hook.

## Residual Risk

Module is mock-first and functionally adequate for demo surfaces, but trust semantics (mock vs partial vs stale), dataset-request, and copy feedback are not production-grade. Parallel trust implementations elsewhere increase consolidation cost. Live cutover will fail silently on status if hardcoded mock badges are not replaced. No automated coverage guards clipboard, capability matrix, or non-functional RequestDatasetAction.
