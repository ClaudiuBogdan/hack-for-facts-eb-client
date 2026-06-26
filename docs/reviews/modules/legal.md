# Legal Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/legal.json`

## Summary

The legal module is a well-structured mock-first MVP: Zod schemas, fixture validation, status badges, Monitorul cards, and provenance panels are in place with solid happy-path and partial-state coverage. Gaps cluster around unused route search params (`versiune`/`highlight`/`from`), incomplete status lifecycle fixture coverage (3 of 7 statuses untested in UI), all-or-nothing mock/live switching, missing loading/error tests, and several accessibility/i18n polish items on external links and date formatting.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| high | src/features/legal/components/legal-act-page.tsx:264 | Act detail route search params are validated but never consumed | Wire `useSearch({ from: '/legislatie/acte/$id' })` into `LegalActPage` (or route loader) and use `versiune` to select canonical vs alternate document expressions, `highlight` for scroll/flash targets, and `from` for back-navigation context per design docs. |
| high | src/features/legal/mocks/fixtures/index.ts:391 | Three legal statuses have no mock fixture or UI regression coverage | Add at least one fixture per missing status and extend `legal-act-page.test.tsx` with snapshot/role assertions for badge label, color variant, and tooltip text. |
| high | src/features/legal/components/legal-act-page.test.tsx:41 | No tests for loading skeleton, fetch error, or retry flows on act detail | Add cases for `isLoading: true`, `isError: true` with `Error` message, and verify retry calls `refetch`. Mirror pattern used in other feature page tests. |
| high | src/features/legal/components/legal-landing-page.test.tsx:47 | No tests for landing loading, error, or retry failure states | Add loading skeleton assertion, error alert with message, and retry button interaction tests. |
| medium | src/features/legal/api/legal-api.ts:9 | Mock/live adapter boundary is all-or-nothing across two datasets | Document the coupling explicitly in UI (`DataStatusBadge` / coverage ribbon) or split fetch paths so portal text and MO coordinates can degrade independently when one dataset is live-ready. |
| medium | src/features/legal/components/legal-landing-page.tsx:173 | Landing `q` search param is read but never written back to the URL | On submit, `navigate({ search: { q: query } })` when staying on landing; optionally auto-resolve and redirect when `q` matches on mount. |
| medium | src/features/legal/components/legal-trust.tsx:179 | Source provenance panel shows only portal source; MO custody is siloed in a separate card | When `act.mo` is present, show dual provenance (portal + MO) or extend `SourceProvenancePanel` to accept an array with lane labels matching schema `coverage.lane`. |
| medium | src/features/legal/components/legal-landing-page.tsx:104 | Monitorul landing strip cards lack accessible link names and use a hardcoded external fallback | Add descriptive `aria-label` including part, number, and date; disable or mark links when only the generic fallback would be used. |
| medium | src/features/legal/lib/legal-formatting.ts:12 | Dates are always formatted with `ro-RO` regardless of active locale | Resolve locale from Lingui (`i18n.locale`) and format as `ro-RO` or `en-GB`/`en-US` accordingly; keep ISO strings in data layer. |
| medium | src/features/legal/components/legal-act-page.tsx:314 | Schema fields `versions` and `billLink` are loaded but not surfaced in UI | Render version cluster selector bound to `?versiune=` and bill cross-link per design docs, or gate the placeholder behind a feature flag to avoid implying completeness. |
| medium | src/features/legal/components/legal-status-badge.tsx:139 | Modification suffix is suppressed for abrogated acts even when `modificationCount > 0` | Confirm product policy: if abrogated acts should show amendment history count, remove the guard or add a separate "modificat de N acte" line in provenance/timeline. |
| medium | src/features/legal/components/legal-status-badge.tsx:168 | Status tooltip accessibility is inconsistent across the 7-value vocabulary | Use a shared tooltip wrapper for all statuses, or expose status explanations in visible helper text on the act page. |
| medium | src/features/legal/components/legal-landing-page.tsx:29 | Client-side search scans only `sampleActs`, not recently modified or full catalog | Expand search pool to include `recentlyModified` act IDs or delegate to a dedicated `/legislatie/cautare` adapter when live. |
| low | src/features/legal/components/monitorul-publication-card.tsx:47 | `resolution: 'unmatched'` branch exists in UI but has no fixture or test | Add a fixture with `resolution: 'unmatched'` and assert badge + guidance text. |
| low | src/features/legal/components/legal-landing-page.tsx:62 | Unknown `changeKind` values pass through untranslated | Add a fallback `<Trans>Modificare</Trans>` or map through i18n with a dev-only warning for unknown kinds. |
| low | src/features/legal/components/monitorul-publication-card.tsx:101 | SHA-256 label is not marked for translation | Wrap label in `t\`SHA-256\`` or use a shared crypto-digest label component. |
| low | src/features/legal/api/legal-api.mock.ts:35 | Fixture validation runs at module import time as a side effect | Move validation to test setup or a CI script; keep runtime parse in fetch functions only. |
| low | src/features/legal/components/legal-act-page.tsx:236 | Not-found copy conflates mock and live absence without actionable next step | Differentiate copy when `isLegalMockEnabled()` vs live, and link to landing search or citation resolver. |
| low | src/features/legal/hooks/use-legal-act.ts:11 | Null act response is treated as success, not a typed error boundary | Consider throwing a typed `NotFoundError` or setting `meta` on the query for observability while keeping UI branch. |
| info | src/routes/legislatie/acte/$id.tsx:5 | HTTP cache headers configured but no document title or route meta | Add TanStack Router `head`/`meta` using act citation and status for SEO and tab identification. |

## Detailed Evidence

### high: Act detail route search params are validated but never consumed

- Location: `src/features/legal/components/legal-act-page.tsx:264`
- Evidence: `legalActDetailSearchSchema` defines `versiune`, `highlight`, and `from` (src/schemas/legal.ts:268-272) and `$id.tsx` validates them via `parseLegalActDetailSearch`, but `LegalActPage` only receives `actId` from the lazy route and never calls `useSearch` or reads version/highlight/back-context.
- Recommendation: Wire `useSearch({ from: '/legislatie/acte/$id' })` into `LegalActPage` (or route loader) and use `versiune` to select canonical vs alternate document expressions, `highlight` for scroll/flash targets, and `from` for back-navigation context per design docs.
- Residual risk: Deep links, version switching, and cross-feature return paths will silently ignore URL state until implemented.

### high: Three legal statuses have no mock fixture or UI regression coverage

- Location: `src/features/legal/mocks/fixtures/index.ts:391`
- Evidence: `legalStatusSchema` defines 7 values (src/schemas/legal.ts:17-25). Fixtures exercise `modificat`, `in-vigoare`, `abrogat`, and `necunoscut` only. `LegalStatusBadge` implements styling/labels for `suspendat`, `abrogat-partial`, and `iesit-din-vigoare` (legal-status-badge.tsx:49-58) but no act fixture or test renders them.
- Recommendation: Add at least one fixture per missing status and extend `legal-act-page.test.tsx` with snapshot/role assertions for badge label, color variant, and tooltip text.
- Residual risk: Live data returning these statuses may render untested combinations (e.g. modification suffix + partial abrogation).

### high: No tests for loading skeleton, fetch error, or retry flows on act detail

- Location: `src/features/legal/components/legal-act-page.test.tsx:41`
- Evidence: Tests mock `useLegalAct` only in success/not-found/partial states. `LegalActPage` implements `LegalActPageSkeleton` (legal-act-page.tsx:248-261), destructive `Alert` + `Reîncearcă` (271-289), but none are exercised.
- Recommendation: Add cases for `isLoading: true`, `isError: true` with `Error` message, and verify retry calls `refetch`. Mirror pattern used in other feature page tests.
- Residual risk: Regressions in error/retry UX will ship unnoticed; live adapter failures will be the first real exposure.

### high: No tests for landing loading, error, or retry failure states

- Location: `src/features/legal/components/legal-landing-page.test.tsx:47`
- Evidence: `LegalLandingPage` handles `isLoading` → skeleton, `isError || !data` → destructive alert + retry (legal-landing-page.tsx:184-207). Tests always mock successful `landingDataMock`.
- Recommendation: Add loading skeleton assertion, error alert with message, and retry button interaction tests.
- Residual risk: Landing degradation when live API is unavailable will lack regression protection.

### medium: Mock/live adapter boundary is all-or-nothing across two datasets

- Location: `src/features/legal/api/legal-api.ts:9`
- Evidence: `isLegalMockEnabled()` returns true if either `legal-portal-legislativ` or `legal-monitorul-oficial` has mock enabled (mock-mode.ts:13-15). There is no per-field merge: portal acts and MO metadata always come from the same adapter tier. Live adapter gates only on `legal-portal-legislativ` (legal-api.live.ts:21-24).
- Recommendation: Document the coupling explicitly in UI (`DataStatusBadge` / coverage ribbon) or split fetch paths so portal text and MO coordinates can degrade independently when one dataset is live-ready.
- Residual risk: Partial dataset availability in production will show inconsistent trust signals (e.g. live act with mock MO card).

### medium: Landing `q` search param is read but never written back to the URL

- Location: `src/features/legal/components/legal-landing-page.tsx:173`
- Evidence: `useSearch` reads `q` to seed local `query` state (line 176), and tests confirm input population (legal-landing-page.test.tsx:74-81). Submit navigates to act detail but never updates `/legislatie?q=…`, and failed searches leave no shareable URL.
- Recommendation: On submit, `navigate({ search: { q: query } })` when staying on landing; optionally auto-resolve and redirect when `q` matches on mount.
- Residual risk: Search state is not bookmarkable or analytics-friendly; refresh loses context except initial `q` seed.

### medium: Source provenance panel shows only portal source; MO custody is siloed in a separate card

- Location: `src/features/legal/components/legal-trust.tsx:179`
- Evidence: All fixtures set `source.sourceName: 'portal-legislativ'` (fixtures/index.ts:136, 201). `SourceProvenancePanel` renders a single `source` object. MO PDF SHA-256 and URL live only in `MonitorulPublicationCard`. `sourceProvenanceMonitorul` is exported but unused in act fixtures.
- Recommendation: When `act.mo` is present, show dual provenance (portal + MO) or extend `SourceProvenancePanel` to accept an array with lane labels matching schema `coverage.lane`.
- Residual risk: Users may assume one SHA-256 covers the entire act when portal and MO artifacts differ.

### medium: Monitorul landing strip cards lack accessible link names and use a hardcoded external fallback

- Location: `src/features/legal/components/legal-landing-page.tsx:104`
- Evidence: `TodayInMonitorulStrip` renders bare `<a>` tags (121-126) with no `aria-label`. When both `sourceUrl` and `pdfUrl` are null, href falls back to `https://monitoruloficial.ro/` without user-visible indication.
- Recommendation: Add descriptive `aria-label` including part, number, and date; disable or mark links when only the generic fallback would be used.
- Residual risk: Screen-reader users hear undifferentiated external links; fallback may send users to the wrong MO destination.

### medium: Dates are always formatted with `ro-RO` regardless of active locale

- Location: `src/features/legal/lib/legal-formatting.ts:12`
- Evidence: `formatLegalDate` uses `Intl.DateTimeFormat('ro-RO', …)` for all legal surfaces (act page, landing, provenance, Monitorul cards). No `i18n.locale` branching unlike patterns in challenges/campaigns features.
- Recommendation: Resolve locale from Lingui (`i18n.locale`) and format as `ro-RO` or `en-GB`/`en-US` accordingly; keep ISO strings in data layer.
- Residual risk: English-locale users see Romanian month names on legal dates.

### medium: Schema fields `versions` and `billLink` are loaded but not surfaced in UI

- Location: `src/features/legal/components/legal-act-page.tsx:314`
- Evidence: Fixtures populate `versions` and `billLink` (e.g. legea227_2015Act:88-135). UI shows `canonicalDocumentId` as plain text (line 137) and a placeholder "Legături conexe" blurb (314-324) without bill link, version selector, or promulgation chain.
- Recommendation: Render version cluster selector bound to `?versiune=` and bill cross-link per design docs, or gate the placeholder behind a feature flag to avoid implying completeness.
- Residual risk: Users cannot distinguish canonical vs historical expressions or trace legislative origin from the act page.

### medium: Modification suffix is suppressed for abrogated acts even when `modificationCount > 0`

- Location: `src/features/legal/components/legal-status-badge.tsx:139`
- Evidence: `showSuffix` requires `status !== 'abrogat'` (line 139). `lege-50-1992` fixture has `modificationCount: 23` and `status: 'abrogat'` but the suffix never appears.
- Recommendation: Confirm product policy: if abrogated acts should show amendment history count, remove the guard or add a separate "modificat de N acte" line in provenance/timeline.
- Residual risk: Amendment history for repealed acts is hidden on list and detail badges.

### medium: Status tooltip accessibility is inconsistent across the 7-value vocabulary

- Location: `src/features/legal/components/legal-status-badge.tsx:168`
- Evidence: Only `necunoscut` uses Radix `Tooltip` (168-179). Other statuses rely on native `title` (184-185), which is not keyboard-accessible and may be stripped by browsers. Non-unknown statuses lack the same hover/focus disclosure pattern.
- Recommendation: Use a shared tooltip wrapper for all statuses, or expose status explanations in visible helper text on the act page.
- Residual risk: Status semantics are unclear to keyboard and mobile users except for `necunoscut`.

### medium: Client-side search scans only `sampleActs`, not recently modified or full catalog

- Location: `src/features/legal/components/legal-landing-page.tsx:29`
- Evidence: `findMatchingAct` searches `data.sampleActs` (line 213). `recentlyModified` and `todayInMonitorul` are display-only. With five mock acts, search coverage is inherently limited.
- Recommendation: Expand search pool to include `recentlyModified` act IDs or delegate to a dedicated `/legislatie/cautare` adapter when live.
- Residual risk: Valid acts visible elsewhere on the page may be unfindable via the search form.

### low: `resolution: 'unmatched'` branch exists in UI but has no fixture or test

- Location: `src/features/legal/components/monitorul-publication-card.tsx:47`
- Evidence: Schema allows `unique | ambiguous | unmatched` (legal.ts:111). Card maps all three labels (47-52). Fixtures use `unique` or `ambiguous` only; no test asserts "fără potrivire" copy.
- Recommendation: Add a fixture with `resolution: 'unmatched'` and assert badge + guidance text.
- Residual risk: Unmatched MO joins may render without validated UX copy.

### low: Unknown `changeKind` values pass through untranslated

- Location: `src/features/legal/components/legal-landing-page.tsx:62`
- Evidence: `getChangeKindLabel` handles three known kinds then returns raw `changeKind` (53-63). API/mock could introduce new kinds that appear verbatim in "Modificate recent".
- Recommendation: Add a fallback `<Trans>Modificare</Trans>` or map through i18n with a dev-only warning for unknown kinds.
- Residual risk: Raw enum strings may appear in user-facing lists after live wiring.

### low: SHA-256 label is not marked for translation

- Location: `src/features/legal/components/monitorul-publication-card.tsx:101`
- Evidence: Footer renders literal `SHA-256:` (line 101). Same pattern in `SourceProvenancePanel` dt element (legal-trust.tsx:219). Other legal strings use `t`/`Trans`.
- Recommendation: Wrap label in `t\`SHA-256\`` or use a shared crypto-digest label component.
- Residual risk: Minor i18n inconsistency; English catalog may still show Latin acronym unchanged.

### low: Fixture validation runs at module import time as a side effect

- Location: `src/features/legal/api/legal-api.mock.ts:35`
- Evidence: `validateLegalMockFixtures()` is invoked at top level (line 35) on every import of the mock adapter, throwing if any fixture fails Zod parse.
- Recommendation: Move validation to test setup or a CI script; keep runtime parse in fetch functions only.
- Residual risk: Invalid fixture during development crashes any route that imports the legal API module.

### low: Not-found copy conflates mock and live absence without actionable next step

- Location: `src/features/legal/components/legal-act-page.tsx:236`
- Evidence: `LegalActNotFound` message references both "mostră mock" and "răspuns live" (line 236) but offers only a back link—no search or support action.
- Recommendation: Differentiate copy when `isLegalMockEnabled()` vs live, and link to landing search or citation resolver.
- Residual risk: Users hitting unknown IDs get minimal recovery guidance.

### low: Null act response is treated as success, not a typed error boundary

- Location: `src/features/legal/hooks/use-legal-act.ts:11`
- Evidence: `fetchLegalActMock` returns `null` for unknown IDs (legal-api.mock.ts:42-44). React Query succeeds; page branches to not-found. No `retry: false` or distinct `404` error type for analytics/monitoring.
- Recommendation: Consider throwing a typed `NotFoundError` or setting `meta` on the query for observability while keeping UI branch.
- Residual risk: 404 vs 500 distinction is invisible to error tracking unless explicitly modeled.

### info: HTTP cache headers configured but no document title or route meta

- Location: `src/routes/legislatie/acte/$id.tsx:5`
- Evidence: Routes set `createPublicPageCacheHeaders` (index.tsx:7-12, $id.tsx:7-12) but neither route defines head/title from `displayCitation` or status.
- Recommendation: Add TanStack Router `head`/`meta` using act citation and status for SEO and tab identification.
- Residual risk: Browser tabs and shared links show generic app title.

## Residual Risk

Overall the module is safe for mock-first review demos but not yet production-complete: live adapters throw by design, three status values and several schema-driven fields (`versions`, `billLink`, detail search params) are schema-ready yet UI-inert, and failure-state coverage in tests lags implementation. Connecting GraphQL without addressing dual provenance, per-dataset mock toggles, and locale-aware formatting will produce trust and accessibility gaps visible to journalists and public-sector users.
