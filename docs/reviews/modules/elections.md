# Elections Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/elections.json`

## Summary

The elections MVP is a well-structured mock-first slice: Zod-validated URL state on three `/alegeri` routes, a single deep-linked contest explorer (`local-2024-cluj-napoca-primar`), and consistent data-trust wiring (CoverageRibbon, EvidenceLink, privacy guardrails). Main gaps are explorer URL state that does not drive UI/mock behavior (view/sort/geo/metric/compare), fixture semantics that blur mayor vs council mandates, hardcoded mock-capability checks, partial i18n for EN and helper labels, and heavy duplication between route lazy tests and feature component tests with no API/mock unit coverage.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| high | src/features/elections/components/contest-result-explorer-page.tsx:118 | Contest view param `lista` vs `tabel` is persisted to URL but does not change rendering. | Gate chart/table by `search.view`, or collapse to two views until behavior exists; add a test asserting mutually exclusive rendering per view. |
| high | src/schemas/elections.ts:404 | Contest explorer defines URL params (`geo`, `scope`, `sort`, `metric`, `compare`) that are largely unused in UI and mock. | Either wire params through GeographyDrilldown/sort controls and mock filtering, or remove/hide them from schema until implemented to avoid false shareable state. |
| medium | src/schemas/elections.ts:485 | `contestResultsQueryKey` omits several URL-driven explorer fields. | Include all server-affecting params in the query key, or document which are purely presentational and keep them out of the schema. |
| medium | src/features/elections/components/election-hub-page.tsx:105 | Mock-backed contest routing is hardcoded to a single `contestKey` string. | Expose explorer availability from the API/fixture registry (e.g. `explorerStatus: 'available' \| 'listed_only'`) instead of string matching in UI. |
| medium | src/routes/alegeri/contest/$contestKey.tsx:5 | Contest key routing is flat and accepts any param without normalization. | Acceptable for MVP; add optional param normalization (trim, lowercase) and structured not-found handling before live cutover. |
| medium | src/features/elections/mocks/fixtures/elections-fixtures.ts:335 | Mandate fixture semantics do not match the primar contest explorer context. | Split fixtures by office (`primar` vs `consiliu_local`) or attach mandates to `local-2024-cluj-napoca-consiliu-local` only. |
| medium | src/features/elections/mocks/fixtures/elections-fixtures.ts:289 | Geography children under a SIRUTA mayor contest include diaspora and county siblings without drill-down results. | Trim children to realistic roll-up units for the MVP fixture, or wire clicks to `search.geo` + scoped mock responses. |
| medium | src/features/elections/components/elections-landing-page.tsx:84 | Landing hero ignores API `featured` and imports fixture headline directly. | Render `data.featured` + hub headline payload from the index response to keep UI/API seam honest. |
| medium | src/schemas/elections.ts:308 | Landing search schema supports filters not exposed in UI. | Add controls or drop unused params from public schema until needed. |
| medium | src/features/elections/components/election-shared.tsx:29 | Provenance context hardcodes resolver metadata not derived from source pointers. | Map `SourcePointer.accessStatus` and real resolver/version fields into `ProvenanceContext`; surface inaccessible status in numeric rows. |
| medium | src/features/elections/components/election-shared.tsx:39 | Data-trust null handling is strong, but inaccessible-source rows still display vote counts without inline access warning. | Add inline access-status chip or tooltip when pointer is `inaccessible_with_evidence`. |
| medium | src/features/elections/components/election-hub-page.tsx:88 | Hub contest filter input lacks an accessible name. | Mirror landing pattern with `sr-only` label tied via `htmlFor`/`id`. |
| medium | src/features/elections/components/contest-result-explorer-page.tsx:120 | View and expert toggle buttons do not expose pressed state to assistive tech. | Use `aria-pressed={active}` or a radiogroup with `role="radio"`/`aria-checked`. |
| medium | src/features/elections/lib/format.ts:23 | Family labels are hardcoded Romanian strings outside Lingui. | Replace with `t` macros or `<Trans>` mappings keyed by `ElectionFamily`. |
| medium | src/features/elections/components/elections-page-layout.tsx:18 | Related-links rail defaults are not internationalized. | Move strings to Lingui macros or pass translated labels from route layer. |
| medium | src/locales/en/messages.po:9279 | English catalog leaves multiple elections strings untranslated. | Run i18n extract after string stabilization and provide EN msgstr for elections surfaces. |
| medium | src/features/elections/components/election-shared.tsx:471 | Referendum contests are listed in hub fixtures but navigation is explicitly blocked. | Filter referendum contests out of hub lists until route exists, or add dedicated referendum explorer stub route. |
| medium | src/routes/alegeri/-index.lazy.test.tsx:36 | Route lazy tests substantially duplicate feature component tests. | Keep lazy tests focused on `useNavigate({ replace: true })` wiring; move rendering/trust assertions to component tests only. |
| medium | src/features/elections/api/elections-api.mock.ts:31 | No unit tests cover mock filtering, pagination, or contest resolution logic. | Add focused tests for index filters, archive gate, single-contest null return, expert polling-station swap, and pagination slices. |
| low | src/features/elections/mocks/fixtures/elections-fixtures.ts:227 | Competitor vote totals do not reconcile to published valid-vote aggregate. | Either document intentional partial reporting in `knownGaps`, or adjust fixture numbers so sums match valid votes for demo realism. |
| low | src/features/elections/components/election-shared.tsx:269 | Bar chart uses decorative width bars without progressive enhancement semantics. | Optional `role="img"` with concise summary, or mark bars `aria-hidden` explicitly. |
| low | src/features/elections/components/election-shared.tsx:413 | Candidacy list uses hardcoded `da`/`nu` for boolean display. | Use Lingui conditional messages (`t`/`Trans`) for yes/no. |
| low | src/features/elections/components/election-shared.tsx:39 | No tests exercise EvidenceLink / provenance drawer integration in elections UI. | Add one interaction test opening `SourceProvenanceDrawer` from `NumericEvidence` with inaccessible pointer fixture. |
| low | src/routes/alegeri/contest/-$contestKey.lazy.test.tsx:35 | Contest route lazy test omits tab navigation coverage present in component tests. | If retaining tab tests at route layer, add one navigate assertion per tab; otherwise document component tests as sole owner. |
| info | src/routes/alegeri/-index.test.tsx:1 | Route test rename convention is applied consistently for elections. | Keep split: non-lazy files test `validateSearch`/headers; lazy files test navigate wiring via `elections-router-mock.tsx`. |
| info | src/features/elections/components/contest-result-explorer-page.tsx:188 | Privacy and identity guardrails are correctly placed on sensitive tabs. | Preserve this pattern when connecting live candidacy data. |
| info | src/schemas/elections.test.ts:11 | Search parser tests are well placed and resilient. | Extend with query-key builder tests when explorer params stabilize. |

## Detailed Evidence

### high: Contest view param `lista` vs `tabel` is persisted to URL but does not change rendering.

- Location: `src/features/elections/components/contest-result-explorer-page.tsx:118`
- Evidence: View buttons update `search.view` (lines 119–128). Only `view === 'harta'` branches (line 140). For `lista` and `tabel`, both `RankedResultsChart` and `RankedResultsTable` always render inside the Rezultate tab (lines 178–186).
- Recommendation: Gate chart/table by `search.view`, or collapse to two views until behavior exists; add a test asserting mutually exclusive rendering per view.
- Residual risk: Shared/bookmarked URLs misrepresent UI state; live adapter may implement views users cannot reach today.

### high: Contest explorer defines URL params (`geo`, `scope`, `sort`, `metric`, `compare`) that are largely unused in UI and mock.

- Location: `src/schemas/elections.ts:404`
- Evidence: `contestSearchSchema` defines six explorer params (lines 404–428). Mock uses `page`, `pageSize`, `expert`, and partially `scope` only (`elections-api.mock.ts` 113–120). No elections component reads `sort`, `metric`, or `compare`; `geo` is never written by UI.
- Recommendation: Either wire params through GeographyDrilldown/sort controls and mock filtering, or remove/hide them from schema until implemented to avoid false shareable state.
- Residual risk: Future API cutover inherits dead query keys and confusing 404/empty responses for valid-looking URLs.

### medium: `contestResultsQueryKey` omits several URL-driven explorer fields.

- Location: `src/schemas/elections.ts:485`
- Evidence: Key includes `geo`, `scope`, `metric`, `page`, `pageSize`, `expert` (lines 485–499) but not `view`, `tab`, `sort`, or `compare`, even though those are in `contestSearchSchema`.
- Recommendation: Include all server-affecting params in the query key, or document which are purely presentational and keep them out of the schema.
- Residual risk: TanStack Query cache collisions when mock/API behavior starts depending on sort or geography.

### medium: Mock-backed contest routing is hardcoded to a single `contestKey` string.

- Location: `src/features/elections/components/election-hub-page.tsx:105`
- Evidence: `isMockBacked={contest.contestKey === 'local-2024-cluj-napoca-primar'}` (lines 105–107) duplicates the guard in `fetchContestResultsMock` (`elections-api.mock.ts` line 111).
- Recommendation: Expose explorer availability from the API/fixture registry (e.g. `explorerStatus: 'available' | 'listed_only'`) instead of string matching in UI.
- Residual risk: Every new mock contest requires scattered string updates; easy to ship broken links.

### medium: Contest key routing is flat and accepts any param without normalization.

- Location: `src/routes/alegeri/contest/$contestKey.tsx:5`
- Evidence: Route is `/alegeri/contest/$contestKey` with `validateSearch` only; no param schema or `beforeLoad` guard. Unknown keys return `null` client-side (`elections-api.mock.ts` 111, explorer empty state line 80).
- Recommendation: Acceptable for MVP; add optional param normalization (trim, lowercase) and structured not-found handling before live cutover.
- Residual risk: Alias keys, encoding differences, or stale bookmarks surface generic empty states instead of canonical redirects.

### medium: Mandate fixture semantics do not match the primar contest explorer context.

- Location: `src/features/elections/mocks/fixtures/elections-fixtures.ts:335`
- Evidence: `localMandates` lists PNL/USR/PSD council-style seat counts (9/5/4) (lines 335–360) but is served for contest `local-2024-cluj-napoca-primar` (`office: 'primar'`, lines 156–169). Mandate tab copy says numeric allocations, not nominal persons, but seat counts imply consiliu local.
- Recommendation: Split fixtures by office (`primar` vs `consiliu_local`) or attach mandates to `local-2024-cluj-napoca-consiliu-local` only.
- Residual risk: Journalists misread mayor race pages as council composition; undermines trust semantics.

### medium: Geography children under a SIRUTA mayor contest include diaspora and county siblings without drill-down results.

- Location: `src/features/elections/mocks/fixtures/elections-fixtures.ts:289`
- Evidence: `localChildren` under `scopeType: 'siruta'` includes county CJ and diaspora entries (lines 289–310) but geography cards are non-interactive (`election-shared.tsx` 382–394) and mock does not vary results by `geo`.
- Recommendation: Trim children to realistic roll-up units for the MVP fixture, or wire clicks to `search.geo` + scoped mock responses.
- Residual risk: Geography section reads as navigable hierarchy but is static decoration.

### medium: Landing hero ignores API `featured` and imports fixture headline directly.

- Location: `src/features/elections/components/elections-landing-page.tsx:84`
- Evidence: Component imports `presidentialHeadline` from fixtures (line 21) and renders it unconditionally (line 84). `fetchElectionsIndexMock` already computes `featured` (`elections-api.mock.ts` 59–62).
- Recommendation: Render `data.featured` + hub headline payload from the index response to keep UI/API seam honest.
- Residual risk: Live cutover changes featured election in API but UI stays pinned to fixture import.

### medium: Landing search schema supports filters not exposed in UI.

- Location: `src/schemas/elections.ts:308`
- Evidence: Schema includes `authority`, `year`, `yearFrom`, `yearTo`, `round`, `sort` (lines 308–326). Landing UI only binds `q`, `family`, and `arhiva` (`elections-landing-page.tsx` 107–156).
- Recommendation: Add controls or drop unused params from public schema until needed.
- Residual risk: Manual URL manipulation works but product appears incomplete; tests cover parsers users cannot reach.

### medium: Provenance context hardcodes resolver metadata not derived from source pointers.

- Location: `src/features/elections/components/election-shared.tsx:29`
- Evidence: `evidenceContext` sets `mappingStatus: 'mapat'` and `resolverVersion: 'mock-read-model-v1'` for every EvidenceLink (lines 29–36), regardless of `accessStatus` (e.g. UDMR uses `inaccessiblePointer`, line 274).
- Recommendation: Map `SourcePointer.accessStatus` and real resolver/version fields into `ProvenanceContext`; surface inaccessible status in numeric rows.
- Residual risk: Drawer overstates mapping confidence for blocked/inaccessible sources.

### medium: Data-trust null handling is strong, but inaccessible-source rows still display vote counts without inline access warning.

- Location: `src/features/elections/components/election-shared.tsx:39`
- Evidence: `NumericEvidence` shows `-` + `metric indisponibil` for null percent (UDMR, line 271) and keeps EvidenceLink. Votes (7420) still render with inaccessible pointer (lines 86–101, fixture line 271–274). No badge for `accessStatus !== 'ok'`.
- Recommendation: Add inline access-status chip or tooltip when pointer is `inaccessible_with_evidence`.
- Residual risk: Users may treat partially blocked figures as fully verified.

### medium: Hub contest filter input lacks an accessible name.

- Location: `src/features/elections/components/election-hub-page.tsx:88`
- Evidence: `<Input>` with placeholder only (lines 88–92). Landing search uses `<span className="sr-only">` label (`elections-landing-page.tsx` 110–112); hub does not.
- Recommendation: Mirror landing pattern with `sr-only` label tied via `htmlFor`/`id`.
- Residual risk: Screen-reader users hear an unlabeled field on a core filter control.

### medium: View and expert toggle buttons do not expose pressed state to assistive tech.

- Location: `src/features/elections/components/contest-result-explorer-page.tsx:120`
- Evidence: Buttons use visual `variant` selection (lines 120–137) but no `aria-pressed`. Same pattern on landing family chips (`elections-landing-page.tsx` 133–141).
- Recommendation: Use `aria-pressed={active}` or a radiogroup with `role="radio"`/`aria-checked`.
- Residual risk: Toggle groups are announced as generic buttons; state changes are unclear.

### medium: Family labels are hardcoded Romanian strings outside Lingui.

- Location: `src/features/elections/lib/format.ts:23`
- Evidence: `familyLabel()` returns `'Locale'`, `'Prezidentiale'`, etc. (lines 23–29) and is rendered directly in UI (`elections-landing-page.tsx` 140, 178).
- Recommendation: Replace with `t` macros or `<Trans>` mappings keyed by `ElectionFamily`.
- Residual risk: English locale shows Romanian family names in filter chips and cards.

### medium: Related-links rail defaults are not internationalized.

- Location: `src/features/elections/components/elections-page-layout.tsx:18`
- Evidence: `defaultRailLinks` labels/descriptions are raw Romanian strings (lines 18–35) passed into `RelatedLinksRail`, which renders them without `<Trans>`.
- Recommendation: Move strings to Lingui macros or pass translated labels from route layer.
- Residual risk: EN users see Romanian sidebar copy on every elections page.

### medium: English catalog leaves multiple elections strings untranslated.

- Location: `src/locales/en/messages.po:9279`
- Evidence: Examples: `msgid "metric indisponibil"` → `msgstr "metric indisponibil"` (lines 9279–9280); `msgid "Rezultate alegeri"` → same msgstr (lines 13122–13123).
- Recommendation: Run i18n extract after string stabilization and provide EN msgstr for elections surfaces.
- Residual risk: Bilingual users get Romanian fallback text in trust-critical labels.

### medium: Referendum contests are listed in hub fixtures but navigation is explicitly blocked.

- Location: `src/features/elections/components/election-shared.tsx:471`
- Evidence: `ContestLinkRow` renders dashed placeholder for `contest.isReferendum` (lines 471–478) while `referendum-2018-national` exists in fixtures (fixtures lines 201–214).
- Recommendation: Filter referendum contests out of hub lists until route exists, or add dedicated referendum explorer stub route.
- Residual risk: Users see contests that look listed but cannot be opened.

### medium: Route lazy tests substantially duplicate feature component tests.

- Location: `src/routes/alegeri/-index.lazy.test.tsx:36`
- Evidence: Landing lazy test asserts heading, mock ribbon, archive hint, and filter navigation (lines 36–80), overlapping `elections-landing-page.test.tsx` (lines 27–85). Hub and contest lazy tests similarly mirror `election-hub-page.test.tsx` and `contest-result-explorer-page.test.tsx`.
- Recommendation: Keep lazy tests focused on `useNavigate({ replace: true })` wiring; move rendering/trust assertions to component tests only.
- Residual risk: Copy changes require updating 2–3 near-identical tests; drift already possible.

### medium: No unit tests cover mock filtering, pagination, or contest resolution logic.

- Location: `src/features/elections/api/elections-api.mock.ts:31`
- Evidence: Grep finds no tests referencing `elections-api.mock`, `fetchContestResultsMock`, or `elections-fixtures`. Coverage is indirect via component/route renders.
- Recommendation: Add focused tests for index filters, archive gate, single-contest null return, expert polling-station swap, and pagination slices.
- Residual risk: Mock adapter regressions surface only through slower UI tests.

### low: Competitor vote totals do not reconcile to published valid-vote aggregate.

- Location: `src/features/elections/mocks/fixtures/elections-fixtures.ts:227`
- Evidence: Sum of competitor `votes` = 117,617 (lines 227–275) vs `turnout.validVotes` = 126,980 (lines 217–225). Percents are computed against `totalVotes` (e.g. 54265/128904 ≈ 42.1%).
- Recommendation: Either document intentional partial reporting in `knownGaps`, or adjust fixture numbers so sums match valid votes for demo realism.
- Residual risk: Teaches incorrect mental model of vote accounting during mock demos.

### low: Bar chart uses decorative width bars without progressive enhancement semantics.

- Location: `src/features/elections/components/election-shared.tsx:269`
- Evidence: Chart container has `aria-label={title}` (line 240) but bars are empty `<div style={{ width }}>` (lines 269–271). Numeric values are adjacent text, so not color-only.
- Recommendation: Optional `role="img"` with concise summary, or mark bars `aria-hidden` explicitly.
- Residual risk: Low; primary data is in text, but bar proportions are not announced.

### low: Candidacy list uses hardcoded `da`/`nu` for boolean display.

- Location: `src/features/elections/components/election-shared.tsx:413`
- Evidence: `isFinalList ? 'da' : 'nu'` inside `<Trans>Lista finala</Trans>` line (line 413).
- Recommendation: Use Lingui conditional messages (`t`/`Trans`) for yes/no.
- Residual risk: Minor i18n inconsistency on candidacy tab.

### low: No tests exercise EvidenceLink / provenance drawer integration in elections UI.

- Location: `src/features/elections/components/election-shared.tsx:39`
- Evidence: Election tests assert visible copy (`metric indisponibil`, privacy notices) but none click `sursa` / `vezi provenienta` or assert drawer content (`contest-result-explorer-page.test.tsx`, `elections-landing-page.test.tsx`).
- Recommendation: Add one interaction test opening `SourceProvenanceDrawer` from `NumericEvidence` with inaccessible pointer fixture.
- Residual risk: Core data-trust UX path for elections remains unverified.

### low: Contest route lazy test omits tab navigation coverage present in component tests.

- Location: `src/routes/alegeri/contest/-$contestKey.lazy.test.tsx:35`
- Evidence: Lazy test covers view/expert buttons and unknown contest (lines 35–74) but not candidaturi/mandate tabs tested in `contest-result-explorer-page.test.tsx` (lines 85–131).
- Recommendation: If retaining tab tests at route layer, add one navigate assertion per tab; otherwise document component tests as sole owner.
- Duplicate of: `src/routes/alegeri/-index.lazy.test.tsx`
- Residual risk: Route-layer regressions on tab URL sync could slip if component tests mock `onSearchChange` only.

### info: Route test rename convention is applied consistently for elections.

- Location: `src/routes/alegeri/-index.test.tsx:1`
- Evidence: Six route tests use `-` prefix: `-index.test.tsx`, `-index.lazy.test.tsx`, `-$electionKey.test.tsx`, `-$electionKey.lazy.test.tsx`, `contest/-$contestKey.test.tsx`, `contest/-$contestKey.lazy.test.tsx`. Matches patterns under `src/routes/statistici/` and `src/routes/ong-uri/`.
- Recommendation: Keep split: non-lazy files test `validateSearch`/headers; lazy files test navigate wiring via `elections-router-mock.tsx`.
- Residual risk: Low; convention is correct if contributors follow `-` prefix for new alegeri routes.

### info: Privacy and identity guardrails are correctly placed on sensitive tabs.

- Location: `src/features/elections/components/contest-result-explorer-page.tsx:188`
- Evidence: Candidaturi tab renders `PrivacyBoundaryNotice` + `IdentityConfidenceBadge status="source_only"` (`election-shared.tsx` 399–406). Mandate tab includes allocation-only copy (lines 442–446). Tests assert both (`contest-result-explorer-page.test.tsx` 85–130).
- Recommendation: Preserve this pattern when connecting live candidacy data.
- Residual risk: Low for MVP; live data with PII fields will need stronger field-level redaction review.

### info: Search parser tests are well placed and resilient.

- Location: `src/schemas/elections.test.ts:11`
- Evidence: Colocated schema tests cover all three parsers with invalid-value normalization (`elections.test.ts` lines 11–138), mirrored by route `-*.test.tsx` validateSearch smoke tests.
- Recommendation: Extend with query-key builder tests when explorer params stabilize.
- Residual risk: Low; parser layer is the strongest tested seam today.

## Residual Risk

Overall MVP risk is acceptable for mock-first demos but concentrated in URL-state/UI drift, single-contest mock depth, and trust copy that may overstate mapping confidence. Live cutover will need a real adapter seam in `elections-api.ts`, dynamic explorer availability, geography drill-down tied to `geo`, EN translations, and slimmed test duplication before production traffic.
