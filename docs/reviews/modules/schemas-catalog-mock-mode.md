# Schemas Scraper Catalog Mock Mode Glue Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/schemas-catalog-mock-mode.json`

## Summary

The mock-first foundation is structurally sound (central `isMockDataEnabled`, typed catalog, per-feature `*-api.ts` facades with `*.mock.ts`/`*.live.ts` splits), but env-gating semantics diverge sharply by domain: some surfaces default to mocks, others to blocked/unavailable states, and others throw. Catalog metadata is partially stale (NGO, INS/statistics paths, apiReady flags for wired live adapters). Schema work is strong for route/search parsers and several mock boundaries (justice, legal, NGOs, public-enterprise), but weaker for public-investments payloads, elections fixtures, procurement/statistics mocks. Test coverage is concentrated in schema parsers and one public-investments API gate test; mock-mode wrappers and most live/mock facades are untested.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| high | src/features/ngos/lib/mock-mode.ts:24 | NGO mock gating treats any defined `VITE_MOCK_DATASETS` (including empty string) as opt-out of the default mock-first behavior. | Only enter scoped mode when `scoped?.trim()` is non-empty; if scoped is set but no NGO id matches, keep mock-first default (or return a typed blocked/unavailable result). Align with documented mock-first intent in the file header. |
| high | src/features/ngos/lib/mock-mode.ts:3 | NGO mock dataset ids include multiple aliases not registered in `scraperDatasetCatalog`. | Register lane-level catalog entries or collapse feature gating to `ngo-core` only; remove orphan ids from mock-mode and live asserts. |
| high | src/lib/scraper-references/catalog.ts:341 | Catalog `ngo-core` metadata contradicts the implemented NGO feature. | Set `mockDataAvailable: true`, point `clientFeaturePaths` to `src/features/ngos/`, `clientSchemaPaths` to `src/schemas/ngos.ts`, and add spec paths if they exist locally. |
| high | src/features/public-investments/lib/mock-mode.ts:9 | Public-investments mock gate includes umbrella id `public-investments` that is absent from the catalog. | Either add a catalog umbrella entry for the feature or drop the alias and document the two real dataset ids in UI copy/tests. |
| high | src/features/elections/api/elections-api.ts:22 | Elections feature bypasses the shared mock-mode glue entirely. | Add feature mock-mode wrapper, live stub returning blocked/unavailable, and dispatcher mirroring justice/public-investments patterns before API cutover. |
| medium | src/features/private-companies/lib/mock-mode.ts:3 | Private-companies mock gate uses alias id `private-companies` not present in the catalog. | Remove the alias or add a feature-level catalog entry; prefer catalog ids only in env examples. |
| medium | src/features/procurement/api/procurement-api.ts:39 | `procurementApi.isMock` is frozen at module import time. | Replace with a getter or invoke `isProcurementMockEnabled()` inside each method (same pattern as parliament/private-companies facades). |
| medium | src/features/procurement/lib/mock-mode.ts:16 | Procurement ignores standard env gates whenever `procurementLiveApiReady()` is false (always today). | Keep mock-first default but document as explicit policy; when wiring live, gate on catalog `apiReady` or env and add tests for both paths. |
| medium | src/features/legal/api/legal-api.live.ts:21 | Legal live adapters always assert only `legal-portal-legislativ`, even for landing data that includes Monitorul Oficial lanes. | Split live adapters by lane/dataset or assert both catalog ids where responses are composite. |
| medium | src/features/justice/api/justice-api.ts:34 | Inconsistent live-not-connected UX patterns across mock-first domains. | Standardize on one of: typed unavailable/blocked results (preferred for React Query hooks) or guarded throws with route-level error boundaries; document per-domain default when env unset. |
| medium | src/lib/scraper-references/catalog.ts:96 | Catalog `apiReady` flags are stale for domains with working live client adapters. | Mark live-ready datasets `apiReady: true` (or introduce partial-ready metadata) so `listMockFirstDatasets()` and procurement/parliament comments stay truthful. |
| medium | src/lib/scraper-references/catalog.ts:62 | Catalog `ins-indicators` client paths omit the statistics feature surface. | Add `src/features/statistics/` and `src/schemas/statistics.ts` to catalog metadata. |
| medium | src/lib/scraper-references/catalog.ts:541 | `elections` catalog entry marks `privacySensitive: false` despite person-linked candidacy labels in schemas/UI. | Set `privacySensitive: true` (or document a narrower public-elections policy) and ensure mock/live redaction rules match justice/parliament patterns. |
| medium | src/lib/scraper-references/catalog.ts:117 | `private-companies-anaf` marked `privacySensitive: false` while sibling ONRC entry is true. | Document why ANAF public fiscal is non-sensitive, or align flags with combined profile privacy boundaries. |
| medium | src/schemas/public-investments.ts:1 | Public-investments schema module covers URL search state only; API payload shapes are TypeScript-only. | Add Zod payload schemas (or reuse feature types via `zod` inference) and parse mock/live adapter outputs at the trust/privacy boundary. |
| medium | src/features/elections/api/elections-api.mock.ts:31 | Elections mock adapter does not validate fixtures against `src/schemas/elections.ts` payload schemas. | Parse key responses (`ElectionSummary`, `ContestResults`, `Candidacy`) at mock export boundaries. |
| medium | src/lib/scraper-references/catalog.test.ts:15 | Tests cover path resolution and mock env parsing but not catalog metadata invariants. | Add catalog integrity tests: every `mockDataAvailable: true` entry has schema/feature paths; every feature `mock-mode` dataset id resolves via `getScraperDatasetById` or documented alias table. |
| medium | src/features/public-investments/api/public-investments-api.test.ts:34 | Mock/live switch tests exist for only one mock-first API facade. | Add table-driven tests per feature wrapper for default env, global mock, scoped mock, and live-not-connected behavior. |
| low | src/features/procurement/api/procurement-api.mock.ts:20 | Procurement mock adapter returns fixtures without Zod validation despite rich `src/schemas/procurement.ts` types. | Add response schemas in `procurement.ts` and parse in mock/live mappers similar to private-companies. |
| low | src/env.d.ts:24 | Mock-mode-related env vars used in code are missing from typed `ImportMetaEnv`. | Extend `ImportMetaEnv` / `ProcessEnv` with optional string entries for all mock/scraper env gates. |
| low | src/schemas/ngos.ts:485 | NGO services search schema allows free-text `q` without length/normalization guards. | If services search later hits live backends, add trim/max-length and document whether name search is allowed; add tests for abusive inputs. |
| info | src/lib/scraper-references/mock-mode.ts:7 | Central mock helper is solid and reused consistently, but domain wrappers encode conflicting default policies. | Document a small matrix of default behaviors in scraper-references mock-mode header and enforce one pattern per lifecycle (`loading`, `experimental`, `production`). |

## Detailed Evidence

### high: NGO mock gating treats any defined `VITE_MOCK_DATASETS` (including empty string) as opt-out of the default mock-first behavior.

- Location: `src/features/ngos/lib/mock-mode.ts:24`
- Evidence: `isNgoMockEnabled()` returns `NGO_DATASET_IDS.some(isMockDataEnabled)` when `typeof scoped === 'string'`, otherwise defaults `true`. With `VITE_MOCK_DATASETS=""` or a list omitting NGO ids, `isMockDataEnabled` is false for all NGO ids, so mocks turn off and live stubs throw via `assertLiveApiAvailable`.
- Recommendation: Only enter scoped mode when `scoped?.trim()` is non-empty; if scoped is set but no NGO id matches, keep mock-first default (or return a typed blocked/unavailable result). Align with documented mock-first intent in the file header.
- Residual risk: Production or dev `.env` files with empty or partial `VITE_MOCK_DATASETS` can silently route NGO pages to throwing live adapters.

### high: NGO mock dataset ids include multiple aliases not registered in `scraperDatasetCatalog`.

- Location: `src/features/ngos/lib/mock-mode.ts:3`
- Evidence: `NGO_DATASET_IDS` lists `ngos`, `ngos-social-services`, `ngos-mj-registry`, `ngos-public-utility`; catalog only defines `ngo-core`. Live stubs assert both `ngo-core` and `ngos-social-services`.
- Recommendation: Register lane-level catalog entries or collapse feature gating to `ngo-core` only; remove orphan ids from mock-mode and live asserts.
- Residual risk: Scoped mock toggles and catalog-driven tooling disagree on which env tokens enable NGO fixtures.

### high: Catalog `ngo-core` metadata contradicts the implemented NGO feature.

- Location: `src/lib/scraper-references/catalog.ts:341`
- Evidence: Entry has `clientFeaturePaths: []`, `clientSchemaPaths: []`, `mockDataAvailable: false`, while `src/features/ngos/` ships mocks, `src/schemas/ngos.ts`, and default-on mock mode.
- Recommendation: Set `mockDataAvailable: true`, point `clientFeaturePaths` to `src/features/ngos/`, `clientSchemaPaths` to `src/schemas/ngos.ts`, and add spec paths if they exist locally.
- Residual risk: `listMockFirstDatasets()` and mock-first docs omit NGOs; onboarding agents may assume no client surface exists.

### high: Public-investments mock gate includes umbrella id `public-investments` that is absent from the catalog.

- Location: `src/features/public-investments/lib/mock-mode.ts:9`
- Evidence: `PUBLIC_INVESTMENTS_DATASET_IDS` includes `'public-investments'` alongside `investments-anghel-saligny` and `investments-pndl`. Catalog has only the two investment dataset entries. `catalog.test.ts` asserts `isMockDataEnabled('public-investments')` with `VITE_MOCK_DATASETS=all`.
- Recommendation: Either add a catalog umbrella entry for the feature or drop the alias and document the two real dataset ids in UI copy/tests.
- Residual risk: Env docs and catalog registry drift; scoped toggles using catalog ids alone may not enable PI mocks unless global/all is used.

### high: Elections feature bypasses the shared mock-mode glue entirely.

- Location: `src/features/elections/api/elections-api.ts:22`
- Evidence: All exported fetchers call `*-Mock` directly; there is no `lib/mock-mode.ts`, no `isMockDataEnabled('elections')`, and no `*.live.ts` seam despite catalog entry `elections` with `mockDataAvailable: true`.
- Recommendation: Add feature mock-mode wrapper, live stub returning blocked/unavailable, and dispatcher mirroring justice/public-investments patterns before API cutover.
- Residual risk: Live adapter swap requires editing every caller; env-based QA of live vs mock is impossible.

### medium: Private-companies mock gate uses alias id `private-companies` not present in the catalog.

- Location: `src/features/private-companies/lib/mock-mode.ts:3`
- Evidence: `PRIVATE_COMPANY_DATASET_IDS` includes `'private-companies'` plus `private-companies-onrc` and `private-companies-anaf`. Catalog lists only the ONRC and ANAF entries.
- Recommendation: Remove the alias or add a feature-level catalog entry; prefer catalog ids only in env examples.
- Residual risk: Partial env scoping with catalog-accurate ids may fail to enable mocks for local UI work.

### medium: `procurementApi.isMock` is frozen at module import time.

- Location: `src/features/procurement/api/procurement-api.ts:39`
- Evidence: `isMock: isProcurementMockEnabled()` is evaluated once when the object is created; methods branch on `this.isMock` rather than calling the helper per request.
- Recommendation: Replace with a getter or invoke `isProcurementMockEnabled()` inside each method (same pattern as parliament/private-companies facades).
- Residual risk: Tests or runtime env changes after import observe stale mock/live mode; HMR may show wrong `DataStatusBadge` state.

### medium: Procurement ignores standard env gates whenever `procurementLiveApiReady()` is false (always today).

- Location: `src/features/procurement/lib/mock-mode.ts:16`
- Evidence: `isProcurementMockEnabled()` returns true if env matches OR `!procurementLiveApiReady()`, and `procurementLiveApiReady()` hardcodes `return false`.
- Recommendation: Keep mock-first default but document as explicit policy; when wiring live, gate on catalog `apiReady` or env and add tests for both paths.
- Residual risk: Accidental mock serving in production if live is wired but the hardcoded flag is not flipped.

### medium: Legal live adapters always assert only `legal-portal-legislativ`, even for landing data that includes Monitorul Oficial lanes.

- Location: `src/features/legal/api/legal-api.live.ts:21`
- Evidence: Both `fetchLegalActLive` and `fetchLegalLandingDataLive` call `assertLiveApiAvailable('legal-portal-legislativ', ...)`. Feature mock gate accepts either `legal-portal-legislativ` or `legal-monitorul-oficial`.
- Recommendation: Split live adapters by lane/dataset or assert both catalog ids where responses are composite.
- Residual risk: Partial live rollout of MO-only backend still trips portal gate; adapter swap is not lane-aligned with catalog.

### medium: Inconsistent live-not-connected UX patterns across mock-first domains.

- Location: `src/features/justice/api/justice-api.ts:34`
- Evidence: Justice live returns typed `JusticeUnavailableResult`; public-investments returns `DataResult` blocked objects; legal/public-enterprise/NGO live paths throw via `assertLiveApiAvailable`; parliament/private-companies default to live GraphQL when mock env is off.
- Recommendation: Standardize on one of: typed unavailable/blocked results (preferred for React Query hooks) or guarded throws with route-level error boundaries; document per-domain default when env unset.
- Residual risk: Hooks/pages must implement domain-specific failure handling; mixed throw vs status branching increases regression risk during adapter swaps.

### medium: Catalog `apiReady` flags are stale for domains with working live client adapters.

- Location: `src/lib/scraper-references/catalog.ts:96`
- Evidence: `private-companies-onrc` / `private-companies-anaf` and `political-parliament` have `apiReady: false`, but `private-company-api.live.ts` and `parliament-api.live.ts` perform real GraphQL fetches when mock mode is off.
- Recommendation: Mark live-ready datasets `apiReady: true` (or introduce partial-ready metadata) so `listMockFirstDatasets()` and procurement/parliament comments stay truthful.
- Residual risk: Tooling and comments continue to claim live is unwired, encouraging always-mock or throw patterns in new code.

### medium: Catalog `ins-indicators` client paths omit the statistics feature surface.

- Location: `src/lib/scraper-references/catalog.ts:62`
- Evidence: `clientFeaturePaths: ['src/lib/api/ins.ts']` while mock/live seam lives in `src/features/statistics/` with `src/schemas/statistics.ts`.
- Recommendation: Add `src/features/statistics/` and `src/schemas/statistics.ts` to catalog metadata.
- Residual risk: Cross-repo navigation and mock-first inventory under-report the INS/statistics product surface.

### medium: `elections` catalog entry marks `privacySensitive: false` despite person-linked candidacy labels in schemas/UI.

- Location: `src/lib/scraper-references/catalog.ts:541`
- Evidence: `candidacySchema` exposes `competitorLabel` / `allianceMemberLabel`; contest UI copy references published candidate names. Catalog marks `political-parliament` and `legal-judicial-cases` sensitive, but not `elections`.
- Recommendation: Set `privacySensitive: true` (or document a narrower public-elections policy) and ensure mock/live redaction rules match justice/parliament patterns.
- Residual risk: Privacy tooling and consent/analytics gates may under-protect election candidate surfaces.

### medium: `private-companies-anaf` marked `privacySensitive: false` while sibling ONRC entry is true.

- Location: `src/lib/scraper-references/catalog.ts:117`
- Evidence: Same feature/profile serves both datasets; ONRC lane flagged sensitive, ANAF fiscal lane not, without documented distinction in catalog description.
- Recommendation: Document why ANAF public fiscal is non-sensitive, or align flags with combined profile privacy boundaries.
- Residual risk: Inconsistent privacy classification for a single company profile composed from multiple datasets.

### medium: Public-investments schema module covers URL search state only; API payload shapes are TypeScript-only.

- Location: `src/schemas/public-investments.ts:1`
- Evidence: File defines enums and `*SearchSchema` parsers only. Domain payloads live in `src/features/public-investments/lib/types.ts` without Zod validation at the mock adapter boundary (unlike `ngos`, `justice`, `legal`, `public-enterprise`).
- Recommendation: Add Zod payload schemas (or reuse feature types via `zod` inference) and parse mock/live adapter outputs at the trust/privacy boundary.
- Residual risk: Fixture drift and live adapter regressions won't fail fast at the adapter seam.

### medium: Elections mock adapter does not validate fixtures against `src/schemas/elections.ts` payload schemas.

- Location: `src/features/elections/api/elections-api.mock.ts:31`
- Evidence: Mock functions return fixture objects directly; no `candidacySchema.parse`, `contestResultsSchema.parse`, etc., unlike `ngo-api.mock.ts` and `justice-api.mock.ts`.
- Recommendation: Parse key responses (`ElectionSummary`, `ContestResults`, `Candidacy`) at mock export boundaries.
- Residual risk: Schema/test drift until runtime UI breaks on missing fields or enum violations.

### medium: Tests cover path resolution and mock env parsing but not catalog metadata invariants.

- Location: `src/lib/scraper-references/catalog.test.ts:15`
- Evidence: Only five tests: dataset lookup, `listMockFirstDatasets`, path builder, and two `isMockDataEnabled` cases. No assertions that `clientFeaturePaths`/`clientSchemaPaths`/`mockDataAvailable` match existing files or feature mock-mode ids.
- Recommendation: Add catalog integrity tests: every `mockDataAvailable: true` entry has schema/feature paths; every feature `mock-mode` dataset id resolves via `getScraperDatasetById` or documented alias table.
- Residual risk: Catalog regressions ship unnoticed until env toggles or docs break.

### medium: Mock/live switch tests exist for only one mock-first API facade.

- Location: `src/features/public-investments/api/public-investments-api.test.ts:34`
- Evidence: Only public-investments API tests mock gating (enabled/disabled). No analogous tests for NGOs, legal, justice, procurement, public-enterprise, elections, or statistics facades; feature `mock-mode.ts` files have zero direct tests.
- Recommendation: Add table-driven tests per feature wrapper for default env, global mock, scoped mock, and live-not-connected behavior.
- Residual risk: Env-gate regressions in high-traffic domains won't be caught by CI.

### low: Procurement mock adapter returns fixtures without Zod validation despite rich `src/schemas/procurement.ts` types.

- Location: `src/features/procurement/api/procurement-api.mock.ts:20`
- Evidence: `fetchProcurementLandingMock` returns `procurementMockFixtures.landing` directly with no `.parse()`.
- Recommendation: Add response schemas in `procurement.ts` and parse in mock/live mappers similar to private-companies.
- Residual risk: Mock fixture shape drift until UI/runtime errors surface.

### low: Mock-mode-related env vars used in code are missing from typed `ImportMetaEnv`.

- Location: `src/env.d.ts:24`
- Evidence: Code references `VITE_NGO_USE_LIVE_API`, `VITE_JUSTICE_MOCK_VARIANT`, and `VITE_SCRAPPER_REPO_ROOT`; `env.d.ts` only declares `VITE_USE_MOCK_DATA` and `VITE_MOCK_DATASETS`.
- Recommendation: Extend `ImportMetaEnv` / `ProcessEnv` with optional string entries for all mock/scraper env gates.
- Residual risk: Weaker IDE/typecheck discovery of mock-mode configuration; easier to misconfigure env silently.

### low: NGO services search schema allows free-text `q` without length/normalization guards.

- Location: `src/schemas/ngos.ts:485`
- Evidence: `ngoServicesSearchSchema` accepts arbitrary `q` strings (only non-string garbage dropped). Unlike justice case search, there is no closed allowlist for people-shaped queries.
- Recommendation: If services search later hits live backends, add trim/max-length and document whether name search is allowed; add tests for abusive inputs.
- Residual risk: Low while mock-only; increases exposure once live search adapters accept `q`.

### info: Central mock helper is solid and reused consistently, but domain wrappers encode conflicting default policies.

- Location: `src/lib/scraper-references/mock-mode.ts:7`
- Evidence: `isMockDataEnabled` correctly supports global, scoped, case-insensitive ids, and `all`. Feature wrappers then layer unlike defaults: opt-in (PI), opt-out/mock-always (procurement/NGO default), live-default (statistics/parliament/private-companies), typed unavailable (justice).
- Recommendation: Document a small matrix of default behaviors in scraper-references mock-mode header and enforce one pattern per lifecycle (`loading`, `experimental`, `production`).
- Residual risk: Developers must read each feature's mock-mode file to know runtime behavior without env vars.

## Residual Risk

Even after catalog and env-gate cleanup, adapter-swap readiness will remain uneven until all mock-first domains share the same live-not-connected contract, validate payloads at adapter boundaries, and have facade-level tests. Elections and public-investments remain the largest gaps for mock/live parity; parliament and private-companies already live-wired but catalog-underreported.
