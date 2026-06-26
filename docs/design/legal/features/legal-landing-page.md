# Feature: Legal landing page

> MVP-7 · the domain front door at `/legislatie`. Reads
> `docs/design/legal/design.md` (§3 routes, §4 layout, §6 components).

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + shadcn/ui + Lingui).
Mostly composition: it assembles the citation resolver box, recent-changes list,
a "today in Monitorul" strip, and a coverage note. Restraint matters — this is a
work surface, not a marketing hero.

## Summary

Orients every user and routes them onward. A short domain explainer, a prominent
citation/topic search box (the resolver, embedded), a "recently modified acts"
list, a "today in Monitorul" strip, and an honest coverage note about what years/
parts of MO have full text. Cheap to assemble from existing data; gives the
domain a front door and a place to state coverage honestly.

## Facts / Decisions / Assumptions

- **Fact:** Required data exists: recent status events (modificare/abrogare)
  from `act_status_events`, recent MO issues (`mo_issues` by issue_date), top
  domains/audiences from `document_summaries`. (`legal.md` §13 MVP-7.)
- **Decision:** The search box is the embedded `CitationInput` (feature 3) with a
  secondary "caută în tot textul" link to `/legislatie/cautare`. A citation
  resolves and navigates; free text goes to listing. (`design.md` §3.)
- **Decision:** No oversized hero, no gradient/atmosphere backgrounds; a compact
  explainer + dense actionable sections per the shared foundation and the map
  `DESIGN_PRINCIPLES.md`.
- **Decision:** A page-level `CoverageRibbon` states MO full-text coverage
  honestly (P4) and links to the coverage detail; recent-changes and "today in
  Monitorul" each carry their own `FreshnessBadge`.
- **Assumption:** "recently modified" is the most recent N `act_status_events` of
  kind modificare/abrogare joined to their acts; the adapter supplies them.
  "Today in Monitorul" falls back to the latest available issue date when there
  is nothing for the literal current day.

## Route and URL state

- Route: `/legislatie` (index). `validateSearch`: none required (default view).
  The embedded resolver writes to `/legislatie/citatie?q=` or
  `/legislatie/cautare?q=` on submit rather than holding state here.

## Data contract and mock states

```ts
type LandingData = {
  recentlyModified: {
    actId: string; displayCitation: string; status: LegalStatus
    changeKind: string; changeDate: string; modifierCitation: string | null
  }[]
  todayInMonitorul: {
    issueId: string; partCode: string; issueNumber: string; issueDate: string
    sectionCount: number; hasFullText: boolean
  }[]
  topDomains: { slug: string; label: string; count: number }[]
  topAudiences: { slug: string; label: string; count: number }[]
  coverage: CoverageInfo
}
```

Mock states: full (all sections populated), no-recent-changes, no-issues-today
(fallback to latest), coverage metadata-only note, loading, error.

## UI structure

```
Page title: "Legislație" + one-paragraph explainer (what this section is)
CitationInput (prominent) + "caută în tot textul →" + example chips
CoverageRibbon: "Acoperire Monitorul Oficial: text disponibil 2012–prezent;
  înainte de 2012 doar coordonate" (from data) [Detalii acoperire]
Two/three sections (full-width bands, not nested cards):
  "Modificate recent" — list rows: displayCitation · LegalStatusBadge ·
    "modificat de {modifierCitation} la {date}" → Act page
  "Azi în Monitorul Oficial" — strip of issue chips: Partea {p} nr {n} ·
    {sectionCount} secțiuni · [text/coordonate] → issue page
  "Domenii și audiențe" — chips linking to /legislatie/cautare?domain=… /
    ?audience=…
```

## Component reuse and proposed new components

- Reuse: `CitationInput` (feature 3), `LegalStatusBadge`, `Badge`, `Button`,
  `Separator`, `filter-tag`/chips, `empty-state`, `Skeleton`.
- Shared: `CoverageRibbon`, `FreshnessBadge`.
- New: a thin `LegalLandingPage` orchestrator + `RecentlyModifiedList` +
  `TodayInMonitorulStrip`. No new heavy components.

## Interactions

- Resolver submit: citation → `/legislatie/citatie`; free text → listing.
- Example chips fill the resolver. Recent rows → Act page. Issue chips → issue
  page. Domain/audience chips → pre-filtered listing.

## Loading / empty / error / partial / stale states

- **Loading:** skeletons for each section.
- **Empty (no recent changes):** section shows "Nicio modificare recentă
  înregistrată."; the page still renders the search box + coverage.
- **Empty (no issue today):** "Azi" falls back to "Cel mai recent număr" with the
  latest issue date labelled.
- **Error:** per-section inline alert; the search box always works.
- **Partial:** coverage ribbon states metadata-only ranges honestly.
- **Stale:** `FreshnessBadge` per section.

## Accessibility and i18n

- Search box labelled; section headings semantic; status via badge text+icon;
  chips keyboard reachable. Lingui macros; locale dates; acronyms (MO, OUG)
  expanded. No color-only meaning.

## Privacy / provenance / source-citation

- Coverage stated honestly (P4); recent-change rows link to the authoritative Act
  page where provenance lives. No AI-derived claims on the landing page beyond
  links into summaries (which carry their own `AIProvenanceNotice`).

## Acceptance checklist

- [ ] `/legislatie` renders explainer + embedded resolver + recent-changes +
      today-in-Monitorul + coverage note from mock.
- [ ] Resolver routes citations to `/legislatie/citatie` and free text to
      `/legislatie/cautare`.
- [ ] Coverage ribbon states MO full-text honestly; no implied full text.
- [ ] Empty/fallback states (no recent changes, no issue today) render.
- [ ] No oversized hero / decorative backgrounds.
- [ ] `yarn typecheck` passes; strings use Lingui macros.

## Non-goals

- The analytics dashboard (`/legislatie/statistici`); personalized alerts; any
  AI-generated landing copy.

## Open questions (blockers only)

None.
