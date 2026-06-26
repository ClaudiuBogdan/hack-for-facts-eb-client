# Transparenta UI Dev Integration Review

Generated from Cursor Composer 2.5 Fast commit reviews and module reviews after merging the Transparenta domain UI work into `dev`.

## Review Inputs

- Commit-scoped reports: `/tmp/codex-orchestrator/transparenta-ui-dev-reviews/reports`
- Module-scoped reports: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports`
- Per-module Markdown reports: `docs/reviews/modules/`
- Local validation before review: `yarn typecheck`, `yarn router:generate`, `yarn i18n:extract`, `yarn i18n:compile`, `yarn run check`

## Finding Counts

| Set | Critical | Blocker | High | Medium | Low | Info | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Raw findings | 2 | 3 | 47 | 161 | 117 | 53 | 383 |
| Deduped triage | 2 | 3 | 47 | 161 | 117 | 53 | 383 |

## Report Parse Notes

- elections.json: inner JSON parse failed: Bad escaped character in JSON at position 6833 (line 83 column 43)

## Fix Queues

### P0 Shared Trust, Provenance, and Handoff Contract

- **blocker** docs/design/procurement/features/coverage-data-as-of-layer.md:5: Three domains each claim to own and build first the same Wave 0 shared stack (CoverageRibbon, SourceProvenanceDrawer, EvidenceLink, etc.) with no single canonical owner. _(source: commit/docs.json)_
- **blocker** docs/design/procurement/features/coverage-data-as-of-layer.md:95: EvidenceLink is specified with incompatible APIs under the same shared component name. _(source: commit/docs.json)_
- **blocker** docs/design/public-investments/features/evidence-viewer.md:49: Provenance drawer deep-link URL contract is contradictory across foundation, PI, and elections. _(source: commit/docs.json)_
- **critical** src/components/data-trust/evidence-link.tsx:23: `EvidenceLink` name collision with opposite behavior (drawer trigger vs external anchor) _(source: module/shared-trust-identity-provenance.json)_
- **critical** src/components/data-trust/identity-confidence-badge.tsx:8: Four incompatible `IdentityConfidenceBadge` components share one name _(source: module/shared-trust-identity-provenance.json)_
- **high** docs/ux-research/README.md:102: ux-research Wave 0 component naming diverges from design foundation standard names. _(source: commit/docs.json)_
- **high** src/components/data-trust/source-provenance-drawer.tsx:120: Six+ `SourceProvenanceDrawer` implementations with incompatible control models _(source: module/shared-trust-identity-provenance.json)_
- **medium** src/features/ngos/components/ngo-profile-page.tsx:182: Profile header IdentityConfidenceBadge hardcodes `reviewStatus: 'accepted'` regardless of evidence state. _(source: commit/ngos.json)_
- **medium** src/features/public-investments/components/SourceProvenanceDrawer.tsx:29: Evidence fetch omits objective context _(source: commit/public-investments.json)_
- **medium** src/features/public-investments/components/SourceProvenanceDrawer.tsx:29: Evidence drawer does not pass objective context into the evidence query _(source: module/public-investments.json)_
- **medium** src/components/data-trust/coverage-ribbon.tsx:15: `CoverageRibbon` is not one component but three unrelated summaries _(source: module/shared-trust-identity-provenance.json)_
- **low** src/schemas/legal.ts:66: coverage.lane enum (portal | mo) is modeled but not displayed in CoverageRibbon UI. _(source: commit/legal.json)_
- **low** src/features/public-investments/components/SourceProvenanceDrawer.tsx:76: Invalid description-list markup _(source: commit/public-investments.json)_
- **low** src/features/elections/components/election-shared.tsx:39: No tests exercise EvidenceLink / provenance drawer integration in elections UI. _(source: module/elections.json)_
- **low** src/features/justice/components/data-trust.tsx:172: IdentityConfidenceBadge exposes raw tier codes alongside translated labels _(source: module/justice.json)_
- **info** src/components/shared/procurement-data/evidence-link.tsx:31: Procurement EvidenceLink is a direct external anchor; data-trust EvidenceLink opens provenance drawer _(source: module/procurement-shared.json)_

### P1 Privacy and Telemetry Safety

- **high** src/lib/analytics.ts:230: Justice case identifiers in URL path segments are sent to PostHog unchanged _(source: module/justice.json)_
- **high** src/lib/sentry.ts:563: Sentry beforeSend scrubs URLs only; extra/context payloads may still carry justice-sensitive strings _(source: module/justice.json)_
- **high** src/features/ngos/components/ngo-profile-page.tsx:714: PrivacyBoundaryNotice is not rendered on name-only surfaces despite design requirement _(source: module/ngos.json)_
- **medium** src/lib/privacy/sensitive-route-sanitizer.ts:53: Company/entity URL sanitization is gated on tab=litigii; sensitive justice params on other company tabs are not scrubbed before analytics/Sentry. _(source: commit/justice.json)_
- **medium** src/lib/sentry.ts:254: Session replay enablement is decided once at Sentry.init based on the landing URL; SPA navigation into justice afterward may still record a replay session. _(source: commit/justice.json)_
- **medium** docs/design/ngos/features/ngo-entity-profile.md:165: PrivacyBoundaryNotice required by NGO design spec is not rendered on NGO pages. _(source: commit/ngos.json)_
- **medium** src/lib/privacy/sensitive-route-sanitizer.ts:17: Sensitive justice filters remain in the browser URL and history by design _(source: module/justice.json)_
- **medium** src/lib/sentry.ts:262: Session replay enablement is decided only at Sentry init, not when entering justice routes mid-session _(source: module/justice.json)_
- **medium** src/lib/sentry.ts:304: Sentry feedback screenshots are not disabled on justice or litigation profile routes _(source: module/justice.json)_
- **medium** src/lib/privacy/sensitive-route-sanitizer.ts:53: Entity litigation profile sanitization is implemented but not product-integrated _(source: module/justice.json)_
- **medium** src/lib/scraper-references/catalog.ts:541: `elections` catalog entry marks `privacySensitive: false` despite person-linked candidacy labels in schemas/UI. _(source: module/schemas-catalog-mock-mode.json)_
- **medium** src/lib/scraper-references/catalog.ts:117: `private-companies-anaf` marked `privacySensitive: false` while sibling ONRC entry is true. _(source: module/schemas-catalog-mock-mode.json)_
- **medium** src/components/data-trust/privacy-boundary-notice.tsx:10: Privacy boundary notices use conflicting visual semantics for the same concept _(source: module/shared-trust-identity-provenance.json)_
- **low** src/lib/privacy/sensitive-route-sanitizer.ts:58: Entity profile litigation sanitization is implemented but no entity-page litigation slice exists. _(source: commit/justice.json)_
- **low** src/lib/analytics.ts:145: No justice-specific scrubbing on custom captureEvent properties; only pageview URLs are sanitized. _(source: commit/justice.json)_
- **low** src/schemas/justice.ts:320: Court analytics schema defines page/pageSize that the court route never uses _(source: module/justice.json)_
- **low** src/lib/analytics.ts:164: No justice-specific guard on custom analytics event properties _(source: module/justice.json)_
- **info** src/schemas/justice.ts:276: Positive: closed allowlist search schemas and structural party privacy are well tested and enforced at route boundaries. _(source: commit/justice.json)_

### P1 Routing, Entity Search, and 404 Behavior

- **high** docs/ux-research/ngos.md:723: NGO canonical route is decided in design but still open/contradictory in ux-research. _(source: commit/docs.json)_
- **high** docs/design/ngos/ux.md:85: Design handoff asserts greenfield NGO surface with no client route; dev branch already has NGO routes, API, and schemas. _(source: commit/docs.json)_
- **high** src/features/entity-search/lib/entity-search-routing.ts:47: Global entity search routes doc_type `ngo` to `/entities/$cui` instead of the new `/ong-uri/$cui` profile surface. _(source: commit/ngos.json)_
- **high** src/features/entity-search/lib/entity-search-routing.ts:46: Global experimental entity-search routes public_enterprise to /entities/$cui, conflicting with the new dedicated public-enterprises surface. _(source: commit/public-companies.json)_
- **high** src/routes/investitii-publice/route.tsx:73: Nested main landmarks _(source: commit/public-investments.json)_
- **high** src/routes/justitie.cautare.tsx:454: Out-of-range page in URL desyncs fetched results from pagination UI _(source: module/justice.json)_
- **high** src/features/legal/components/legal-act-page.tsx:264: Act detail route search params are validated but never consumed _(source: module/legal.json)_
- **high** src/routes/achizitii/proceduri/$id.tsx:13: Unknown procedure IDs throw in the loader instead of returning 404 _(source: module/procurement.json)_
- **high** src/routes/achizitii/contracte/$id.tsx:13: Unknown contract IDs throw in the loader instead of returning 404 _(source: module/procurement.json)_
- **high** src/routes/achizitii/achizitii-directe/$id.tsx:13: Unknown direct-acquisition IDs throw in the loader instead of returning 404 _(source: module/procurement.json)_
- **high** src/routes/intreprinderi-publice/$cui.tsx:33: Profile route loader is not mock-gated; deep links work when sidebar nav is hidden. _(source: module/public-enterprises.json)_
- **high** src/features/entity-search/lib/entity-search-routing.ts:46: Global entity search routes public_enterprise to /entities/$cui, diverging from the dedicated public-enterprise surface. _(source: module/public-enterprises.json)_
- **high** src/components/sidebar/nav-main.tsx:106: Map nav item active on /maps/* routes due to naive prefix match _(source: module/routing-sidebar-i18n.json)_
- **medium** src/features/entity-search/lib/entity-search-routing.ts:89: Entity search legal_act hits still route to external url, not the new internal /legislatie/acte/$id surface. _(source: commit/legal.json)_
- **medium** src/schemas/legal.ts:268: Act detail route search params (versiune, highlight, from) are validated but never consumed by LegalActPage. _(source: commit/legal.json)_
- **medium** src/routes/legislatie/acte/$id.tsx:5: Legal routes lack document head/meta titles unlike comparable domain routes (e.g. justice). _(source: commit/legal.json)_
- **medium** src/features/legal/components/legal-act-page.tsx:124: Schema includes billLink and versions cluster data but UI does not surface parliament cross-links or version navigation. _(source: commit/legal.json)_
- **medium** src/routes/ong-uri.sursa.$snapshotId.lazy.tsx:15: Missing provenance loader data renders blank page (`return null`) instead of a not-found UX. _(source: commit/ngos.json)_

### P1 Public Investments Interaction and Accessibility

- **high** src/features/public-investments/components/PublicInvestmentsMapPanel.tsx:45: Map points are decorative, not operable _(source: commit/public-investments.json)_
- **high** src/features/public-investments/pages/PublicInvestmentsLandingPage.tsx:20: Landing map/search URL state is parsed but never consumed _(source: module/public-investments.json)_
- **high** src/features/public-investments/components/PublicInvestmentsMapPanel.tsx:12: Map panel is a static CSS scatter plot, not an interactive map _(source: module/public-investments.json)_
- **high** src/features/public-investments/pages/PublicInvestmentsSearchPage.tsx:37: Search layout and map-list sync URL params are unused _(source: module/public-investments.json)_
- **high** src/features/public-investments/lib/mock-mode.ts:9: Public-investments mock gate includes umbrella id `public-investments` that is absent from the catalog. _(source: module/schemas-catalog-mock-mode.json)_
- **medium** src/features/public-investments/lib/mock-mode.ts:9: Umbrella mock dataset id absent from scraper catalog _(source: commit/public-investments.json)_
- **medium** src/features/public-investments/components/BlockedDataState.tsx:12: API messageKey i18n keys are ignored _(source: commit/public-investments.json)_
- **medium** src/features/public-investments/pages/PublicInvestmentsSearchPage.tsx:62: Search URL schema partially implemented in UI _(source: commit/public-investments.json)_
- **medium** src/features/public-investments/pages/PublicInvestmentsSearchPage.tsx:84: Uncontrolled filter inputs desync from URL _(source: commit/public-investments.json)_
- **medium** src/features/public-investments/pages/PublicInvestmentsSearchPage.tsx:96: Program filter UI is single-select while schema and adapter support multi-program arrays _(source: module/public-investments.json)_
- **medium** src/features/public-investments/api/public-investments-api.ts:527: Search facets are built from the full corpus, not the filtered result set _(source: module/public-investments.json)_
- **medium** src/features/public-investments/components/BlockedDataState.tsx:12: Blocked UI ignores adapter `messageKey` and hardcodes copy _(source: module/public-investments.json)_
- **medium** src/features/public-investments/components/BlockedDataState.tsx:15: Not-found blocked descriptions use wrong messageParams key for evidence _(source: module/public-investments.json)_
- **medium** src/features/public-investments/components/PublicInvestmentsMapPanel.tsx:45: Map points are not keyboard-accessible and do not expose actionable semantics _(source: module/public-investments.json)_
- **medium** src/features/public-investments/pages/PublicInvestmentsTerritoryPage.tsx:147: Territory program/domain breakdown rows do not apply filters _(source: module/public-investments.json)_
- **medium** src/features/public-investments/pages/PublicInvestmentsSearchPage.tsx:73: Major search schema filters are not exposed in the UI _(source: module/public-investments.json)_
- **medium** src/schemas/public-investments.ts:1: Public-investments schema module covers URL search state only; API payload shapes are TypeScript-only. _(source: module/schemas-catalog-mock-mode.json)_
- **medium** src/features/public-investments/api/public-investments-api.test.ts:34: Mock/live switch tests exist for only one mock-first API facade. _(source: module/schemas-catalog-mock-mode.json)_

### P1 Mock Mode, Catalog, and Status Truthfulness

- **high** src/features/ngos/lib/mock-mode.ts:19: Scoped mock env disables NGO mocks when `VITE_MOCK_DATASETS` is set but does not include an NGO dataset id, causing live stub assertions at runtime. _(source: commit/ngos.json)_
- **high** src/features/ngos/components/ngo-snapshot-page.tsx:52: Accepted snapshots render DataStatusBadge variant `live` (label "În direct") in a mock-first domain. _(source: commit/ngos.json)_
- **high** src/features/statistics/components/request-dataset-action.tsx:69: Live dataset requests are shown as a neutral success status even when not accepted. _(source: commit/statistics.json)_
- **high** src/schemas/elections.ts:404: Contest explorer defines URL params (`geo`, `scope`, `sort`, `metric`, `compare`) that are largely unused in UI and mock. _(source: module/elections.json)_
- **high** src/features/legal/mocks/fixtures/index.ts:391: Three legal statuses have no mock fixture or UI regression coverage _(source: module/legal.json)_
- **high** src/components/identity/resolve-confidence-tier.ts:23: Confidence tier resolver does not model link-review statuses _(source: module/ngos.json)_
- **high** src/features/procurement/components/procurement-landing-page.tsx:64: DataStatus is hardcoded to mock on every surface; procurementDataStatus() is never used _(source: module/procurement-shared.json)_
- **high** src/features/ngos/lib/mock-mode.ts:24: NGO mock gating treats any defined `VITE_MOCK_DATASETS` (including empty string) as opt-out of the default mock-first behavior. _(source: module/schemas-catalog-mock-mode.json)_
- **high** src/features/ngos/lib/mock-mode.ts:3: NGO mock dataset ids include multiple aliases not registered in `scraperDatasetCatalog`. _(source: module/schemas-catalog-mock-mode.json)_
- **high** src/lib/scraper-references/catalog.ts:341: Catalog `ngo-core` metadata contradicts the implemented NGO feature. _(source: module/schemas-catalog-mock-mode.json)_
- **high** src/features/elections/api/elections-api.ts:22: Elections feature bypasses the shared mock-mode glue entirely. _(source: module/schemas-catalog-mock-mode.json)_
- **high** src/components/data-trust/data-status-badge.tsx:43: Same `DataStatus` enum values, divergent user-facing semantics for `blocked` and styling _(source: module/shared-trust-identity-provenance.json)_
- **high** src/schemas/elections.ts:16: Duplicate `DataStatus` schemas encourage silent divergence _(source: module/shared-trust-identity-provenance.json)_
- **medium** src/locales/en/messages.po:10792: English catalog contains Romanian msgids with identity msgstr (regression risk for en locale) _(source: commit/integration-cleanup.json)_
- **medium** src/locales/en/pnrr.po:1290: English PNRR catalog retains Romanian strings after regeneration _(source: commit/integration-cleanup.json)_
- **medium** src/features/legal/components/legal-trust.tsx:49: Legal domain reimplements DataStatusBadge instead of reusing shared provenance component; labels diverge from platform standard. _(source: commit/legal.json)_
- **medium** src/locales/en/messages.po:4217: English catalog leaves core legal UI strings untranslated. _(source: commit/legal.json)_
- **medium** src/lib/scraper-references/catalog.ts:341: Scraper catalog `ngo-core` entry is stale relative to shipped client feature. _(source: commit/ngos.json)_

### P2 I18n and Hardcoded Copy

- **high** src/locales/en/messages.po:16170: English locale leaves procurement UI strings untranslated (msgstr equals Romanian msgid). _(source: commit/procurement.json)_
- **high** src/features/ngos/components/ngo-profile-page.tsx:714: Name-only row identity meta is hardcoded instead of driven by evidence records _(source: module/ngos.json)_
- **medium** src/features/justice/components/litigation-slice-section.tsx:120: Dynamic numeric/text fragments embedded inside <Trans> without ICU placeholders break proper i18n extraction and reordering. _(source: commit/justice.json)_
- **medium** src/features/private-companies/components/layout/private-company-tab-nav.tsx:20: Tab list aria-label is hardcoded English and not marked for translation. _(source: commit/justice.json)_
- **medium** src/features/ngos/components/ngo-profile-page.tsx:1083: Stale snapshot detection uses hardcoded ISO dates instead of derived staleness policy. _(source: commit/ngos.json)_
- **medium** src/routes/achizitii/index.tsx:18: Route head/SEO metadata is hardcoded Romanian and bypasses Lingui. _(source: commit/procurement.json)_
- **medium** src/features/public-enterprises/components/public-enterprises-pages.tsx:459: Numeric/date formatting hardcodes locale 'ro' instead of user locale despite i18n infrastructure. _(source: commit/public-companies.json)_
- **medium** src/locales/en/messages.po:7926: English catalog not translated for PI strings _(source: commit/public-investments.json)_
- **medium** src/locales/en/messages.po:14605: English locale catalog leaves core Statistics UI strings untranslated. _(source: commit/statistics.json)_
- **medium** src/features/statistics/pages/statistics-landing-page.tsx:136: Landing dataset titles ignore active locale. _(source: commit/statistics.json)_
- **medium** src/features/statistics/components/indicator-tile.tsx:197: Source provenance drawer title is hardcoded to Romanian name. _(source: commit/statistics.json)_
- **medium** src/features/elections/components/election-hub-page.tsx:105: Mock-backed contest routing is hardcoded to a single `contestKey` string. _(source: module/elections.json)_
- **medium** src/features/elections/lib/format.ts:23: Family labels are hardcoded Romanian strings outside Lingui. _(source: module/elections.json)_
- **medium** src/locales/en/messages.po:9279: English catalog leaves multiple elections strings untranslated. _(source: module/elections.json)_
- **medium** src/features/legal/components/legal-landing-page.tsx:104: Monitorul landing strip cards lack accessible link names and use a hardcoded external fallback _(source: module/legal.json)_
- **medium** src/features/legal/lib/legal-formatting.ts:12: Dates are always formatted with `ro-RO` regardless of active locale _(source: module/legal.json)_
- **medium** src/components/provenance/source-provenance.tsx:533: EvidenceTrail renders raw English reviewStatus values without i18n _(source: module/ngos.json)_
- **medium** src/components/shared/procurement-data/data-status-badge.tsx:27: Status pill labels are English literals, not i18n-wrapped _(source: module/procurement-shared.json)_

### P2 URL State and Unused Search Params

- **high** src/features/elections/components/contest-result-explorer-page.tsx:118: Contest view param `lista` vs `tabel` is persisted to URL but does not change rendering. _(source: module/elections.json)_
- **high** src/features/justice/components/litigation-slice-section.tsx:51: Company litigation tab has the same out-of-range litPage desync _(source: module/justice.json)_
- **medium** src/features/legal/components/legal-landing-page.tsx:173: Landing q search param is read on mount but never written back to the URL on submit. _(source: commit/legal.json)_
- **medium** src/schemas/procurement.ts:539: procurementDataStatus helper is defined but unused; UI hardcodes status="mock" instead of deriving status from gate + mock mode. _(source: commit/procurement.json)_
- **medium** src/lib/entity-navigation.ts:19: buildPublicEnterprisePath trims/encodes but does not normalize CUIs before building URLs. _(source: commit/public-companies.json)_
- **medium** src/routes/investitii-publice/index.tsx:5: Landing URL map state not consumed _(source: commit/public-investments.json)_
- **medium** src/schemas/elections.ts:485: `contestResultsQueryKey` omits several URL-driven explorer fields. _(source: module/elections.json)_
- **medium** src/schemas/elections.ts:308: Landing search schema supports filters not exposed in UI. _(source: module/elections.json)_
- **medium** src/features/legal/components/legal-landing-page.tsx:173: Landing `q` search param is read but never written back to the URL _(source: module/legal.json)_
- **medium** src/features/legal/components/legal-act-page.tsx:314: Schema fields `versions` and `billLink` are loaded but not surfaced in UI _(source: module/legal.json)_
- **medium** src/lib/entity-navigation.ts:19: buildPublicEnterprisePath trims but does not normalize CUI before building URLs. _(source: module/public-enterprises.json)_
- **medium** src/features/elections/api/elections-api.mock.ts:31: Elections mock adapter does not validate fixtures against `src/schemas/elections.ts` payload schemas. _(source: module/schemas-catalog-mock-mode.json)_
- **medium** src/features/statistics/hooks/use-statistics.ts:108: `datasetRequestPayloadSchema` is never enforced on the submit path _(source: module/statistics.json)_
- **low** src/features/private-companies/components/private-company-page.tsx:26: Switching away from Litigii tab preserves litPage in URL search state. _(source: commit/justice.json)_
- **low** src/schemas/ngos.ts:433: Parsed but unused URL search params (`q` on landing, `lang` on all routes, `provider_type` on services). _(source: commit/ngos.json)_
- **low** src/schemas/procurement-search.ts:85: Review-signal search param is parsed but not exposed in search UI. _(source: commit/procurement.json)_
- **low** src/schemas/ngos.ts:434: lang search param parsed on all NGO routes but never consumed _(source: module/ngos.json)_
- **low** src/components/shared/procurement-data/use-capability-gate.ts:19: isAllowed() and meets()/coverageOf() are unused by all consumers _(source: module/procurement-shared.json)_

### Remaining High/Medium Findings

- **high** docs/design/README.md:10: Foundation handoff contract says UX research sources remain unchanged, but the same commit modifies all ux-research domain files. _(source: commit/docs.json)_
- **high** src/features/legal/components/legal-act-page.test.tsx:41: No tests for loading skeleton, fetch error, or retry flows on act detail _(source: module/legal.json)_
- **high** src/features/legal/components/legal-landing-page.test.tsx:47: No tests for landing loading, error, or retry failure states _(source: module/legal.json)_
- **high** src/components/shared/procurement-data/request-dataset-action.tsx:32: RequestDatasetAction is a dead affordance with no action handler _(source: module/procurement-shared.json)_
- **high** src/components/provenance/source-provenance.tsx:70: Monolithic provenance module re-implements the data-trust kit instead of composing it _(source: module/shared-trust-identity-provenance.json)_
- **high** src/features/elections/components/election-shared.tsx:403: Election identity messaging bypasses the canonical NGO confidence tier model _(source: module/shared-trust-identity-provenance.json)_
- **high** src/features/statistics/pages/statistics-territory-hub-page.tsx:61: Period filter controls disappear when a historical period is active and the unfiltered source query is still loading _(source: module/statistics.json)_
- **medium** src/features/ngos/components/ngo-profile-page.tsx:939: Candidate link-review rows are duplicated on both `registru` and `utilitate` tabs. _(source: commit/ngos.json)_
- **medium** src/features/ngos/components/ngo-profile-page.tsx:806: Public funding cards ignore `FundingSourceSummary.href` — cross-domain links are display-only. _(source: commit/ngos.json)_
- **medium** src/features/entity-search/lib/entity-search-routing.ts:89: Entity-search procurement hits still deep-link externally instead of internal /achizitii routes. _(source: commit/procurement.json)_
- **medium** src/features/procurement/components/procurement-supplier-slice.tsx:157: Cross-domain chips advertise litigation and money-flow availability but provide no navigation targets. _(source: commit/procurement.json)_
- **medium** src/routes/achizitii/proceduri/$id.tsx:13: Detail route loaders never reach notFound() for missing records; mock adapters throw instead. _(source: commit/procurement.json)_
- **medium** src/features/procurement/api/procurement-api.ts:39: Facade mock flag is evaluated once at module initialization. _(source: commit/procurement.json)_
- **medium** src/features/public-enterprises/components/public-enterprises-pages.tsx:397: Landing/listing search treats only digit-only trimmed input as a CUI profile jump; RO-prefixed or punctuated CUIs are sent to text listing instead of profile. _(source: commit/public-companies.json)_
- **medium** src/routes/intreprinderi-publice/$cui.tsx:38: Routes are always registered and loaders run without mock-mode gate; non-mock environments hit assertLiveApiAvailable and throw instead of a controlled unavailable state. _(source: commit/public-companies.json)_
- **medium** src/components/sidebar/nav-main.tsx:78: Sidebar mock gating is evaluated once at module initialization when building mainItems, not per render. _(source: commit/public-companies.json)_
- **medium** src/components/entities/EntitySearch/useEntitySearch.ts:28: Default entity search selectionBehavior is navigate-to-entity, bypassing buildPreferredEntityPath for public_enterprise even where entity_type is present. _(source: commit/public-companies.json)_
- **medium** src/features/statistics/lib/coverage.ts:58: Coverage ribbon counts can be wrong when the catalog page is partial. _(source: commit/statistics.json)_
- **medium** src/features/statistics/components/related-links-rail.tsx:132: Cross-domain links bypass TanStack Router client navigation. _(source: commit/statistics.json)_
- **medium** src/routes/alegeri/contest/$contestKey.tsx:5: Contest key routing is flat and accepts any param without normalization. _(source: module/elections.json)_
- **medium** src/features/elections/mocks/fixtures/elections-fixtures.ts:335: Mandate fixture semantics do not match the primar contest explorer context. _(source: module/elections.json)_
- **medium** src/features/elections/mocks/fixtures/elections-fixtures.ts:289: Geography children under a SIRUTA mayor contest include diaspora and county siblings without drill-down results. _(source: module/elections.json)_
- **medium** src/features/elections/components/elections-landing-page.tsx:84: Landing hero ignores API `featured` and imports fixture headline directly. _(source: module/elections.json)_
- **medium** src/features/elections/components/election-shared.tsx:29: Provenance context hardcodes resolver metadata not derived from source pointers. _(source: module/elections.json)_
- **medium** src/features/elections/components/election-shared.tsx:39: Data-trust null handling is strong, but inaccessible-source rows still display vote counts without inline access warning. _(source: module/elections.json)_
- **medium** src/features/elections/components/election-hub-page.tsx:88: Hub contest filter input lacks an accessible name. _(source: module/elections.json)_
- **medium** src/features/elections/components/contest-result-explorer-page.tsx:120: View and expert toggle buttons do not expose pressed state to assistive tech. _(source: module/elections.json)_
- **medium** src/features/elections/components/elections-page-layout.tsx:18: Related-links rail defaults are not internationalized. _(source: module/elections.json)_
- **medium** src/features/elections/components/election-shared.tsx:471: Referendum contests are listed in hub fixtures but navigation is explicitly blocked. _(source: module/elections.json)_
- **medium** src/routes/alegeri/-index.lazy.test.tsx:36: Route lazy tests substantially duplicate feature component tests. _(source: module/elections.json)_
- **medium** src/features/elections/api/elections-api.mock.ts:31: No unit tests cover mock filtering, pagination, or contest resolution logic. _(source: module/elections.json)_
- **medium** src/features/justice/api/justice-api.ts:60: Mock/live adapter boundary lacks automated tests at the facade layer _(source: module/justice.json)_
- **medium** src/routes/justitie.cautare.tsx:113: Live-unavailable UI path is implemented but not covered by route tests _(source: module/justice.json)_
- **medium** src/routes/justitie.dosare.$caseId.tsx:229: Procedural solutionSummary is rendered without server-side redaction _(source: module/justice.json)_
- **medium** src/features/legal/api/legal-api.ts:9: Mock/live adapter boundary is all-or-nothing across two datasets _(source: module/legal.json)_
- **medium** src/features/legal/components/legal-trust.tsx:179: Source provenance panel shows only portal source; MO custody is siloed in a separate card _(source: module/legal.json)_
- **medium** src/features/legal/components/legal-status-badge.tsx:139: Modification suffix is suppressed for abrogated acts even when `modificationCount > 0` _(source: module/legal.json)_
- **medium** src/features/legal/components/legal-status-badge.tsx:168: Status tooltip accessibility is inconsistent across the 7-value vocabulary _(source: module/legal.json)_
- **medium** src/features/legal/components/legal-landing-page.tsx:29: Client-side search scans only `sampleActs`, not recently modified or full catalog _(source: module/legal.json)_
- **medium** src/features/ngos/lib/normalize-ngo-cui.ts:6: CUI normalization has no unit tests _(source: module/ngos.json)_

## Module Report Index

- [elections](modules/elections.md): 27 findings (high: 2, medium: 17, low: 5, info: 3)
- [justice + privacy integration](modules/justice.md): 21 findings (high: 4, medium: 7, low: 9, info: 1)
- [legal](modules/legal.md): 20 findings (high: 4, medium: 9, low: 6, info: 1)
- [ngos](modules/ngos.md): 20 findings (high: 3, medium: 12, low: 4, info: 1)
- [src/components/shared/procurement-data](modules/procurement-shared.md): 18 findings (high: 2, medium: 7, low: 4, info: 5)
- [procurement](modules/procurement.md): 23 findings (high: 3, medium: 7, low: 11, info: 2)
- [public-enterprises](modules/public-enterprises.md): 24 findings (high: 2, medium: 12, low: 8, info: 2)
- [public-investments](modules/public-investments.md): 20 findings (high: 3, medium: 8, low: 6, info: 3)
- [routing-sidebar-i18n](modules/routing-sidebar-i18n.md): 14 findings (high: 1, medium: 6, low: 5, info: 2)
- [schemas-scraper-catalog-mock-mode-glue](modules/schemas-catalog-mock-mode.md): 22 findings (high: 5, medium: 13, low: 3, info: 1)
- [shared-trust-identity-provenance](modules/shared-trust-identity-provenance.md): 22 findings (critical: 2, high: 5, medium: 11, low: 4)
- [statistics](modules/statistics.md): 16 findings (high: 1, medium: 8, low: 7)

## Next Fix Agent Brief

Start Codex worker agents against disjoint write scopes using this document plus the module files as input. Recommended slices:

1. Shared trust/provenance naming and accessibility: `src/components/data-trust/`, `src/components/shared/procurement-data/`, `src/components/identity/`, `src/components/provenance/`, trust docs.
2. Privacy/telemetry: `src/lib/privacy/`, `src/lib/analytics.ts`, `src/lib/sentry.ts`, justice tests.
3. Routing/entity-search/404: `src/features/entity-search/`, new domain route loaders, NGO snapshot route, sidebar discoverability.
4. Public investments UX/accessibility: `src/features/public-investments/`, `src/routes/investitii-publice/`.
5. Mock-mode/catalog/status/i18n cleanup: `src/lib/scraper-references/`, domain `mock-mode.ts`, high-impact hardcoded labels and catalogs.

