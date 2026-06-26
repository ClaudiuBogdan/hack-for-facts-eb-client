# Ngos Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/ngos.json`

## Summary

Mock-first NGO module is structurally sound: Zod schemas and mock/live adapter dispatch align with design docs, CUI normalization mirrors private-company idiom at the route boundary, and identity/provenance primitives (UnconfirmedReferencesZone, EvidenceTrail, snapshot routes) are wired with reasonable empty/error coverage and Lingui on primary surfaces. Gaps concentrate on privacy component adoption, identity meta fidelity (hardcoded review states, link-review enum mismatch), adapter/UI leakage (client-side service filtering, hard-coded snapshot staleness), missing tests for CUI normalization and snapshot routes, and several accessibility/i18n polish items.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| high | src/features/ngos/components/ngo-profile-page.tsx:714 | PrivacyBoundaryNotice is not rendered on name-only surfaces despite design requirement | Add PrivacyBoundaryNotice (default or tailored copy) at the top of registru/utilitate tabs inside or above UnconfirmedReferencesZone, matching justice/public-investments patterns. |
| high | src/features/ngos/components/ngo-profile-page.tsx:714 | Name-only row identity meta is hardcoded instead of driven by evidence records | Map each row via evidenceForSnapshot(profile.evidence, row.sourceSnapshotId) into IdentityRowMeta; map linkReviewCase.reviewStatus through a dedicated adapter to IdentityConfidenceInput. |
| high | src/components/identity/resolve-confidence-tier.ts:23 | Confidence tier resolver does not model link-review statuses | Extend resolver with link-review status mapping (e.g. needs_more_evidence → candidate when case id + confidence present) or normalize link cases to evidence reviewStatus in the API adapter. |
| medium | src/features/ngos/lib/normalize-ngo-cui.ts:6 | CUI normalization has no unit tests | Add vitest cases for RO/ro prefix, whitespace, non-digit, all-zero, and valid CUIs; add route-loader test for /ong-uri/$cui with invalid param → notFound. |
| medium | src/features/ngos/components/ngo-landing-page.tsx:134 | Invalid CUI search fails silently with no user feedback | Surface validation error (toast.warning or inline alert) and associate it with the search input via aria-describedby. |
| medium | src/features/ngos/api/ngo-api.mock.ts:26 | Mock profile adapter does not normalize CUI before lookup | Normalize CUI once at the dispatcher or mock adapter boundary before lookup and cache keys. |
| medium | src/routes/ong-uri.sursa.$snapshotId.lazy.tsx:15 | Snapshot route lazy page lacks notFound UI and renders null on missing loader data | Add notFoundComponent mirroring NgoProfileNotFound pattern and a route test; avoid bare null render. |
| medium | src/routes/ong-uri.sursa.$snapshotId.tsx:14 | Snapshot route performs no snapshotId validation or sanitization | Add safe parser (non-empty string, max length, allowed charset) at route boundary before adapter call. |
| medium | src/features/ngos/components/ngo-profile-page.tsx:551 | Staleness and snapshot metadata are hard-coded in UI instead of adapter-derived | Expose stale/isCurrent/freshness from ServiceDiscoveryResult.snapshot or SourceSnapshot in schemas; compute in mock/live adapters so UI reads boolean/date fields only. |
| medium | src/features/ngos/components/ngo-services-page.tsx:89 | Service discovery filtering and pagination live in UI, not adapter boundary | Move filter/sort/page to fetchNgoServiceDiscovery(search) signature; keep UI as thin renderer of adapter result; wire or remove unused search params. |
| medium | src/components/identity/identity-confidence-badge.tsx:246 | Review-case deep links target missing DOM ids | Add id attributes on candidate cards or remove broken hash links until review-case panel exists. |
| medium | src/features/ngos/components/ngo-profile-page.tsx:939 | Candidate matches duplicated on both registru and utilitate tabs | Show candidateMatches only on registru (or a dedicated review tab); keep utilitate tab scoped to publicUtility rows. |
| medium | src/features/ngos/components/ngo-profile-page.tsx:182 | Profile header always asserts accepted identity regardless of header/evidence state | Derive header badge from strongest confirmed evidence row or explicit header.reviewStatus when schema adds it. |
| medium | src/components/provenance/source-provenance.tsx:533 | EvidenceTrail renders raw English reviewStatus values without i18n | Reuse reviewStatusLabels mapping from identity-confidence-badge or a shared i18n map for evidence table status column. |
| medium | src/features/ngos/components/ngo-profile-page.tsx:238 | Tablist accessibility incomplete (no keyboard roving tabindex) | Implement roving tabindex and ArrowLeft/ArrowRight navigation, or use Radix Tabs primitive. |
| low | src/features/ngos/components/ngo-formatting.ts:45 | Formatting helpers use hard-coded Romanian strings outside Lingui | Move user-visible strings to Lingui macros or accept i18n function parameter at call sites. |
| low | src/schemas/ngos.ts:434 | lang search param parsed on all NGO routes but never consumed | Wire lang to i18n locale switching or remove from schemas until supported. |
| low | src/features/ngos/components/ngo-profile-page.tsx:115 | Not-found copy exposes mock implementation detail | Use production-facing copy ('Nu am găsit profil pentru acest CUI') and optional mock badge elsewhere. |
| low | src/features/ngos/components/ngo-snapshot-page.test.tsx:17 | Snapshot and identity badge component test coverage is thin | Add route lazy test for provenance wiring, badge tier/copy snapshots, and invalid snapshot notFound path. |
| info | src/features/ngos/api/ngo-api.live.ts:17 | Live adapters are intentional stubs (mock-first by design) | No change for mock-first phase; when connecting API, implement live adapters with Zod parse at boundary matching ngo-api.mock.ts pattern. |

## Detailed Evidence

### high: PrivacyBoundaryNotice is not rendered on name-only surfaces despite design requirement

- Location: `src/features/ngos/components/ngo-profile-page.tsx:714`
- Evidence: NameOnlyPanel uses UnconfirmedReferencesZone (lines 700–785) with explanatory copy, but never imports or renders PrivacyBoundaryNotice from src/components/provenance/source-provenance.tsx. docs/design/ngos/features/identity-confidence-communication.md and docs/ux-research/ngos.md require both components together.
- Recommendation: Add PrivacyBoundaryNotice (default or tailored copy) at the top of registru/utilitate tabs inside or above UnconfirmedReferencesZone, matching justice/public-investments patterns.
- Residual risk: Users may not understand aggregation/redaction boundaries for MJ/SGG name-only data until live PII edge cases appear.

### high: Name-only row identity meta is hardcoded instead of driven by evidence records

- Location: `src/features/ngos/components/ngo-profile-page.tsx:714`
- Evidence: Legal registry and SGG rows always pass basis="name_review" and reviewStatus="review_pending" with confidence={null} (lines 714–751), ignoring matching entries in profile.evidence (e.g. nameOnlyHeavyProfile evidence at mocks lines 843–858). Candidate rows hardcode reviewStatus="review_pending" (line 777) while mock linkReviewCase uses reviewStatus: 'needs_more_evidence' (ngo-mocks.ts line 770).
- Recommendation: Map each row via evidenceForSnapshot(profile.evidence, row.sourceSnapshotId) into IdentityRowMeta; map linkReviewCase.reviewStatus through a dedicated adapter to IdentityConfidenceInput.
- Residual risk: UI can misrepresent review queue state and hide real confidence scores from backend.

### high: Confidence tier resolver does not model link-review statuses

- Location: `src/components/identity/resolve-confidence-tier.ts:23`
- Evidence: resolveConfidenceTier accepts only NgoReviewStatus (accepted|review_pending|rejected|unmatched). linkReviewCaseSchema uses ngoLinkReviewStatusSchema (pending|needs_more_evidence|…). Candidate mock with needs_more_evidence only shows 'Posibilă potrivire' because UI hardcodes review_pending (profile-page.test.tsx line 131).
- Recommendation: Extend resolver with link-review status mapping (e.g. needs_more_evidence → candidate when case id + confidence present) or normalize link cases to evidence reviewStatus in the API adapter.
- Residual risk: Live link-review queue data will silently downgrade to unconfirmed or require UI hacks.

### medium: CUI normalization has no unit tests

- Location: `src/features/ngos/lib/normalize-ngo-cui.ts:6`
- Evidence: normalizeNgoCui mirrors normalizeCompanyCui (private-companies has normalize-company-cui.test.ts) but no normalize-ngo-cui.test.ts exists. Only indirect coverage via ngo-landing-page.test.tsx line 87 (RO prefix).
- Recommendation: Add vitest cases for RO/ro prefix, whitespace, non-digit, all-zero, and valid CUIs; add route-loader test for /ong-uri/$cui with invalid param → notFound.
- Residual risk: Regressions in CUI parsing could cause silent search failures or incorrect notFound behavior.

### medium: Invalid CUI search fails silently with no user feedback

- Location: `src/features/ngos/components/ngo-landing-page.tsx:134`
- Evidence: submitSearch calls normalizeNgoCui and returns early when null (lines 136–137) without toast, inline error, or aria-live announcement.
- Recommendation: Surface validation error (toast.warning or inline alert) and associate it with the search input via aria-describedby.
- Residual risk: Users believe search is broken when entering malformed CUIs.

### medium: Mock profile adapter does not normalize CUI before lookup

- Location: `src/features/ngos/api/ngo-api.mock.ts:26`
- Evidence: fetchNgoProfileMock passes raw cui to getMockNgoProfile (line 30); lookup is exact key match (ngo-mocks.ts line 872–873). Route loader normalizes (ong-uri.$cui.tsx line 22), but any future caller passing 'RO12345678' gets null.
- Recommendation: Normalize CUI once at the dispatcher or mock adapter boundary before lookup and cache keys.
- Residual risk: Adapter inconsistency when live API accepts normalized CUIs but mocks miss aliased forms.

### medium: Snapshot route lazy page lacks notFound UI and renders null on missing loader data

- Location: `src/routes/ong-uri.sursa.$snapshotId.lazy.tsx:15`
- Evidence: Unlike ong-uri.$cui.lazy.tsx (notFoundComponent: NgoProfileNotFound), snapshot lazy route returns null when loaderData?.provenance is falsy (lines 15–17). Loader throws notFound (ong-uri.sursa.$snapshotId.tsx line 16) but there is no dedicated notFoundComponent or empty-state component.
- Recommendation: Add notFoundComponent mirroring NgoProfileNotFound pattern and a route test; avoid bare null render.
- Residual risk: Blank screen on edge navigation or hydration mismatch.

### medium: Snapshot route performs no snapshotId validation or sanitization

- Location: `src/routes/ong-uri.sursa.$snapshotId.tsx:14`
- Evidence: Loader passes params.snapshotId directly to fetchSnapshotProvenance (line 15) with no length/format guard; invalid IDs rely on null → notFound only.
- Recommendation: Add safe parser (non-empty string, max length, allowed charset) at route boundary before adapter call.
- Residual risk: Garbage params hit adapter layer; live API may log/noise or behave inconsistently.

### medium: Staleness and snapshot metadata are hard-coded in UI instead of adapter-derived

- Location: `src/features/ngos/components/ngo-profile-page.tsx:551`
- Evidence: ServicesPanel references profile.snapshotsById.mmuncii_services_2023_12_11 (line 551). StaleSnapshotNotice uses hard-coded snapshotDate="2023-12-11" (line 1083). ngo-snapshot-page.tsx and ngo-services-page.tsx compare dates to literal '2023-12-11'/'2024-04-10' for stale flags.
- Recommendation: Expose stale/isCurrent/freshness from ServiceDiscoveryResult.snapshot or SourceSnapshot in schemas; compute in mock/live adapters so UI reads boolean/date fields only.
- Residual risk: Live data refresh requires scattered UI edits; staleness logic diverges across pages.

### medium: Service discovery filtering and pagination live in UI, not adapter boundary

- Location: `src/features/ngos/components/ngo-services-page.tsx:89`
- Evidence: filterRows/sortRows/pagination run client-side (lines 89–127, 562–570). Loader fetches full mockServiceDiscovery once (ong-uri.servicii.tsx line 15). URL params provider_type and selected from ngoServicesSearchSchema are never applied in component code.
- Recommendation: Move filter/sort/page to fetchNgoServiceDiscovery(search) signature; keep UI as thin renderer of adapter result; wire or remove unused search params.
- Residual risk: Live API swap requires UI rewrite and may break performance on full national datasets.

### medium: Review-case deep links target missing DOM ids

- Location: `src/components/identity/identity-confidence-badge.tsx:246`
- Evidence: IdentityRowMeta links to href={`#review-case-${linkReviewCaseId}`} (line 248). NameOnlyPanel candidate cards (ngo-profile-page.tsx lines 764–783) set key but no id="review-case-candidate-0" matching linkReviewCaseId={`candidate-${index}`} (line 779).
- Recommendation: Add id attributes on candidate cards or remove broken hash links until review-case panel exists.
- Residual risk: Accessibility and navigation affordance for review queue is non-functional.

### medium: Candidate matches duplicated on both registru and utilitate tabs

- Location: `src/features/ngos/components/ngo-profile-page.tsx:939`
- Evidence: ProfileTabContent passes profile.candidateMatches to NameOnlyPanel on registru (line 944) and utilitate (line 956) tabs regardless of which name-only source is shown.
- Recommendation: Show candidateMatches only on registru (or a dedicated review tab); keep utilitate tab scoped to publicUtility rows.
- Residual risk: Duplicate candidate UI confuses users about which source triggered the match.

### medium: Profile header always asserts accepted identity regardless of header/evidence state

- Location: `src/features/ngos/components/ngo-profile-page.tsx:182`
- Evidence: IdentityConfidenceBadge input hardcodes reviewStatus: 'accepted' (lines 183–186) while basis comes from header only; no tie to aggregated evidence review states.
- Recommendation: Derive header badge from strongest confirmed evidence row or explicit header.reviewStatus when schema adds it.
- Residual risk: Edge profiles with pending CUI verification could display confirmed badge incorrectly.

### medium: EvidenceTrail renders raw English reviewStatus values without i18n

- Location: `src/components/provenance/source-provenance.tsx:533`
- Evidence: TableCell displays row.reviewStatus directly (line 533: `{row.reviewStatus}`) while IdentityConfidenceBadge uses translated labels elsewhere.
- Recommendation: Reuse reviewStatusLabels mapping from identity-confidence-badge or a shared i18n map for evidence table status column.
- Residual risk: Mixed-language UI for Romanian-primary audience; screen readers announce English enum strings.

### medium: Tablist accessibility incomplete (no keyboard roving tabindex)

- Location: `src/features/ngos/components/ngo-profile-page.tsx:238`
- Evidence: ProfileTabNav sets role="tablist", role="tab", aria-selected, aria-controls (lines 238–251) but tabs are buttons without tabIndex management or arrow-key handlers per WAI-ARIA tabs pattern.
- Recommendation: Implement roving tabindex and ArrowLeft/ArrowRight navigation, or use Radix Tabs primitive.
- Residual risk: Keyboard-only users cannot efficiently navigate nine profile sections.

### low: Formatting helpers use hard-coded Romanian strings outside Lingui

- Location: `src/features/ngos/components/ngo-formatting.ts:45`
- Evidence: locationLabel returns 'Localitate necunoscuta' (line 50). serviceValidityLabel returns 'Expirat'/'Activ' (lines 68–71) without t/Trans macros.
- Recommendation: Move user-visible strings to Lingui macros or accept i18n function parameter at call sites.
- Residual risk: English locale (messages.po entries exist) still shows Romanian fragments in location/validity labels.

### low: lang search param parsed on all NGO routes but never consumed

- Location: `src/schemas/ngos.ts:434`
- Evidence: parseNgoLandingSearch, parseNgoProfileSearch, parseNgoServicesSearch, parseNgoSnapshotSearch all accept lang (e.g. lines 434, 464, 532, 572) but no NGO page reads search.lang.
- Recommendation: Wire lang to i18n locale switching or remove from schemas until supported.
- Residual risk: URL state suggests locale control that does nothing.

### low: Not-found copy exposes mock implementation detail

- Location: `src/features/ngos/components/ngo-profile-page.tsx:115`
- Evidence: NgoProfileNotFound description: 'Nu exista un profil mock pentru acest CUI.' (line 118).
- Recommendation: Use production-facing copy ('Nu am găsit profil pentru acest CUI') and optional mock badge elsewhere.
- Residual risk: User trust erosion when live API ships but copy still references mocks.

### low: Snapshot and identity badge component test coverage is thin

- Location: `src/features/ngos/components/ngo-snapshot-page.test.tsx:17`
- Evidence: Snapshot page has 3 tests; no tests for ong-uri.sursa.$snapshotId.lazy.tsx, normalize-ngo-cui.ts, or identity-confidence-badge.tsx. resolve-confidence-tier.test.ts covers tier logic only.
- Recommendation: Add route lazy test for provenance wiring, badge tier/copy snapshots, and invalid snapshot notFound path.
- Residual risk: Regressions in provenance route wiring and badge copy go undetected.

### info: Live adapters are intentional stubs (mock-first by design)

- Location: `src/features/ngos/api/ngo-api.live.ts:17`
- Evidence: All live functions call assertLiveApiAvailable and return null (lines 17–45). Dispatcher in ngo-api.ts switches on isNgoMockEnabled().
- Recommendation: No change for mock-first phase; when connecting API, implement live adapters with Zod parse at boundary matching ngo-api.mock.ts pattern.
- Residual risk: Enabling VITE_NGO_USE_LIVE_API=true without implementations yields hard failures (intentional loud fail).

