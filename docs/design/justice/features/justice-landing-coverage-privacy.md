# Feature: Justice Landing + Coverage / Privacy Honesty

Domain: Justice · Priority: **MVP #4** · Status: build-ready
Route: `/justitie` · Companion: `../design.md`, `../ux.md` ·
Source: `docs/ux-research/justice.md` §13.4, §10.1, §15

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + TanStack Query +
shadcn/ui + Lingui). Builds the domain entry surface and the shared `route.tsx`
layout that hosts breadcrumb + sub-nav for all `/justitie/*` pages. No backend.

## Summary

The justice domain entry page. Presents headline corpus counts with coverage context
("6,3M cauze • date dense din 2021 • fără ICCJ • doar metadata"), a court-tier
breakdown, a list of top courts by volume, a clearly worded privacy/availability
notice, an entry search box (court / case number / publishable litigant — never
person), and a court picker. Its primary job is to set honest expectations about what
is and isn't available, and why.

## Facts / Decisions / Assumptions

- **Fact:** Corpus scale: `justice.cases` = 6,334,777; ~18.62M hearings; ~2.25M
  appeals; 16.76M party mentions; 246 courts; 745,538 publishable name keys.
- **Fact:** Coverage: dense ≈ 2021+ (2024=1.44M, 2023=1.34M, 2025=1.27M, 2026=475k,
  2022=458k, 2021=153k, 2020=59k); ~757k non-standard numbers; pre-2013-05
  unreachable. ICCJ absent; no case documents; persons name-nulled.
- **Fact:** Court tiers: 179 judecătorii, 46 tribunale, 5 tribunale militare, 15
  curți de apel, 1 Curtea Militară de Apel.
- **Decision — `/justitie/route.tsx` layout** wraps all domain pages: breadcrumb,
  slim sub-nav (Prezentare / Caută cauze / Instanțe), and a `CoverageRibbon` slot.
- **Decision — entry search routes to `/justitie/cautare`** with the typed query in
  `q`; the box never accepts/encourages person-name search (placeholder + helper text
  make this explicit).
- **Decision — privacy notice is prominent, not a footnote** — a dedicated band, not
  hidden in docs (foundation: expose data limits near primary content).
- **Assumption:** landing counts are served as a single small aggregate payload
  (no client aggregation). The mock returns the figures above as `live`-shaped data
  with `status: 'mock'`.

## Route and URL state

- `src/routes/justitie/route.tsx` — layout (no search params of its own).
- `src/routes/justitie/index.tsx` — landing content.

```ts
export const Route = createFileRoute('/justitie/')({
  loader: async () => fetchJusticeOverview(),
  head: () => ({ meta: [{ title: 'Justiție — Transparenta.eu' }] }),
})
```

- No required search params; default renders fully. The entry search composes a
  navigation to `/justitie/cautare?q=…` (and `court=…` when chosen via picker).

## Data contract and mock states

Adapter `fetchJusticeOverview()`:

```ts
type JusticeOverview = {
  totals: {
    cases: number; hearings: number; appeals: number;
    partyMentions: number; courts: number; publishableNameKeys: number
  }
  coverage: {
    denseSinceYear: number                  // 2021
    yearCounts: { year: number; count: number }[]
    nonStandardNumberCount: number          // ~757k
    iccjIncluded: false
    hasCaseDocuments: false
    personsNamed: false
  }
  byTier: { tier: JusticeCourt['courtLevel']; courtCount: number; caseCount: number | null }[]
  topCourts: { institutionCode: string; courtName: string; caseCount: number }[]   // top N by volume
  provenance: JusticeProvenance
}
```

**Mock states:** (a) full overview (default), (b) stale (older `lastModifiedAt` →
muted freshness), (c) partial (totals present, topCourts fails → render totals +
note), (d) error (retry block).

## UI structure

1. **Page title** `Justiție` (first-level, larger type) + one-line intent
   ("Date publice despre dosare și instanțe, cu protecția persoanelor").
2. **`CoverageRibbon`** directly under the title: source `portal_just`, freshness,
   gaps `["date dense din 2021", "fără ICCJ", "doar metadata, fără documente"]`,
   `DataStatusBadge`.
3. **Hero counts band:** 4–6 compact stat blocks (Cauze, Ședințe, Apeluri, Instanțe,
   Nume publicabile) — locale-formatted; not nested cards; each with a short caption.
4. **Entry search:** a prominent `SearchInput` + `CourtPicker` with helper text:
   "Caută după instanță, număr de dosar (NNNN/CC/YYYY) sau companie/instituție. Nu
   se caută persoane fizice." Submitting → `/justitie/cautare`.
5. **Court-tier breakdown:** small horizontal bar list (tier → court count / case
   count) with the explicit "ICCJ neinclus din această sursă" note.
6. **Top courts by volume:** ranked list → each links to
   `/justitie/instante/$courtId`.
7. **Privacy & availability band:** dedicated section using
   `PrivacyBoundaryNotice(persons-suppressed)` + bullet list (persons not named, no
   person search, candidate-only company links, no case documents, metadata only,
   data updates over time). Link to the full privacy page if one exists.
8. **Coverage detail:** `yearCounts` mini area chart + fallback table showing the
   thinning before 2021; `SourceProvenanceDrawer` trigger.

## Component reuse and new components

- Reuse: `Badge`, `Table`, `Tooltip`, `Skeleton`, `EmptyState`, `ChartRenderer`
  (`TimeSeriesAreaChart`), `breadcrumb`, `button`, `SearchInput` (filters base).
- New shared (data-trust): `CoverageRibbon`, `DataStatusBadge`, `FreshnessBadge`,
  `PrivacyBoundaryNotice`, `SourceProvenanceDrawer`.
- New justice: `CourtPicker` (searchable court combobox by name/locality/county/tier;
  `Popover` + `Command`/`Select`), `JusticeStatBlock` (compact stat presentation).

## Interactions

- Search submit / Enter → navigate to `/justitie/cautare?q=…`.
- `CourtPicker` select → `/justitie/instante/$courtId` (or
  `/justitie/cautare?court=…` if the user is searching cases).
- Top-court click → court analytics.
- Tier-bar click → `/justitie/cautare?tier=…`.
- `CoverageRibbon`/footer "detalii" → `SourceProvenanceDrawer`.

## Loading / empty / error / partial / stale states

- **Loading:** skeleton stat blocks + skeleton ribbon + skeleton lists.
- **Empty:** not expected for the overview; if totals are unavailable, show a
  domain-unavailable notice with the coverage/privacy story still visible.
- **Partial:** totals render; failed sub-sections show localized notes;
  `DataStatusBadge='partial'`.
- **Error:** retry block; layout (breadcrumb/sub-nav) still renders.
- **Stale:** muted `FreshnessBadge` + "actualizat la {date}".

## Accessibility and i18n

- Single `<h1>Justiție</h1>`; sections use `<h2>`; sub-nav is a labeled `<nav>`.
- Stat blocks are readable text (not icon-only); chart has text summary + fallback
  table.
- `CourtPicker` is a labeled combobox with keyboard navigation and type-ahead.
- All copy via Lingui; counts/dates via `Intl`/`i18n.locale`; acronyms (ICCJ, ECRIS,
  CCR, HUDOC) expanded on first use or in tooltip.

## Privacy, provenance, source citation

- Privacy/availability band is a required, prominent section — persons not named, no
  person search, candidate-only company links, metadata only, no documents.
- `CoverageRibbon` + `SourceProvenanceDrawer` present; ICCJ-absence stated in the
  tier breakdown and ribbon.
- Search helper text explicitly steers away from person search.

## Acceptance checklist

- [ ] `/justitie/route.tsx` layout renders breadcrumb + sub-nav + coverage slot for
      all domain pages.
- [ ] Landing shows hero counts (locale-formatted), tier breakdown, top courts,
      coverage ribbon, and a prominent privacy/availability band.
- [ ] Entry search + `CourtPicker` route to `/justitie/cautare` / court analytics;
      helper text rules out person search.
- [ ] ICCJ-absence + metadata-only + dense-since-2021 stated near primary content.
- [ ] Year-thinning shown via chart + fallback table.
- [ ] Loading/partial/stale/error states implemented; `yarn typecheck` passes;
      strings extracted/compiled.

## Non-goals

- No live case results on the landing page (that's search).
- No person search, no case text.
- No cross-domain dashboards.
- No account/save-search features in MVP.

## Open questions (true blockers only)

None.
