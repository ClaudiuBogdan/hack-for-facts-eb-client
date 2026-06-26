# Feature: Monitorul publication card + issue page

> MVP-6. Reads `docs/design/legal/design.md` (§3 routes, §6 components, §7 data
> model). Owns both the compact card on the Act page and the
> `/legislatie/monitorul/$id` issue surface.

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + shadcn/ui + Lingui)
with strong discipline around coverage honesty. The hard part is **never
implying full text where only metadata exists**.

## Summary

Gives every act its authoritative gazette coordinates and the proof PDF. On the
Act page, a compact **"Publicat în Monitorul Oficial"** card shows part, issue,
date, page span (where available), and a PDF link + SHA-256, linking to the full
issue page. The issue page (`/legislatie/monitorul/$id`) shows the issue header,
the deterministic table of contents, and a coverage ribbon stating, per
year/part, whether full text exists or only metadata.

## Facts / Decisions / Assumptions

- **Fact:** `legal.act_documents.mo_part/mo_number/mo_date` join to
  `legal.mo_issues` (part_code PI–PVII, issue_label/number/year, issue_date,
  pdf_url, s3, pdf_sha256, pdf_bytes, has_archive_index). `mo_act_publications`
  carries the publication event with a nullable `act_id` resolution. (`legal.md`
  §5, §13 MVP-6.)
- **Fact:** MO full text is partial and gated — "do not treat index presence as
  full text availability." Full text: 2012–2026 text-layer era; pre-2012 needs
  OCR; 1990–2010 + 2021–2026 archive-metadata-only until backfill. Coverage
  honesty is a hard constraint. (`legal.md` §5, §6, §15.)
- **Fact:** `legal.mo_issue_toc` + `mo_issue_toc_section` provide a deterministic
  TOC (title, section_type, act_number, issuer, page range, resolution). The
  per-section **LLM facets** (summary/domains/institution_names/financial flag)
  are `summary_publishable=false` and must NOT be surfaced as facts in v1.
  (`legal.md` §5, §6, §12, §15.)
- **Decision:** Copy guardrail (mandatory): when `hasFullText` is false the card
  says **"Publicat în Monitorul Oficial · coordonate de publicare"**; "text
  disponibil" appears only when `hasFullText` is true. (`design.md` P4.)
- **Decision:** The issue page shows the **deterministic TOC only**; LLM facets
  are not rendered. A `CoverageRibbon` precedes the TOC stating the per-year/part
  text status. (`design.md` P4/P5.)
- **Decision:** `mo_act_publications` with `resolution` `ambiguous`/`unmatched`
  link to the MO issue, not to an act page; resolved (`unique`) publications link
  to `/legislatie/acte/$id`. (`design.md` P2/P3.)
- **Decision:** PDF links open the external viewer in a new tab (no embedded PDF
  in MVP). SHA-256 is shown as evidence with a copy affordance.
- **Assumption:** `hasFullText` is derived by the adapter from the per-year/part
  coverage policy; until the adapter provides it, mock defaults to metadata-only
  for pre-2012 issues and full-text for 2012+ in fixtures (clearly mock).

## Route and URL state

- Card: lives on `/legislatie/acte/$id` (Rezumat tab slot).
- Issue page: `/legislatie/monitorul/$id` (`$id` = `mo_issues` id).
  `route.tsx` cache headers + `route.lazy.tsx` component. `validateSearch`:
  `sectiune?: string` (TOC anchor), `pagina?: number`.

## Data contract and mock states

Card consumes `MonitorulPublication`; issue page consumes `MonitorulIssue`
(`design.md` §7), including the deterministic TOC sections only.

Mock states:
- **Card, full text** — 2015 issue, `hasFullText: true`, page span present, PDF
  + hash.
- **Card, metadata-only** — 2005 issue, `hasFullText: false`, "coordonate de
  publicare", no page span, PDF link may still exist.
- **Card, no MO coordinates** — act with `mo: null` → card hidden, neutral note.
- **Card, unresolved publication** — `resolution: 'ambiguous'` → links to issue,
  labelled "potrivire posibilă".
- **Issue page, full text** — TOC with resolved + unresolved sections.
- **Issue page, metadata-only** — coverage ribbon "doar coordonate", TOC present
  from archive index, no text links.
- **Issue page, not found / no TOC** — empty TOC state.

## UI structure

### Act-page card

```
┌ Publicat în Monitorul Oficial ─────────────────────────────────┐
│ Partea {partCode} · nr. {issueNumber}/{issueYear} · {issueDate} │
│ pagini {pageStart}–{pageEnd}            [hasFullText? "text disponibil"
│                                          : "coordonate de publicare"]        │
│ [Deschide PDF ↗]  SHA-256: {short}… [copy]   → Vezi numărul integral        │
└────────────────────────────────────────────────────────────────┘
```

### Issue page

```
Breadcrumb: Legislație › Monitorul Oficial › Partea {partCode} nr {n}/{year}
Header: issue label, part, number, year, date · [Deschide PDF ↗] · SHA-256 [copy]
CoverageRibbon: per-year/part text status ("text disponibil" | "doar coordonate")
TOC (deterministic): list of sections
  {title} · {section_type} · act {act_number} · {issuer} · pagini {a}–{b}
  resolved (unique) → Act page link; else non-link (raw)
(no LLM summaries/domains/institutions rendered)
```

## Component reuse and proposed new components

- Reuse: `Card` (card only; no nested cards), `Badge`, `Tooltip`, `copy-button`,
  `Breadcrumb`, `Separator`, `ScrollArea`, `Table`/list, `empty-state`,
  `EvidenceLink`.
- New: `MonitorulPublicationCard`, `MonitorulIssueView`, `MonitorulTocList`.
  Shared: `CoverageRibbon`, `FreshnessBadge`, `DataStatusBadge`.

## Interactions

- Card "Vezi numărul integral" → issue page; "Deschide PDF" → external viewer
  (new tab, `rel="noopener"`); copy SHA-256.
- Issue TOC resolved section → Act page; `sectiune`/`pagina` deep-link scrolls
  to the section.

## Loading / empty / error / partial / stale states

- **Loading:** card skeleton / issue header + TOC skeleton.
- **Empty (no MO coordinates):** card hidden; Act page shows neutral
  "Coordonatele de publicare în Monitorul Oficial nu sunt disponibile."
- **Empty (issue no TOC):** `empty-state` "Cuprinsul nu este disponibil pentru
  acest număr."
- **Error:** inline alert + retry.
- **Partial (metadata-only):** the defining state — coverage ribbon + "coordonate
  de publicare"; never "text disponibil"; PDF may still link.
- **Stale:** `FreshnessBadge` from issue `first/last_seen`.

## Accessibility and i18n

- Coverage status conveyed by ribbon text + badge, not color alone. PDF links
  labelled with an external-link icon + `aria-label` (opens new tab). TOC is a
  semantic list/table with headings. Acronyms (MO, Partea I–VII) expanded.
- Lingui macros; locale dates and page-number formatting.

## Privacy / provenance / source-citation

- P3 separation (publication ≠ identity) and P4 coverage honesty are mandatory.
  PDF + SHA-256 are the evidence of publication (P1). MO section LLM facets are
  not rendered (P5). Unresolved publications are non-links (P2).

## Acceptance checklist

- [ ] Act-page card shows part/issue/date/(page span)/PDF + SHA-256 from mock and
      links to the issue page.
- [ ] Card and issue never say "text disponibil" unless `hasFullText` is true;
      metadata-only states say "coordonate de publicare".
- [ ] `/legislatie/monitorul/$id` shows header + deterministic TOC + coverage
      ribbon; no LLM facets rendered.
- [ ] Resolved TOC sections link to Act pages; unresolved are non-links.
- [ ] PDF opens external viewer in a new tab; SHA-256 is copyable.
- [ ] `yarn typecheck` passes; strings use Lingui macros.

## Non-goals

- MO full-text rendering / section search (ADV-2); MO long-tail registry search
  (ADV-3); embedding a PDF viewer.

## Open questions (blockers only)

None.
