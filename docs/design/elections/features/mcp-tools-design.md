# Feature: Elections MCP Tools (agent/analyst access)

> Self-sufficient spec. Foundation: `docs/design/README.md`. Domain:
> `../design.md` (data contract §6). UX: `docs/ux-research/elections.md`
> §13 high-value-next ("MCP tools"), §15 (guardrails). Tool contracts, not a
> client UI page.

## Feature owner profile

Full-stack / API engineer who owns MCP tool contracts for the platform
(matching the pattern used by other domains' MCP tools). Defines tool name,
input/output JSON schemas, guardrails, and error semantics. The client consumes
results through the standard `src/lib/api` GraphQL/REST adapter; this doc is the
**contract** the elections backend + MCP layer must honor so the same
view-model types power both the UI and agents.

## Summary

Four MCP tools give agents and analysts structured, provenance-carrying access
to elections data, mirroring the UI's data contract so a tool result is directly
renderable and citable:

1. `resolve_election_filters` — turn natural-language/loose params into canonical
   election/contest/geography selectors (parallels other domains'
   `resolve_*_filters`).
2. `get_election_results` — ranked results + turnout for a contest at a geography.
3. `get_competitor_history` — a competitor's cross-election appearances.
4. `get_contest_mandates` — mandate allocations (and gated named-mandate status).

## Route and URL state

- **Decision:** This feature has no public client route. It is a structured
  tool/API contract for implementation under the platform MCP/API layer.
- **Decision:** UI pages consume the same view-model shapes through their normal
  route adapters: `/alegeri/contest/$contestKey`,
  `/alegeri/partid/$competitorKey`, `/alegeri/candidat/$candidateKey`, and
  `/alegeri/mandate/$contestKey`.
- **Decision:** Tool inputs use canonical keys from `resolve_election_filters`
  rather than URL search params; any UI route state is mapped to those tool
  inputs by the feature API adapter.

## Facts / Decisions / Assumptions

- **Fact:** No elections MCP tool exists today; this defines the target.
- **Fact:** All serving rows carry source pointers; mandates are allocation-only;
  candidate names are source labels; results ≠ parliamentary votes.
- **Decision:** Every tool output embeds the same `SourcePointer`/`CoverageMeta`
  shapes as the UI (domain §6) so agents can cite sources and respect coverage.
- **Decision:** Tools enforce the domain guardrails in their **output copy and
  flags**, not just the UI: candidate results include
  `identityStatus:'unresolved'`; mandate outputs include
  `namedMandatesStatus:'pending'`; result outputs include a
  `resultKind:'election_result'` discriminator so an agent cannot conflate them
  with `parliament` vote tools.
- **Decision:** Tools are **read-only**, paginated, and bounded — no tool returns
  unbounded polling-station grain in one call; `get_election_results` defaults to
  the requested geography level and exposes children keys for follow-up calls.
- **Decision:** `resolve_election_filters` is the entry tool: agents call it
  first to get canonical keys, then call the data tools — avoiding fuzzy direct
  queries against 102M rows.
- **Assumption:** Backend serves pre-aggregated contest/competitor read models;
  tool latency targets assume that, not raw aggregation.

## Tool contracts

### 1. `resolve_election_filters`

- **Purpose:** map loose inputs (year, family text, place name, office,
  competitor/candidate label) to canonical keys + disambiguation candidates.
- **Input:**
  ```ts
  {
    query?: string            // free text, e.g. "locale 2024 Cluj primar"
    family?: ElectionFamily | string
    year?: number; yearFrom?: number; yearTo?: number
    round?: number
    office?: string
    place?: string            // name; resolved to reporting_unit candidates
    sirutaCode?: string
    competitorLabel?: string
    candidateLabel?: string
    limit?: number            // default 10
  }
  ```
- **Output:**
  ```ts
  {
    elections: ElectionSummary[]
    contests: ContestSummary[]
    reportingUnits: ReportingUnitRef[]
    competitors: { competitorKey; sourceLabel; normalizedLabel; competitorType }[]
    candidates: { candidateKey; sourceCandidateLabel; sourcePersonName | null;
                  identityStatus: 'unresolved' }[]
    ambiguous: boolean        // true when multiple plausible matches
    coverage: CoverageMeta
  }
  ```
- **Notes:** never auto-picks a single candidate identity from a name; returns
  all source-label matches with the unresolved flag.

### 2. `get_election_results`

- **Purpose:** ranked competitor/candidate results + turnout for a contest at a
  geography level.
- **Input:**
  ```ts
  {
    contestKey: string            // required (from resolve)
    reportingUnitKey?: string     // default: contest scope
    scope?: 'national'|'county'|'siruta'|'diaspora'|'polling_station'
    metric?: string               // default 'voturi'
    includeChildren?: boolean     // default true -> returns child unit keys
    page?: number; pageSize?: number  // for polling_station scope only
  }
  ```
- **Output:** `ContestResults` (domain §6) extended with
  `resultKind: 'election_result'` and `childrenKeys: string[]`. Each
  `CompetitorResult.provenance` is a full `SourcePointer`. Missing metrics are
  `null` (never `0`); inaccessible sources flagged via `accessStatus`.
- **Guardrail:** `resultKind` discriminator + no parliamentary-vote fields.

## UI structure

- **Decision:** No standalone UI page is built for this feature.
- **Decision:** The implementation-facing artifact is a schema/contract module
  plus fixtures and smoke examples; visible UI appears only when the consuming
  elections pages render returned data or errors.
- **Decision:** Human-readable tool examples should be documented in developer
  docs or Storybook-style fixtures, not as a public route.

### 3. `get_competitor_history`

- **Purpose:** a competitor's appearances across elections.
- **Input:**
  ```ts
  {
    competitorKey: string         // required
    family?: ElectionFamily | string
    office?: string
    yearFrom?: number; yearTo?: number
    includeArchive?: boolean      // default false (2008–2025 only)
    metricKind?: 'vote_share'|'votes'|'mandates'  // default 'vote_share'
  }
  ```
- **Output:** `CompetitorProfile` (domain §6) including `aliasHint` and
  `canonicalPartyKey: null` (until linked). Appearances carry provenance.
- **Guardrail:** grouped strictly by `competitor_key`; aliases listed, never
  merged; mandates labeled as allocations.

### 4. `get_contest_mandates`

- **Purpose:** mandate allocations by phase for a contest, plus named-mandate
  status.
- **Input:** `{ contestKey: string; phase?: 'faza_1'|'faza_2'|'final'|'toate' }`
- **Output:**
  ```ts
  {
    contest: ContestSummary
    allocations: MandateAllocation[]            // populated
    namedMandatesStatus: 'pending' | 'ready'
    namedMandates?: NamedMandate[]              // only when 'ready'
    namedMandatesReason?: string                // gate rationale when 'pending'
    coverage: CoverageMeta
  }
  ```
- **Guardrail:** allocations are not named persons; named persons only when the
  gated loader has run and full evidence exists.

## Data contract and mock states

Each tool maps 1:1 to the UI view models (domain §6), so the same mock fixtures
back both. During mock-first, tools are served by the mock adapter
(`src/features/elections/api/elections-api.mock.ts`) behind the same
`isMockDataEnabled('elections')` switch; the MCP layer calls the same functions.

Mock states to demonstrate per tool: ambiguous resolve; clean results; results
with missing metric / inaccessible source; competitor with aliases + archive
filter; mandates pending vs ready (mock flag).

## Interactions (agent flow)

1. Agent calls `resolve_election_filters` → canonical keys (+ disambiguation if
   `ambiguous`).
2. Agent calls `get_election_results` / `get_competitor_history` /
   `get_contest_mandates` with canonical keys.
3. Agent cites `provenance` + `coverage` in its answer; respects `identityStatus`
   and `namedMandatesStatus` flags in wording.

## Loading / empty / error / partial / stale states

- **Empty:** valid key, no data at geography → `{ ...empty arrays, coverage }`;
  never fabricated zeros.
- **Error:** invalid key → typed error (`not_found`); ambiguous resolve →
  `ambiguous:true` with candidates, not an error.
- **Partial:** `null` metrics + `coverage.knownGaps`; inaccessible →
  `accessStatus` on pointers.
- **Stale:** `coverage.retrievedAt`/`publishedAt` populated.
- **Bounds:** polling-station scope requires pagination; tool rejects unbounded
  full-grain requests with a clear message.

## Accessibility and i18n

- Tool outputs are data, not UI; labels stay source-verbatim (Romanian) so the
  client renders them via Lingui. Numeric fields are raw numbers (client formats
  locale-aware), not pre-formatted strings.

## Privacy, provenance, source citation

- Every data row carries a `SourcePointer`; every response carries
  `CoverageMeta`.
- Candidate outputs carry `identityStatus:'unresolved'` and never assert a
  resolved person.
- `resultKind`/`namedMandatesStatus` discriminators prevent agents from
  conflating election results with parliamentary votes or allocations with named
  winners.
- No Wikipedia/QC-only data is ever returned as canonical.

## Acceptance checklist

- [ ] Four tools defined with input/output schemas matching domain §6 types.
- [ ] `resolve_election_filters` returns canonical keys + `ambiguous` flag and
      never auto-resolves a candidate identity.
- [ ] `get_election_results` carries `resultKind:'election_result'`, provenance,
      and `null` (not `0`) for missing metrics.
- [ ] `get_competitor_history` groups by `competitor_key`, lists aliases,
      `canonicalPartyKey:null`.
- [ ] `get_contest_mandates` returns allocations + `namedMandatesStatus`.
- [ ] All outputs carry `CoverageMeta`; inaccessible sources flagged, not zeroed.
- [ ] Mock-backed via the same `isMockDataEnabled('elections')` adapter.

## Non-goals

- Write/mutation tools (read-only domain).
- A polling-station bulk-export tool (bounded/paginated only; bulk export is a
  separate gated decision).
- Identity-resolution or parliament-link tools (pending data; future).

## Open questions (blockers only)

None for contract definition. **Dependency (not a design blocker):** whether
elections gets a dedicated server module (GraphQL + MCP) or a generic
contributor (UX §16 Q6) affects implementation location, not the tool contract —
the contract is serveable by either, mock-first today.
