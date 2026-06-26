# Public Enterprises Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/public-enterprises.json`

## Summary

Mock-first AMEPIP public-enterprise surface is well structured (Zod schemas, fixture lineage, gated supplemental tabs, solid component tests) but discovery gating is inconsistent with route/API behavior, entity deep-links disagree across modules, search CUI handling is stricter than route normalization, several supplemental/indicator views lack empty states, and mock/live API switching is untested compared to sibling features.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| high | src/routes/intreprinderi-publice/$cui.tsx:33 | Profile route loader is not mock-gated; deep links work when sidebar nav is hidden. | Mirror public-investments: route beforeLoad guard when mock is disabled, or return a blocked/empty loader result and render a dedicated 'live not connected' page instead of throwing in the loader. |
| high | src/features/entity-search/lib/entity-search-routing.ts:46 | Global entity search routes public_enterprise to /entities/$cui, diverging from the dedicated public-enterprise surface. | Route public_enterprise hits to buildPublicEnterprisePath(cui) (with CUI normalization) when isPublicEnterpriseMockEnabled(), or always once the surface is live; update tests and experimental-search.spec.ts comment. |
| medium | src/features/public-enterprises/components/public-enterprises-pages.tsx:397 | Landing search requires digit-only CUI input before profile navigation, unlike route normalization. | Navigate to profile when normalizePublicEnterpriseCui(trimmed) is non-null (same rule as $cui beforeLoad redirect). Add a unit test for prefixed CUIs. |
| medium | src/components/sidebar/nav-main.tsx:78 | Sidebar discovery is mock-gated but routes are always registered and reachable. | Align nav gating with route access (both gated, or both reachable with blocked UI). Prefer a single isPublicEnterpriseSurfaceEnabled() used by nav, routes, and API. |
| medium | src/features/public-enterprises/lib/mock-mode.ts:18 | Mock mode ORs six lane dataset IDs; any one enabled switches the entire API to fixtures. | Gate core reads on soe-amepip only; treat supplemental lanes separately via profile.lanes or per-dataset flags. Document env var expectations. |
| medium | src/features/public-enterprises/api/public-enterprise-api.live.ts:20 | Live API path throws hard errors instead of a typed blocked response. | Follow public-investments-api blocked-result pattern so UI can render honest empty/blocked states without route-level failures. |
| medium | src/lib/entity-navigation.ts:19 | buildPublicEnterprisePath trims but does not normalize CUI before building URLs. | Normalize to digit-only canonical form before encodeURIComponent, or document that callers must pass canonical CUIs. |
| medium | src/features/public-enterprises/components/public-enterprises-pages.tsx:1011 | Tab visibility and status ignore profile.lanes availability metadata. | Drive tab visibility and badges from profile.lanes and summary fields (authoritySummary, bvbSummary, etc.) so future API partial availability renders correctly. |
| medium | src/features/public-enterprises/components/public-enterprises-pages.tsx:496 | Featured enterprises section has no empty state when search returns zero hits. | Add EmptyState or hide the section when featured query returns no rows; cover in component tests. |
| medium | src/features/public-enterprises/components/public-enterprises-pages.tsx:1368 | Indicator matrix and definition list lack empty states for zero-row selections. | When selectedRows.length === 0, show EmptyState in table/view modes and skip or collapse the definition list. |
| medium | src/features/public-enterprises/components/public-enterprises-pages.tsx:743 | Pagination previous/next links use disabled on Button-asChild Link, which does not block navigation. | Render span/Button without Link when disabled, or omit href and set aria-disabled tabIndex=-1 on the control. |
| medium | src/features/public-enterprises/components/public-enterprises-pages.tsx:1175 | KPI toggle chips lack aria-pressed and an accessible group label. | Add aria-pressed={selected} and a fieldset/legend or aria-label for the KPI filter group. |
| medium | src/features/public-enterprises/components/public-enterprises-pages.tsx:1212 | Indicator filter selects are not programmatically associated with their labels. | Add id on each select and htmlFor on label; verify with axe or testing-library getByLabelText in both RO/EN. |
| medium | src/routes/intreprinderi-publice/$cui.tsx:52 | Profile document title is partially un-internationalized. | Wrap title in t macro with placeholders for name/CUI so EN catalog receives a translatable string. |
| low | src/features/public-enterprises/components/public-enterprises-pages.tsx:547 | Listing sort key displayed as raw enum value. | Map publicEnterpriseSortSchema values to t`-wrapped labels. |
| low | src/features/public-enterprises/components/public-enterprises-pages.tsx:839 | ONRC link status shown as raw enum string in profile header. | Reuse getLinkStatusLabel() (or i18n equivalent) for identity.onrcLinkStatus and anafLinkStatus in profile views. |
| low | src/features/public-enterprises/components/public-enterprises-pages.tsx:1609 | Provenance drawer exposes raw lineage.mode value. | Map sourceLineageModeSchema values to localized labels consistent with DataStatusBadge. |
| low | src/features/public-enterprises/mocks/fixtures.ts:802 | Mock profile lookup is exact-key only; no CUI normalization at data layer. | Normalize CUI in mock getters for defense in depth (loader already normalizes). |
| low | src/features/public-enterprises/components/public-enterprises-pages.tsx:1312 | Indicator chart has no textual alternative for screen readers. | Add visually hidden table summary or aria-describedby linking to the matrix table when view includes chart. |
| low | src/features/public-enterprises/api/public-enterprise-api.ts:25 | No unit tests for mock/live API gating (regression gap vs sibling features). | Add vitest suite mocking isPublicEnterpriseMockEnabled to assert mock vs live selection and live throw/blocked behavior. |
| low | src/routes/intreprinderi-publice/$cui.tsx:20 | No tests for beforeLoad canonical CUI redirect, loader notFound, or head meta. | Add route unit tests for redirect({ replace: true }) on RO-prefixed params, notFound on invalid CUI, and head titles. |
| low | src/features/public-enterprises/components/public-enterprises-pages.test.tsx:160 | Component tests omit CUI normalization, tab keyboard, pagination, and featured-empty cases. | Extend existing suite for normalization edge cases, tab roving focus, and empty featured/indicators table paths. |
| info | src/schemas/public-enterprise.ts:227 | Schema and mock fixtures are strong: explicit dataStatus, lineage.mode, lane availability, and profile search parsing. | Keep this contract as the integration boundary when wiring live API; wire UI tab states to lanes next. |
| info | src/features/public-enterprises/lib/normalize-public-enterprise-cui.ts:17 | CUI normalization module is well-specified and tested. | Reuse normalizePublicEnterpriseCui consistently in search form, entity-navigation, and mock getters. |

## Detailed Evidence

### high: Profile route loader is not mock-gated; deep links work when sidebar nav is hidden.

- Location: `src/routes/intreprinderi-publice/$cui.tsx:33`
- Evidence: loader calls fetchPublicEnterpriseProfile(cui) with no mock check. When mock is off, public-enterprise-api.live.ts calls assertLiveApiAvailable('soe-amepip') and throws before returning data.
- Recommendation: Mirror public-investments: route beforeLoad guard when mock is disabled, or return a blocked/empty loader result and render a dedicated 'live not connected' page instead of throwing in the loader.
- Residual risk: Users/bookmarks hitting /intreprinderi-publice/$cui without mock env vars get a route error instead of a recoverable empty/blocked state.

### high: Global entity search routes public_enterprise to /entities/$cui, diverging from the dedicated public-enterprise surface.

- Location: `src/features/entity-search/lib/entity-search-routing.ts:46`
- Evidence: CUI_SPINE_ROUTES.public_enterprise maps to `/entities/${cui}`. entity-navigation.ts routes entityType public_enterprise to `/intreprinderi-publice/${cui}`. entity-search-routing.test.ts asserts the /entities path.
- Recommendation: Route public_enterprise hits to buildPublicEnterprisePath(cui) (with CUI normalization) when isPublicEnterpriseMockEnabled(), or always once the surface is live; update tests and experimental-search.spec.ts comment.
- Residual risk: Search and QuickEntityAccess/preferred-entity flows send users to different profiles for the same CUI.

### medium: Landing search requires digit-only CUI input before profile navigation, unlike route normalization.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.tsx:397`
- Evidence: submit() navigates to profile only when normalizePublicEnterpriseCui(trimmed) succeeds AND /^\d{1,13}$/.test(trimmed). Inputs like RO10020943 or ro-10020943 normalize validly but fail the regex and fall through to listing search { q: trimmed }.
- Recommendation: Navigate to profile when normalizePublicEnterpriseCui(trimmed) is non-null (same rule as $cui beforeLoad redirect). Add a unit test for prefixed CUIs.
- Residual risk: Common RO-prefixed CUI searches never reach the profile redirect path users expect.

### medium: Sidebar discovery is mock-gated but routes are always registered and reachable.

- Location: `src/components/sidebar/nav-main.tsx:78`
- Evidence: mainItems spreads Întreprinderi publice only when isPublicEnterpriseMockEnabled(). Route tree always includes /intreprinderi-publice/ and /intreprinderi-publice/$cui with no equivalent guard.
- Recommendation: Align nav gating with route access (both gated, or both reachable with blocked UI). Prefer a single isPublicEnterpriseSurfaceEnabled() used by nav, routes, and API.
- Residual risk: Feature appears unavailable in nav but still fails or partially loads via URL.

### medium: Mock mode ORs six lane dataset IDs; any one enabled switches the entire API to fixtures.

- Location: `src/features/public-enterprises/lib/mock-mode.ts:18`
- Evidence: isPublicEnterpriseMockEnabled() returns PUBLIC_ENTERPRISE_DATASET_IDS.some((id) => isMockDataEnabled(id)). Core lane soe-amepip is only one of six.
- Recommendation: Gate core reads on soe-amepip only; treat supplemental lanes separately via profile.lanes or per-dataset flags. Document env var expectations.
- Residual risk: VITE_MOCK_DATASETS=soe-sanctions alone serves full AMEPIP fixtures, overstating mock scope.

### medium: Live API path throws hard errors instead of a typed blocked response.

- Location: `src/features/public-enterprises/api/public-enterprise-api.live.ts:20`
- Evidence: All fetch*Live functions call assertPublicEnterpriseLiveApiAvailable() then throw 'Unreachable: public enterprise live API is not connected.'
- Recommendation: Follow public-investments-api blocked-result pattern so UI can render honest empty/blocked states without route-level failures.
- Residual risk: TanStack Router loader/query errors surface as generic error boundaries rather than in-module messaging.

### medium: buildPublicEnterprisePath trims but does not normalize CUI before building URLs.

- Location: `src/lib/entity-navigation.ts:19`
- Evidence: return `/intreprinderi-publice/${encodeURIComponent(cui.trim())}` — no normalizePublicEnterpriseCui call.
- Recommendation: Normalize to digit-only canonical form before encodeURIComponent, or document that callers must pass canonical CUIs.
- Residual risk: Preferred-entity links from non-canonical CUIs rely on beforeLoad redirect or 404 instead of emitting canonical URLs.

### medium: Tab visibility and status ignore profile.lanes availability metadata.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.tsx:1011`
- Evidence: getVisibleTabs() only filters bursa when identity.ticker is null. getTabStatus() hardcodes 'gated' for autoritate/guvernanta/sanctiuni/ajutor-de-stat instead of reading profile.lanes[].
- Recommendation: Drive tab visibility and badges from profile.lanes and summary fields (authoritySummary, bvbSummary, etc.) so future API partial availability renders correctly.
- Residual risk: When lanes go live incrementally, UI will still show static gated placeholders despite schema support.

### medium: Featured enterprises section has no empty state when search returns zero hits.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.tsx:496`
- Evidence: FeaturedEnterprises renders hits.map inside a panel with no guard for hits.length === 0 and no EmptyState fallback.
- Recommendation: Add EmptyState or hide the section when featured query returns no rows; cover in component tests.
- Residual risk: Landing shows an empty bordered list during loading failures or empty fixtures without explanation.

### medium: Indicator matrix and definition list lack empty states for zero-row selections.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.tsx:1368`
- Evidence: IndicatorMatrixTable renders header row even when years/indicators arrays are empty. IndicatorDefinitionList always renders heading with potentially empty dl. Only chart view uses EmptyState at line 1268.
- Recommendation: When selectedRows.length === 0, show EmptyState in table/view modes and skip or collapse the definition list.
- Residual risk: Aggressive KPI/year/sheet filters produce blank panels that look like render bugs.

### medium: Pagination previous/next links use disabled on Button-asChild Link, which does not block navigation.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.tsx:743`
- Evidence: Button asChild variant="outline" disabled={!canGoPrevious} wraps Link to listing search with page-1. Disabled does not propagate reliably to anchor children.
- Recommendation: Render span/Button without Link when disabled, or omit href and set aria-disabled tabIndex=-1 on the control.
- Residual risk: Keyboard and assistive-tech users can activate 'disabled' page controls.

### medium: KPI toggle chips lack aria-pressed and an accessible group label.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.tsx:1175`
- Evidence: Dictionary KPI buttons toggle selection via onClick/className only; no aria-pressed, aria-checked, or role=group wrapper.
- Recommendation: Add aria-pressed={selected} and a fieldset/legend or aria-label for the KPI filter group.
- Residual risk: Screen-reader users cannot tell which KPIs are active.

### medium: Indicator filter selects are not programmatically associated with their labels.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.tsx:1212`
- Evidence: label wraps span + select for 'Foaie sursă' and 'Vizualizare' without htmlFor/id pairs. Tests locate by getByLabelText, but native label association is incomplete.
- Recommendation: Add id on each select and htmlFor on label; verify with axe or testing-library getByLabelText in both RO/EN.
- Residual risk: Assistive tech may not announce control purpose consistently across browsers.

### medium: Profile document title is partially un-internationalized.

- Location: `src/routes/intreprinderi-publice/$cui.tsx:52`
- Evidence: head meta title uses template string `${data.profile.identity.legalName} (CUI ${data.profile.identity.cui}) — Întreprindere publică` with only the suffix conceptually localized via surrounding t usage on not-found branch only.
- Recommendation: Wrap title in t macro with placeholders for name/CUI so EN catalog receives a translatable string.
- Residual risk: English locale keeps Romanian title fragment and non-extracted dynamic title pattern.

### low: Listing sort key displayed as raw enum value.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.tsx:547`
- Evidence: ListingHeader renders `{search.sort ?? 'legalName'}` without translating sort options.
- Recommendation: Map publicEnterpriseSortSchema values to t`-wrapped labels.
- Residual risk: English/Romanian UX shows internal sort keys like legalName/cui.

### low: ONRC link status shown as raw enum string in profile header.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.tsx:839`
- Evidence: MetaItem term Legătură ONRC uses profile.identity.onrcLinkStatus directly; listing rows use getLinkStatusLabel().
- Recommendation: Reuse getLinkStatusLabel() (or i18n equivalent) for identity.onrcLinkStatus and anafLinkStatus in profile views.
- Residual risk: Profile shows English enum tokens (linked/unlinked) in a Romanian UI.

### low: Provenance drawer exposes raw lineage.mode value.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.tsx:1609`
- Evidence: ProvenanceItem term Mod detail={lineage.mode} renders live/sample/mock without translation.
- Recommendation: Map sourceLineageModeSchema values to localized labels consistent with DataStatusBadge.
- Residual risk: Evidence panel leaks internal mode tokens to end users.

### low: Mock profile lookup is exact-key only; no CUI normalization at data layer.

- Location: `src/features/public-enterprises/mocks/fixtures.ts:802`
- Evidence: getMockPublicEnterpriseProfile(cui) returns mockProfilesByCui[cui] ?? null without normalizePublicEnterpriseCui.
- Recommendation: Normalize CUI in mock getters for defense in depth (loader already normalizes).
- Residual risk: Low today because route loader normalizes first; future client-only callers could miss profiles.

### low: Indicator chart has no textual alternative for screen readers.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.tsx:1312`
- Evidence: IndicatorChart uses Recharts LineChart with Tooltip only; no sr-only summary of series/years.
- Recommendation: Add visually hidden table summary or aria-describedby linking to the matrix table when view includes chart.
- Residual risk: Chart-only view mode (view=chart) excludes non-visual users from indicator trends.

### low: No unit tests for mock/live API gating (regression gap vs sibling features).

- Location: `src/features/public-enterprises/api/public-enterprise-api.ts:25`
- Evidence: public-investments-api.test.ts covers mock-off blocked behavior; public-enterprises has no public-enterprise-api.test.ts and mock-mode.ts is untested.
- Recommendation: Add vitest suite mocking isPublicEnterpriseMockEnabled to assert mock vs live selection and live throw/blocked behavior.
- Residual risk: Env gating regressions ship unnoticed.

### low: No tests for beforeLoad canonical CUI redirect, loader notFound, or head meta.

- Location: `src/routes/intreprinderi-publice/$cui.tsx:20`
- Evidence: Only -$cui.lazy.test.tsx covers lazy wrapper skeleton/profile handoff. No -$cui.test.ts equivalent to entities.$cui route tests.
- Recommendation: Add route unit tests for redirect({ replace: true }) on RO-prefixed params, notFound on invalid CUI, and head titles.
- Residual risk: CUI routing contract changes break silently.

### low: Component tests omit CUI normalization, tab keyboard, pagination, and featured-empty cases.

- Location: `src/features/public-enterprises/components/public-enterprises-pages.test.tsx:160`
- Evidence: Search test only covers exact digit CUI 10020943 and text query hidroelectrica. No RO-prefix search, ArrowLeft/Right tab tests, pagination disabled behavior, or featured section empty rendering.
- Recommendation: Extend existing suite for normalization edge cases, tab roving focus, and empty featured/indicators table paths.
- Residual risk: Known UX gaps above lack regression coverage.

### info: Schema and mock fixtures are strong: explicit dataStatus, lineage.mode, lane availability, and profile search parsing.

- Location: `src/schemas/public-enterprise.ts:227`
- Evidence: publicEnterpriseProfileSchema includes lanes, supplemental summaries, discriminated indicator rows; parsePublicEnterpriseSearch/ProfileSearch use catch-safe transforms; fixtures.test.ts validates mock shapes.
- Recommendation: Keep this contract as the integration boundary when wiring live API; wire UI tab states to lanes next.
- Residual risk: None — positive baseline for mock-first honesty.

### info: CUI normalization module is well-specified and tested.

- Location: `src/features/public-enterprises/lib/normalize-public-enterprise-cui.ts:17`
- Evidence: normalize/isCanonical/isNonCanonical helpers with digit strip, 1–13 length, all-zero rejection; normalize-public-enterprise-cui.test.ts covers redirect vs 404 cases.
- Recommendation: Reuse normalizePublicEnterpriseCui consistently in search form, entity-navigation, and mock getters.
- Residual risk: Inconsistent call sites remain the main risk (see search form finding).

