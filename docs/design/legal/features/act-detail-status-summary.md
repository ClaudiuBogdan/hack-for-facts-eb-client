# Feature: Act detail — status + plain-language summary

> MVP-1 · the domain anchor. Reads `docs/design/legal/design.md` (§2 patterns,
> §3 routes, §6 components, §7 data model) as its spine.

## Feature owner profile

Frontend feature implementer (React 19 + TypeScript + TanStack Router +
shadcn/ui + Tailwind v4 + Lingui). Comfortable with file-based nested routing,
Zod search validation, mock-first feature adapters, and accessible status
components. This feature establishes the Act-page shell and the shared legal
trust components, so the owner should treat it as foundation work other legal
features build on.

## Summary

The Act detail page answers the two most-asked legal questions immediately and
trustworthily: **"What is this act?"** and **"Is it still in force?"** It is the
landing target for search, the citation resolver, and cross-domain links from
parliament. This feature ships the **Rezumat** tab (route index) plus the shared
shell every other Act tab plugs into: the sticky header, the 7-value status
badge, the plain-language "what this means" panel, key dates, the version
selector slot, the MO publication card slot, the related-links rail, and the
provenance footer.

## Facts / Decisions / Assumptions

- **Fact:** All required data is in the strongly-loaded Portal serving tables:
  `legal.acts` (status, display_citation, type, year, issuer, entry_into_force,
  in_degree) + `legal.document_summaries` (plain_language_summary, summary,
  key_dates, affected_audiences, fiscal_impact, penalties, domains, confidence,
  model/prompt) + `legal.act_documents` (canonical selector). (`legal.md` §13
  MVP-1, §5.)
- **Fact:** `$id` = `legal.acts.act_id`, the same id parliament `actLinks` and
  entity-search `legal_act` hits carry. (`design.md` §3.)
- **Fact:** The client renders Act tabs as nested sub-routes via a layout shell
  + `<Outlet />` + a `resolveActiveTab(pathname,id)` helper, mirroring
  `src/features/parliament/components/bill-route-layout.tsx` and
  `src/features/parliament/lib/bill-detail-nav.ts`.
- **Decision:** This feature builds `ActRouteLayout`, `ActSummaryHeader`,
  `LegalStatusBadge`, `WhatThisMeansPanel`, `KeyDatesRow`, `AIProvenanceNotice`,
  and the provenance footer. It renders empty/"în curând" slots for tabs owned
  by features 4/5/8 and the version selector (feature 9) and MO card (feature 6)
  so it ships standalone and they fill in.
- **Decision:** Plain-language summary is publishable but always wrapped in
  `AIProvenanceNotice` ("generat de AI, verificat la sursă — nu constituie
  consultanță juridică", model + prompt version). (`design.md` P5.)
- **Decision:** Canonical expression by default; the version selector is a
  header control setting `?versiune=` (feature 9). (`design.md` P7.)
- **Assumption:** exact GraphQL field names are not in the UX doc; mock follows
  `legal.md` §5 column names and is mapped in the feature adapter.

## Route and URL state

- Route: `/legislatie/acte/$id` (index = **Rezumat** tab).
  - `route.tsx`: `createFileRoute('/legislatie/acte/$id')` with
    `createPublicPageCacheHeaders({ sharedMaxAgeSeconds: 600,
    staleWhileRevalidateSeconds: 3600 })` (matches bill detail).
  - `route.lazy.tsx`: renders `<ActRouteLayout id={id} />`.
  - `index.tsx` / `index.lazy.tsx`: the Rezumat tab content via `<Outlet />`.
- Search params (Zod `validateSearch`, `.optional().catch(undefined)`):
  `versiune?: string`, `highlight?: string`, `from?: string`.
- Active tab resolved from pathname by `resolveActDetailActiveTab(pathname, id)`
  → `'rezumat' | 'cronologie' | 'referinte' | 'structura'`.
- Tab nav: `ACT_DETAIL_NAV_ITEMS` const (id, label, `to`) like
  `BILL_DETAIL_NAV_ITEMS`. Labels: Rezumat / Cronologie / Referințe / Structură.

## Data contract and mock states

Consumes `LegalAct` (`design.md` §7). The Rezumat tab uses: `displayCitation`,
`actType`, `actNumber`, `actYear`, `issuerSlug`/`issuerRaw`, `status`,
`modificationCount`, `entryIntoForce`, `summary.*`, `versions` (for the selector
slot + canonical marker), `mo` (card slot), `billLink` (rail), `source`.

Mock fixtures under `src/features/legal/mocks/acts/`:

- **Full** — `Legea nr. 227/2015` (Codul fiscal): status `modificat`,
  `modificationCount: 137`, rich summary with audiences + fiscal impact + key
  dates, canonical + republicare versions, MO card present, bill link present.
- **In-force minimal** — status `in-vigoare`, `modificationCount: 0`, summary
  present but `affectedAudiences: []`, `fiscalImpact: null`.
- **Abrogated** — status `abrogat`, summary present, an "abrogat de" pointer in
  the rail; header shows the repeal date.
- **Summary-missing** — `summary: null` (no AI enrichment yet): header + status
  + key dates render; `WhatThisMeansPanel` shows its empty state.
- **Unknown-status** — `status: 'necunoscut'`: badge renders neutral with a
  tooltip explaining the status could not be derived.

## UI structure

```
Breadcrumb: Legislație › Acte › {displayCitation}
┌ ActSummaryHeader (sticky) ───────────────────────────────────────────────┐
│ {displayCitation}   [LegalStatusBadge: status + "· modificat de N acte"]  │
│ {actType} · emis de {issuerLabel} · {actYear}      [VersionSelector slot] │
│ [Vezi sursa] [Copiază citarea] [Distribuie]                               │
├ Tab nav: Rezumat | Cronologie | Referințe | Structură ────────────────────┤
└───────────────────────────────────────────────────────────────────────────┘
2-col on desktop (content + RelatedLinksRail); single col on mobile:
  WhatThisMeansPanel
    - plain-language summary (prose)
    - "Pe cine afectează" chips (affectedAudiences)
    - "Impact fiscal" (fiscalImpact) · "Sancțiuni" (penaltiesMentioned)
    - AIProvenanceNotice (always)
    - ExplanationAudioPlayer slot (feature 10, only if artifact)
  KeyDatesRow (entry-into-force / publication / repeal)
  MonitorulPublicationCard slot (feature 6)
  RelatedLinksRail: bill link (feature 11), MO issue, issuer, "acte care îl
    modifică" (top of incoming references), external EU acts
Provenance footer: SourceProvenanceDrawer trigger (source URL, retrievedAt,
  parserNotes, resolver/model versions, SHA-256), DataStatusBadge, FreshnessBadge
```

## Component reuse and proposed new components

- Reuse: `Breadcrumb`, `Badge`, `Tabs`/nav links, `Tooltip`, `Button`,
  `copy-button`, `Sheet` (provenance drawer), `Skeleton`, `empty-state`,
  `ScrollArea`. Tab shell pattern from parliament `bill-route-layout`.
- New (this feature): `ActRouteLayout`, `ActSummaryHeader`, `LegalStatusBadge`
  (status map in `design.md` §6), `WhatThisMeansPanel`, `KeyDatesRow`,
  `AIProvenanceNotice`. Slots only (built elsewhere): `VersionSelector`,
  `MonitorulPublicationCard`, `ExplanationAudioPlayer`, `ActBillCrossLink`,
  `ActTimeline`, `ReferencesPanel`, `DocumentTree`.
- Shared-foundation: `SourceProvenanceDrawer`, `DataStatusBadge`,
  `FreshnessBadge`, `RelatedLinksRail` (build once if absent).

## Interactions

- Status badge tooltip explains the folded status and links to Cronologie for
  the full event substrate ("statusul reflectă evenimentele — vezi cronologia").
- "modificat de N acte" is a link to the Referințe tab (incoming edges).
- Copy citation copies `displayCitation`; Distribuie copies the current URL.
- Version selector change updates `?versiune=` and re-fetches the expression
  (feature 9); the header keeps identity + status stable.
- Sticky header stays visible while scrolling tab content.

## Loading / empty / error / partial / stale states

- **Loading:** header skeleton (citation + badge bars) + body skeletons;
  matches bill layout skeleton style.
- **Empty (not found):** reuse a `ParliamentNotFoundPage`-style not-found with
  Romanian copy ("Actul nu a fost găsit"), actions → `/legislatie/cautare` and
  `/legislatie`.
- **Summary missing:** `WhatThisMeansPanel` empty state: "Rezumatul în limbaj
  simplu nu este încă disponibil pentru acest act." — header/status/dates still
  render.
- **Error:** inline `alert` with retry; URL preserved.
- **Partial:** if status is derivable but summary/MO/bill are missing, render
  what exists and mark absent slots with neutral "indisponibil" copy; never
  fabricate.
- **Stale:** `DataStatusBadge: stale` + `FreshnessBadge` "actualizat la …" when
  the adapter flags staleness.

## Accessibility and i18n

- Status conveyed by text + icon + color; badge has an `aria-label` repeating
  the status label and modification count.
- Sticky header is a `<header>` landmark; tab nav is a labelled `nav` with
  `aria-current` on the active tab.
- All strings via Lingui macros; dates via `Intl.DateTimeFormat`; acronyms
  (OUG/OG/HG/MO) expanded on first use or via tooltip.
- Focus moves to the page title on route change; provenance drawer manages focus.

## Privacy / provenance / source-citation

- Plain-language summary + facets always carry `AIProvenanceNotice` (P5).
- Provenance footer exposes source + retrieval/publication date + model/prompt/
  resolver versions + SHA-256 via `SourceProvenanceDrawer` (P1).
- No derived accusations; status uses the neutral vocabulary only.

## Acceptance checklist

- [ ] `/legislatie/acte/$id` renders header + status badge + plain-language
      summary + key dates + provenance footer from mock with no API.
- [ ] Status shown via `LegalStatusBadge` (text + icon + color), never color
      alone; "modificat de N" links to Referințe.
- [ ] Cronologie/Referințe/Structură exist as deep-linkable nested routes
      (slots render "în curând" until their features land).
- [ ] `AIProvenanceNotice` is present wherever AI summary text shows.
- [ ] Summary-missing, abrogated, unknown-status, and not-found states all
      render gracefully.
- [ ] Search params validate via Zod; default renders with no params.
- [ ] `yarn typecheck` passes; strings use Lingui macros.

## Non-goals

- Timeline, references, document tree, MO card internals, version compare,
  audio, and bill cross-link **logic** (owned by their features; this ships
  their slots).
- Editing, alerts/subscriptions, semantic/RAG search, MO full-text rendering.

## Open questions (blockers only)

None.
