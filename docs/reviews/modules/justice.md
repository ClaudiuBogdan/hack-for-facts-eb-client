# Justice + privacy integration Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/justice.json`

## Summary

The justice feature is mock-first with strong schema-level privacy boundaries, closed route search allowlists, and a dedicated query-param sanitizer wired into PostHog pageviews and Sentry URL scrubbing. Private-company litigation is integrated via LitigationSliceSection with URL-backed litPage pagination. Main gaps: telemetry still receives justice path segments (caseId), Sentry non-URL event fields and feedback screenshots are not justice-scoped, out-of-range pagination can desync UI from fetched data, entities litigii is sanitizer-ready but not product-wired, and live/unavailable adapter boundaries lack automated tests.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| high | src/lib/analytics.ts:230 | Justice case identifiers in URL path segments are sent to PostHog unchanged | Extend the privacy layer to hash or bucket justice path segments (at minimum /justitie/dosare/*) before capturePageview, or emit a canonical aggregate pathname for telemetry. |
| high | src/lib/sentry.ts:563 | Sentry beforeSend scrubs URLs only; extra/context payloads may still carry justice-sensitive strings | Add a recursive justice-aware scrubber for extra/contexts/messages (partyKey, caseNumber, from, free-text patterns) or disable extraErrorData on justice routes. |
| high | src/routes/justitie.cautare.tsx:454 | Out-of-range page in URL desyncs fetched results from pagination UI | Clamp page to [1, totalPages] at route validation (parseCaseSearch) or navigate to the clamped page when results load. |
| high | src/features/justice/components/litigation-slice-section.tsx:51 | Company litigation tab has the same out-of-range litPage desync | Clamp litPage in parsePrivateCompanySearch against pagination.total or reset litPage when tab changes / totals shrink. |
| medium | src/lib/privacy/sensitive-route-sanitizer.ts:17 | Sensitive justice filters remain in the browser URL and history by design | Document user-facing sharing/history risk; consider POST/session-scoped filter state for caseNumber/partyKey if product policy requires URL hygiene beyond telemetry. |
| medium | src/lib/sentry.ts:262 | Session replay enablement is decided only at Sentry init, not when entering justice routes mid-session | Dynamically stop/start replay on justice route transitions, or set replaysSessionSampleRate to 0 whenever isCurrentJusticeSensitiveLocation() is true. |
| medium | src/lib/sentry.ts:304 | Sentry feedback screenshots are not disabled on justice or litigation profile routes | Disable screenshots when isCurrentJusticeSensitiveLocation() or gate feedback on justice routes. |
| medium | src/lib/privacy/sensitive-route-sanitizer.ts:53 | Entity litigation profile sanitization is implemented but not product-integrated | When wiring entity litigation, reuse LitigationSliceSection and litPage search param; add route/component tests mirroring company integration. |
| medium | src/features/justice/api/justice-api.ts:60 | Mock/live adapter boundary lacks automated tests at the facade layer | Add justice-api.test.ts covering isJusticeMockEnabled toggles and verifying live paths never return mock fixtures. |
| medium | src/routes/justitie.cautare.tsx:113 | Live-unavailable UI path is implemented but not covered by route tests | Add route tests asserting JusticeUnavailablePanel renders for each justice surface when mock is disabled. |
| medium | src/routes/justitie.dosare.$caseId.tsx:229 | Procedural solutionSummary is rendered without server-side redaction | Add backend/mock redaction rules for incidental person-like tokens; keep UI notice; add tests with contaminated fixture text. |
| low | src/features/justice/api/justice-api.mock.ts:311 | Company litigation pagination total is taken from fixture metadata, not derived from cases length | Derive total from sourceFixture.cases.length (or headline.totalCases when non-null) in mock adapter. |
| low | src/schemas/justice.ts:320 | Court analytics schema defines page/pageSize that the court route never uses | Remove unused pagination fields from court search schema or implement pagination consistently. |
| low | src/features/justice/components/litigation-slice-section.tsx:175 | Misleading pageSizeOptions prop without onPageSizeChange handler | Remove pageSizeOptions or wire pageSize to URL/API with a fixed PAGE_SIZE constant documented in UI. |
| low | src/components/ui/pagination.tsx:58 | Pagination chrome used by justice routes is not i18n-marked | Wrap Pagination strings in Lingui macros or pass translated labels as props. |
| low | src/features/justice/components/litigation-slice-section.tsx:120 | Dynamic counts embedded inside Trans reduce i18n quality | Use Trans with values/components (e.g. <Trans>{count} cauze publicabile ca {partyKind}</Trans> with named placeholders). |
| low | src/features/justice/components/data-trust.tsx:172 | IdentityConfidenceBadge exposes raw tier codes alongside translated labels | Show translated tier label only, or mark tier codes as non-translatable abbreviations with aria-label. |
| low | src/routes/justitie.index.tsx:177 | Coverage year bars lack accessible non-visual fallback | Add visually hidden table or aria-labelledby summary for bar charts on justice landing and court volume panels. |
| low | src/features/private-companies/components/private-company-tab-content.tsx:48 | Private-company litigation integration lacks page-level tests | Add private-company page/tab test covering litigii tab selection, litPage URL updates, and telemetry sanitization of /companies/$cui?tab=litigii&litPage=2. |
| low | src/lib/analytics.ts:164 | No justice-specific guard on custom analytics event properties | Run justice URL/param scrubber over string values in captureEvent when on justice paths, or prohibit justice PII in event schemas by review. |
| info | src/features/justice/hooks/use-justice-data.ts:29 | Query keys correctly exclude navigation-only from param but hooks layer is untested | Add focused unit tests for query key stability and outcome narrowing. |

## Detailed Evidence

### high: Justice case identifiers in URL path segments are sent to PostHog unchanged

- Location: `src/lib/analytics.ts:230`
- Evidence: capturePageview sanitizes query strings via sanitizeJusticeUrlFragment but preserves full pathname; /justitie/dosare/$caseId routes emit $pathname/$current_url containing caseId (e.g. portal-just-bucuresti-2024-001). Query stripping removes caseNumber/partyKey/from, but path segments are never redacted.
- Recommendation: Extend the privacy layer to hash or bucket justice path segments (at minimum /justitie/dosare/*) before capturePageview, or emit a canonical aggregate pathname for telemetry.
- Residual risk: Case-level browsing patterns remain linkable in analytics even when query params are scrubbed.

### high: Sentry beforeSend scrubs URLs only; extra/context payloads may still carry justice-sensitive strings

- Location: `src/lib/sentry.ts:563`
- Evidence: sanitizeEventUrls handles request.url, breadcrumb URL fields, and referer headers. extraErrorDataIntegration({ depth: 5 }) is always enabled, but event.extra, contexts, and message bodies are not passed through a justice-specific scrubber.
- Recommendation: Add a recursive justice-aware scrubber for extra/contexts/messages (partyKey, caseNumber, from, free-text patterns) or disable extraErrorData on justice routes.
- Residual risk: Error payloads could leak search state or incidental portal text beyond URL fields.

### high: Out-of-range page in URL desyncs fetched results from pagination UI

- Location: `src/routes/justitie.cautare.tsx:454`
- Evidence: Pagination receives currentPage={search.page ?? 1} and internally clamps display (safeCurrent), but useCaseSearch(search) fetches the unclamped page. Mock adapter slices with (page-1)*pageSize; page > totalPages returns empty rows while totalCount stays > 0.
- Recommendation: Clamp page to [1, totalPages] at route validation (parseCaseSearch) or navigate to the clamped page when results load.
- Residual risk: Users with stale/bookmarked deep pages see empty tables despite non-zero totals.

### high: Company litigation tab has the same out-of-range litPage desync

- Location: `src/features/justice/components/litigation-slice-section.tsx:51`
- Evidence: LitigationSliceSection passes page from URL to useCompanyLitigation({ cui, page, pageSize: 10 }) and Pagination currentPage={page}. Pagination clamps display; fetch uses raw litPage from /companies/$cui?tab=litigii&litPage=N.
- Recommendation: Clamp litPage in parsePrivateCompanySearch against pagination.total or reset litPage when tab changes / totals shrink.
- Duplicate of: `src/routes/justitie.cautare.tsx:454`
- Residual risk: Empty litigation tables on valid profiles when litPage is stale.

### medium: Sensitive justice filters remain in the browser URL and history by design

- Location: `src/lib/privacy/sensitive-route-sanitizer.ts:17`
- Evidence: caseNumber, partyKey, and from are valid CaseSearchState fields and are navigated intentionally (e.g. justitie.index.tsx:217, case-results-table.tsx:169-173). STRIPPED_JUSTICE_QUERY_PARAMS documents they are telemetry-only strips. Privacy guardrail test confirms UI links retain them while sanitizer removes them for telemetry.
- Recommendation: Document user-facing sharing/history risk; consider POST/session-scoped filter state for caseNumber/partyKey if product policy requires URL hygiene beyond telemetry.
- Residual risk: Shared links, local history, and third-party Referrer headers may expose filters outside PostHog/Sentry.

### medium: Session replay enablement is decided only at Sentry init, not when entering justice routes mid-session

- Location: `src/lib/sentry.ts:262`
- Evidence: replayIntegration is pushed when analyticsConsent && !currentJusticeSensitiveLocation at init time. Later navigation to /justitie* relies on maskAllText, networkDetailDenyUrls, beforeAddRecordingEvent URL scrubbing, and beforeErrorSampling — not on disabling replay.
- Recommendation: Dynamically stop/start replay on justice route transitions, or set replaysSessionSampleRate to 0 whenever isCurrentJusticeSensitiveLocation() is true.
- Residual risk: Masked replay may still capture interaction metadata on justice pages after cross-route navigation.

### medium: Sentry feedback screenshots are not disabled on justice or litigation profile routes

- Location: `src/lib/sentry.ts:304`
- Evidence: feedbackIntegration({ enableScreenshot: true, ... }) is enabled with sentry consent regardless of route. Justice UI renders case numbers, company names, and procedural summaries.
- Recommendation: Disable screenshots when isCurrentJusticeSensitiveLocation() or gate feedback on justice routes.
- Residual risk: User-submitted bug reports may attach identifiable litigation context.

### medium: Entity litigation profile sanitization is implemented but not product-integrated

- Location: `src/lib/privacy/sensitive-route-sanitizer.ts:53`
- Evidence: isJusticeLitigationProfilePath matches /entities/*?tab=litigii, and tests cover entity query stripping. Grep shows litigii tab only on private-companies (private-company-tab-content.tsx:48-54), not on public entity profiles.
- Recommendation: When wiring entity litigation, reuse LitigationSliceSection and litPage search param; add route/component tests mirroring company integration.
- Residual risk: Future entity integration may omit privacy wiring unless copied deliberately.

### medium: Mock/live adapter boundary lacks automated tests at the facade layer

- Location: `src/features/justice/api/justice-api.ts:60`
- Evidence: justice-api.ts switches on isJusticeMockEnabled() for all fetch* exports; justice-api.live.ts always returns justiceUnavailable. Tests exist for mock adapters only (justice-api.mock.test.ts); no test asserts live mode returns unavailable or that mock is never called when disabled.
- Recommendation: Add justice-api.test.ts covering isJusticeMockEnabled toggles and verifying live paths never return mock fixtures.
- Residual risk: Env misconfiguration could silently show mock litigation data in production.

### medium: Live-unavailable UI path is implemented but not covered by route tests

- Location: `src/routes/justitie.cautare.tsx:113`
- Evidence: All -justitie.*.test.tsx files mock getJusticeQueryOutcome with unavailable handling but no test case passes { status: 'unavailable' } data. Live adapter always returns unavailable when mock is off.
- Recommendation: Add route tests asserting JusticeUnavailablePanel renders for each justice surface when mock is disabled.
- Duplicate of: `src/features/justice/api/justice-api.ts:60`
- Residual risk: Regression could show blank/error states instead of honest unavailable messaging in live mode.

### medium: Procedural solutionSummary is rendered without server-side redaction

- Location: `src/routes/justitie.dosare.$caseId.tsx:229`
- Evidence: Timeline displays hearing.solutionSummary directly (line 229). PrivacyBoundaryNotice variant='incidental-text' is shown at case level (line 128), but text is still rendered. Mock fixtures include neutral procedural strings only.
- Recommendation: Add backend/mock redaction rules for incidental person-like tokens; keep UI notice; add tests with contaminated fixture text.
- Residual risk: Live portal text could expose incidental identities despite no full-text search.

### low: Company litigation pagination total is taken from fixture metadata, not derived from cases length

- Location: `src/features/justice/api/justice-api.mock.ts:311`
- Evidence: fetchCompanyLitigationMock sets total: sourceFixture.pagination.total while slicing sourceFixture.cases. If fixtures drift, page counts can disagree with available rows.
- Recommendation: Derive total from sourceFixture.cases.length (or headline.totalCases when non-null) in mock adapter.
- Residual risk: Mock demos may show incorrect last-page behavior.

### low: Court analytics schema defines page/pageSize that the court route never uses

- Location: `src/schemas/justice.ts:320`
- Evidence: courtAnalyticsSearchSchema includes page and pageSize (lines 320-321). justitie.instante.$courtId.tsx renders tabs and breakdowns without pagination controls or page-aware fetching.
- Recommendation: Remove unused pagination fields from court search schema or implement pagination consistently.
- Residual risk: Dead URL params may confuse future API wiring.

### low: Misleading pageSizeOptions prop without onPageSizeChange handler

- Location: `src/features/justice/components/litigation-slice-section.tsx:175`
- Evidence: Pagination is rendered with pageSizeOptions={[10, 25, 50]} but no onPageSizeChange; Pagination only shows row-size selector when onPageSizeChange is provided (pagination.tsx:60).
- Recommendation: Remove pageSizeOptions or wire pageSize to URL/API with a fixed PAGE_SIZE constant documented in UI.
- Residual risk: Minor maintainability confusion only.

### low: Pagination chrome used by justice routes is not i18n-marked

- Location: `src/components/ui/pagination.tsx:58`
- Evidence: Hardcoded English strings: 'Showing {from}-{to} of {totalCount} entries', 'Rows:', 'First', 'Previous', 'Next', 'Last', 'Go to'. Used by justitie.cautare.tsx and litigation-slice-section.tsx.
- Recommendation: Wrap Pagination strings in Lingui macros or pass translated labels as props.
- Residual risk: English leakage in otherwise Romanian-localized justice surfaces.

### low: Dynamic counts embedded inside Trans reduce i18n quality

- Location: `src/features/justice/components/litigation-slice-section.tsx:120`
- Evidence: <Trans>{formatJusticeCount(...)} cauze publicabile ca {getJusticePartyKindLabel(...)}.</Trans> mixes runtime formatting into a single message id.
- Recommendation: Use Trans with values/components (e.g. <Trans>{count} cauze publicabile ca {partyKind}</Trans> with named placeholders).
- Residual risk: Poor pluralization/translation in non-Romanian locales.

### low: IdentityConfidenceBadge exposes raw tier codes alongside translated labels

- Location: `src/features/justice/components/data-trust.tsx:172`
- Evidence: Renders `{confidence.tier} · {getJusticeConfidenceTierLabel(...)} · {getJusticeConfidenceStatusLabel(...)}` showing 'B · Încredere medie · ...'.
- Recommendation: Show translated tier label only, or mark tier codes as non-translatable abbreviations with aria-label.
- Residual risk: Minor UX/i18n inconsistency.

### low: Coverage year bars lack accessible non-visual fallback

- Location: `src/routes/justitie.index.tsx:177`
- Evidence: Historical coverage uses div bar charts with inline width styles only; no table/list alternative or aria labels. Court route VolumePanel comment claims 'tabel fallback' but implementation is also bar-only (justitie.instante.$courtId.tsx:199-201).
- Recommendation: Add visually hidden table or aria-labelledby summary for bar charts on justice landing and court volume panels.
- Residual risk: Screen-reader users get counts in adjacent text but not explicit chart semantics.

### low: Private-company litigation integration lacks page-level tests

- Location: `src/features/private-companies/components/private-company-tab-content.tsx:48`
- Evidence: LitigationSliceSection is wired with litPage/onLitPageChange from private-company-page.tsx. Component tests exist for LitigationSliceSection only; no test renders PrivateCompanyTabContent tab='litigii' or verifies litPage URL navigation.
- Recommendation: Add private-company page/tab test covering litigii tab selection, litPage URL updates, and telemetry sanitization of /companies/$cui?tab=litigii&litPage=2.
- Residual risk: Integration regressions between company routing and justice feature may go unnoticed.

### low: No justice-specific guard on custom analytics event properties

- Location: `src/lib/analytics.ts:164`
- Evidence: captureEvent uses sanitizeProps for generic serialization but does not apply sanitizeJusticeUrlFragment to string properties. No justice analytics events exist today, but EVENTS registry is open to future additions.
- Recommendation: Run justice URL/param scrubber over string values in captureEvent when on justice paths, or prohibit justice PII in event schemas by review.
- Residual risk: Future justice events could leak filters if added without scrubbing.

### info: Query keys correctly exclude navigation-only from param but hooks layer is untested

- Location: `src/features/justice/hooks/use-justice-data.ts:29`
- Evidence: justiceQueryKeys.caseSearch omits from: const { from: _from, ...querySearch } = search. Prevents cache fragmentation. No unit tests for justiceQueryKeys or getJusticeQueryOutcome.
- Recommendation: Add focused unit tests for query key stability and outcome narrowing.
- Residual risk: Low; current behavior appears correct.

