# Feature: Name-Only Registry Surfaces (MJ & SGG)

> Next-2 — surface the raw registries honestly without violating the no-merge rule.
> Source UX: `docs/ux-research/ngos.md` §10.4, §13 Next-2, §15 (name collisions,
> identity uncertainty). Domain design: `docs/design/ngos/design.md`. Depends on
> `identity-confidence-communication.md` (MVP-4) and `evidence-trail-source-citations.md`
> (MVP-3).

## Feature owner profile

Frontend implementation subagent specializing in **faceted listing surfaces with strong
data-provenance and careful identity framing** (React 19 + TypeScript, TanStack Router
with Zod `validateSearch`, shadcn `Table`/`Sheet`, Lingui). Must rigorously apply the
unconfirmed-identity language and never collapse records by name.

## Summary

Two public-but-clearly-unconfirmed listing pages: the **MJ National NGO Registry**
(`/ong-uri/registru`, 126,011 raw name-only rows) and the **SGG public-utility
recognitions** (`/ong-uri/utilitate-publica`, 229 raw name-only rows). Both present
records as *registry references whose identity is not confirmed against a CUI*, with
disambiguating fields, candidate-match links where review cases exist, and full
provenance — honoring the deliberate no-auto-merge design.

## Facts / Decisions / Assumptions

- **Fact:** `legal_registry_records` (MJ) and `public_utility_status` (SGG) are
  name-only and NOT promoted to confirmed identity (`link_status` default
  `review_pending`).
- **Fact:** MJ fields available: `entity_kind`, `registry_number`, `court_name`,
  `organization_name`, `legal_form`, `registry_status`, `county`, `locality`,
  `address`, `link_status`. **`document_date`/`document_number` are dead columns — do
  not render.**
- **Fact:** SGG fields available: `organization_name`, `recognizing_authority`,
  `hg_number`, `status`, `link_status`. **`hg_date`/`recognition_year`/`order_number`
  are ~0% populated** (source provides only the HG decree identifier) — suppress when
  empty.
- **Fact:** MJ = 126,011 raw rows (large; must paginate/virtualize); SGG = 229 (small).
- **Fact:** `link_review_cases` may link a name-only record to a candidate CUI org with
  a `confidence` and `compared_fields`.
- **Decision:** Routes `/ong-uri/registru` (MJ) and `/ong-uri/utilitate-publica` (SGG).
- **Decision:** Every record uses `UnconfirmedRecordCard` + `IdentityConfidenceBadge`
  (unconfirmed/candidate) inside the `UnconfirmedReferencesZone` framing; a page-level
  `PrivacyBoundaryNotice` explains why these are not confirmed profiles.
- **Decision:** Never collapse/dedupe by name — always show disambiguating fields
  (county, court, registry number, address) so two similarly-named ONGs stay distinct
  (UX §15 name collisions).
- **Decision:** A candidate match links to the confirmed ONG profile only when a
  `link_review_case` with confidence exists, labeled "Posibilă potrivire (încredere
  X%)".
- **Assumption (non-blocking product decision):** These pages are **public** in v1 with
  prominent unconfirmed framing (watchdog value), per the orchestrator's mandate to
  surface name-only records as visibly unconfirmed. If product later prefers
  watchdog/staff-gating, the same surfaces move behind auth without redesign. Recorded
  as the one open product question (UX §16 Q3).

## Route and URL state

### `/ong-uri/registru` (MJ)
- File route `ong-uri.registru.tsx`. Search params (Zod, all optional):
  - `q?` — organization name / registry number.
  - `county?`, `locality?` — single values.
  - `court?` — court name.
  - `legal_form?` — comma-separated multi.
  - `registry_status?` — comma-separated multi.
  - `link_status?: 'review_pending' | 'accepted' | 'rejected'` — default none.
  - `sort?: 'nume' | 'judet' | 'numar_registru'` — default `nume`.
  - `page?`, `pageSize?` — default pageSize 50 (large dataset; virtualized list).

### `/ong-uri/utilitate-publica` (SGG)
- File route `ong-uri.utilitate-publica.tsx`. Search params:
  - `q?` — organization name / HG number.
  - `authority?` — recognizing authority (multi).
  - `status?` — recognition status (multi).
  - `link_status?` — as above.
  - `sort?: 'nume' | 'hg'` — default `nume`.
  - `page?`, `pageSize?` — default 50 (only 229 rows; pagination optional but consistent).

- **Decision:** Default views render with no params. Filters shareable via URL
  (`ShareFilteredView`).

## Data contract and mock states

Consumes `LegalRegistryRecord`, `PublicUtilityStatus`, `LinkReviewCase`,
`SourceSnapshot` from `design.md` §6.

```ts
type NameOnlyRow<T> = T & {
  identity: IdentityConfidence          // basis name_review/none + review/confidence
  candidate?: {                         // present only when a review case exists
    cui: string
    name: string
    confidence: number
    linkReviewCaseId: string
  } | null
}

type RegistryListResult = {
  rows: NameOnlyRow<LegalRegistryRecord>[]
  total: number
  snapshotId: string
}
type PublicUtilityListResult = {
  rows: NameOnlyRow<PublicUtilityStatus>[]
  total: number
  snapshotId: string
}
```

**Mock states (per page):**
1. **Populated** — many rows, mixed `link_status`, a few with candidate matches.
2. **Name collision** — two rows with near-identical names, different county/court/
   registry number — both shown distinctly.
3. **Candidate match present** — a row linking to a confirmed ONG at confidence 0.62.
4. **Sparse SGG row** — only `organization_name` + `hg_number` + `status` populated;
   empty `hg_date`/`order_number`/`recognition_year` suppressed.
5. **No results** — filter yields nothing → `EmptyState`.

Mark with `DataStatusBadge variant="mock"`.

## UI structure

Constrained `max-w-5xl` (SGG) / wider list (MJ). 8pt grid.

1. **Header:** title (MJ: "Registrul național ONG (Ministerul Justiției) — referințe";
   SGG: "Recunoașteri de utilitate publică (SGG) — referințe") + `text-2xl
   font-semibold`.
2. **Page-level `PrivacyBoundaryNotice` (prominent):** "Aceste înregistrări provin din
   registre publice și NU au fost asociate unui CUI confirmat. Sunt afișate ca
   referințe de registru, nu ca profiluri confirmate de organizație. O potrivire cu o
   organizație confirmată este afișată doar când există un caz de revizuire."
3. **`CoverageRibbon`:** source + snapshot + row count + "identitate neconfirmată".
4. **Sticky filter bar:** per the route's params (`county`, `court`, `legal_form`,
   `registry_status`, `link_status` for MJ; `authority`, `status`, `link_status` for
   SGG) + free-text `q`. Active filters as `FilterTag`s.
5. **Results list:** `UnconfirmedRecordCard` rows (or a `Table` with an amber
   left-accent), each showing:
   - MJ: organization name, `IdentityConfidenceBadge` (neconfirmat/candidat),
     registry number, court, legal form, registry status, county · locality, address.
   - SGG: organization name, identity badge, recognizing authority, "Recunoscut prin
     HG nr. <hg_number>" (suppress empty date/order/year), status.
   - `link_status` shown in plain language.
   - Candidate match (if any): "Posibilă potrivire: <ONG name> (încredere X%) →"
     opening the review-case detail and linking to `/ong-uri/$cui` labeled candidate.
   - Source chip → `/ong-uri/sursa/$snapshotId`.
6. **Pagination** (MJ virtualized for 126k rows).

## Component reuse and proposed new components

- **Reuse:** `Table`/list, `filter-tag`/`active-filters-bar`, `Select`,
  `styled-multi-select`, `county-filter`, `debounced-status-input`, `Pagination`,
  `Sheet` (filters/mobile), `Badge`, `Skeleton`, `EmptyState`, `Button`, `ScrollArea`.
- **Consume:** `IdentityConfidenceBadge`, `UnconfirmedReferencesZone` (MVP-4),
  `PrivacyBoundaryNotice`, `SourceCitationChip`, `CoverageRibbon`, `FreshnessBadge`,
  `DataStatusBadge`, `ShareFilteredView`.
- **New (owned here, reused by the profile references zone):**
  - `UnconfirmedRecordCard` — name-only record card with disambiguating fields +
    explicit unconfirmed header + optional candidate-match row.
  - `NameOnlyListPage` — generic faceted name-only listing shell parameterized for MJ
    vs SGG.

## Interactions

- Filter change → URL params → refetch (debounced `q`); MJ list virtualizes.
- Candidate match → opens review-case detail (drawer: `compared_fields`, `confidence`,
  `decision_notes`) and offers a labeled link to the candidate `/ong-uri/$cui`.
- Source chip → snapshot provenance page.
- Copy current view (`ShareFilteredView`).
- Keyboard: filters reachable; cards/links focusable; drawer focus-trapped.

## Loading, empty, error, partial, stale states

- **Loading:** filter bar immediate; list shows row skeletons; MJ uses progressive/
  virtualized loading.
- **Empty:** no results → `EmptyState` + clear-filters.
- **Partial:** missing optional fields → "—"/"Localitate necunoscută"; SGG empty
  decree sub-fields suppressed (not "—" noise — they're structurally absent).
- **Stale:** snapshot freshness shown; MJ/SGG are reference snapshots, framed as such.
- **Error:** fetch failure → inline `Alert` + retry; URL preserved; invalid params
  normalized by `validateSearch`.

## Accessibility and i18n

- Records never rely on color alone for "unconfirmed" — text + icon + badge + zone
  heading all carry it.
- Tables/lists semantic; drawer focus-managed; filters labeled.
- Lingui throughout; expand MJ/SGG/HG/CUI/ONG; locale-aware counts.
- Copy guardrail: `referință din registru — identitate neconfirmată` and `Posibilă
  potrivire`.

## Privacy, provenance, and source-citation behavior

- The entire feature is built around honest unconfirmed framing: page notice, per-row
  badge, no name-collapsing, candidate-only-with-evidence.
- No speculative "this is the same org" language anywhere.
- Full provenance per record via source chip → snapshot page.
- `PrivacyBoundaryNotice` explains why these are references, not profiles.

## Acceptance checklist

- [ ] `/ong-uri/registru` and `/ong-uri/utilitate-publica` routes exist with Zod
      `validateSearch`; default views render without params.
- [ ] Prominent page-level unconfirmed-identity notice on both pages.
- [ ] Records show disambiguating fields and are never collapsed by name.
- [ ] Dead/empty fields suppressed (MJ `document_*`; SGG `hg_date`/`order_number`/
      `recognition_year`).
- [ ] Candidate matches appear only when a `link_review_case` with confidence exists,
      labeled as candidates, linking to `/ong-uri/$cui`.
- [ ] MJ list virtualizes/paginates for 126k rows; SGG paginates 229 rows.
- [ ] Every record cites its snapshot via chip → `/ong-uri/sursa/$snapshotId`.
- [ ] All five mock states (per page) render; mock surfaces marked with `DataStatusBadge`.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled.

## Non-goals

- No accept/reject/merge actions (that's the staff link-review queue, advanced ADV-1).
- No automatic identity resolution in the client.
- No presenting any name-only record as a confirmed ONG profile.

## Open questions (blockers only)

- **Product decision (non-blocking for build):** publish these public in v1 (current
  assumption, with unconfirmed framing) vs. gate behind watchdog/staff auth until
  review matches exist (UX §16 Q3). The build supports both; only the route's auth
  guard changes.
