# Feature: Global Search Integration (elections hits → /alegeri)

> Self-sufficient spec. Foundation: `docs/design/README.md` (Route Strategy,
> global search). Domain: `../design.md`. UX: `docs/ux-research/elections.md`
> §9, §11, §13 high-value-next. Touches the existing entity-search feature.

## Feature owner profile

Frontend feature engineer (React 19, TypeScript, Lingui) familiar with the
existing **entity-search** feature (`src/features/entity-search`) — pure routing
table, doc-type metadata, Zod doc-type enum, and unit tests. No new page; this
wires elections entities into global search.

## Summary

Make competitor/party, candidate, election, contest, referendum, and reporting-
unit hits from the global entity-search route into the correct `/alegeri` detail
pages, with election-appropriate badges and the source-evidence/identity caveats
preserved in result rows. Extends the existing table-driven routing
(`entity-search-routing.ts`) and badge map (`doc-type-meta.ts`) without breaking
current behavior.

## Facts / Decisions / Assumptions

- **Fact:** Existing routing (`src/features/entity-search/lib/entity-search-routing.ts`)
  is pure + table-driven: CUI-spine types → `/entities|/companies`, parliament
  types → `/parlament/...`, interim types → external `url`; returns `null` when
  no target can be built.
- **Fact:** `doc-type-meta.ts` maps each `EntitySearchDocType` to label/color/
  icon; `getDocTypeMeta` degrades unknown types to a neutral fallback.
- **Fact:** `ENTITY_SEARCH_DOC_TYPES` (`src/schemas/entity-search.ts`) is the
  allowed enum; `docType` on a hit is typed `string` so unknown types don't
  crash.
- **Fact:** No elections backend/search index exists yet; elections doc types
  are **not emitted today** and will return 0 rows until indexed.
- **Decision:** Add six election doc types and route them internally:

  | docType | route | key source |
  | --- | --- | --- |
  | `election` | `/alegeri/$electionKey` | `docId` (electionKey) |
  | `contest` | `/alegeri/contest/$contestKey` | `docId` |
  | `referendum` | `/alegeri/referendum/$contestKey` | `docId` |
  | `competitor` | `/alegeri/partid/$competitorKey` | `docId` |
  | `candidate` | `/alegeri/candidat/$candidateKey` | `docId` |
  | `reporting_unit` | `/alegeri/loc/$reportingUnitKey` | `docId` |

- **Decision:** Each routes off its `docId` (best-effort, mirroring the existing
  parliament pattern); when `docId` is missing, fall back to `url`, else `null`
  (non-clickable row), never a broken `#`.
- **Decision:** `candidate` result rows carry the source-evidence caveat inline
  (a small "nume din sursă" hint) so the identity contract holds even in search.
- **Decision:** Keep elections types as **valid-but-possibly-empty** enum
  members (like the already-present `member`/`bill`/`mo_act` that return 0 rows
  today) so facets render and routing is ready before the index ships.
- **Assumption:** The server will emit `docId` = the relevant `*_key`; if it
  instead emits a composite `docKey`, the adapter maps `docKey`→key in one place.

## Route and URL state

No new route. Edits:

- `src/schemas/entity-search.ts` — extend `ENTITY_SEARCH_DOC_TYPES` with
  `election, contest, referendum, competitor, candidate, reporting_unit`.
- `src/features/entity-search/lib/entity-search-routing.ts` — add an
  `ELECTIONS_ROUTES` table analogous to `PARLIAMENT_ROUTES`, consulted before the
  external-url fallback.
- `src/features/entity-search/lib/doc-type-meta.ts` — add badge metadata for the
  six types.
- Search results may pass `from=search&q=...` to the target via query params for
  backtracking (foundation cross-domain rule).

## Data contract and mock states

Reuses the existing `EntitySearchHit` (`src/schemas/entity-search.ts`):
`{ id, docType, docId, docKey, cuis, url, title, ... }`. For elections hits:
`docType` ∈ the six new values, `docId` = the entity key, `title` = source label
(competitor/candidate verbatim; election/contest name; unit name).

Mock fixtures (extend entity-search mocks): add ≥1 hit per elections doc type,
including a `candidate` hit (with the caveat hint), a `competitor` hit with an
alias-y label, a `reporting_unit` hit, and one with missing `docId` (→
non-clickable).

States: clickable internal route; missing-docId non-clickable; mixed result set
with elections + existing domains; empty elections facet (0 rows).

## UI structure

No new page. Changes are in result-row rendering and facets:

1. **Badge meta** (`doc-type-meta.ts`) — Romanian labels + a shared election
   accent (distinct from parliament rose and procurement amber) + lucide icons:
   - `election`: `Vote` · `Alegeri`
   - `contest`: `ListChecks` · `Scrutin`
   - `referendum`: `MessageSquareText` · `Referendum`
   - `competitor`: `Flag` · `Partid / competitor`
   - `candidate`: `User` · `Candidat (din sursă)`
   - `reporting_unit`: `MapPin` · `Loc / geografie`
2. **Result row** — for `candidate`, append a muted "nume din sursă" hint
   (reuse `entity-result-row` slot); rows route via `entityHref`.
3. **Facets** — elections types appear in `entity-facet-chips`; empty facets show
   0 like other not-yet-indexed types.

## Component reuse and new components

- Reuse: all existing entity-search components
  (`entity-result-row`, `entity-type-badge`, `entity-facet-chips`,
  `entity-search-results`); `getDocTypeMeta`; `entityHref`.
- New: none (table + meta extensions only). Add unit tests mirroring
  `entity-search-routing.test.ts` and `doc-type-meta.test.ts`.

## Interactions

- Clicking an elections hit navigates to its `/alegeri` route (internal, no new
  tab) when `docId` present; otherwise the row is non-clickable (existing
  behavior).
- Facet chips filter `docTypes` including the new election types.
- Target pages may read `from`/`q` for backtracking.

## Loading / empty / error / partial / stale states

- **Loading:** unchanged (existing search skeleton).
- **Empty elections facet:** renders 0; not an error (types valid-but-empty).
- **Missing docId:** non-clickable row (no broken link).
- **Unknown future election subtype:** `getDocTypeMeta` fallback badge; routing
  returns `null` → non-clickable. No crash.

## Accessibility and i18n

- Badges have text labels (not color/icon only); icons `aria-hidden`.
- Non-clickable rows are not focusable as links.
- Lingui macros for all new labels and the "nume din sursă" hint; Romanian
  primary.

## Privacy, provenance, source citation

- `candidate` rows preserve the source-evidence/identity caveat inline.
- No new personal data surfaced in search; titles are source labels.
- Routing never invents identity links; it only deep-links to the (caveated)
  profile pages.

## Acceptance checklist

- [ ] Six election doc types added to the enum, routing table, and badge meta.
- [ ] Each routes to the correct `/alegeri/...` page off `docId`, with `url`/
      `null` fallback preserved.
- [ ] `candidate` rows show the "nume din sursă" caveat.
- [ ] Empty elections facets render 0 without errors; unknown subtypes degrade.
- [ ] Unit tests cover routing + meta for all six types.
- [ ] Existing search behavior unchanged; `yarn typecheck` clean; Lingui copy.

## Non-goals

- Building the elections search index / server (backend work).
- New search UI/page (reuses existing entity-search surface).
- Ranking/relevance tuning for elections hits.

## Open questions (blockers only)

None for the client wiring. **Dependency (not a design blocker):** elections
types stay empty until the server indexes them and emits `docId` as the entity
key; if it emits a composite `docKey` instead, map it in the single routing
adapter.
