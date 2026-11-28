# LEGAL-002: The site search's act status mark is read from the hit's subtitle text

**Status:** open; the mark ships behind an allow-list until the typed field of LEG-95TT exists (27 November 2026). **Owner:**
client-legislation; the typed field is the legislation session's to take to the data platform and the server.
**Priority:** low. **Related:** `src/features/landing/components/search/search-parts.tsx` (`legalStatusOfHit`,
`ResultRowContent`), `src/features/legal/components/legal-status-badge.tsx` (`markOnly`).

## What the page does

At the owner's ask (27 November 2026), a legal act's row in the site search starts with the act's status mark, the
act page's own, the word hidden for the eye and given on hover and to screen readers. It shows wherever acts show
in the site search: the legislation main page and the landing page alike.

`SearchHit` has no typed status. The mark reads the last comma-separated part of the hit's `subtitle`, which the
search projection writes for an act as `concat_ws(', ', display_citation, status)` (the data platform's
`src/search/palette-contract.ts`). It is drawn only when that part is one of the seven act statuses
(`LEGAL_ACT_STATUSES`); anything else draws no mark, and the row is as before (tested).

## Why it is not a stable source

The legislation session's reading of 27 November 2026:

- The status in the subtitle is the **legacy** corpus's (`legal.acts`), not legal_v2's. `legal_v2.acts` has no status
  column, so when the search moves to legal_v2 that part will change or go.
- `concat_ws` drops a null status: the last part is then part of the citation. The allow-list keeps that safe unless a
  citation itself ends in ", abrogat" or a similar status word.

Checked on the dev API the same day: for 18 acts of mixed status (6 in force, 6 repealed, 4 partly repealed, 2
amended), the row's status equals the act page's on every one. The act page's status is bridged from the same legacy
corpus.

Root's word (27 November 2026): the mark can ship. The status is the legacy corpus's, which today is also what the
act page shows; LEG-95TT moves it to a typed legal_v2 field later.

## What would close it

**LEG-95TT** (legislation; the data platform owns the search projection): build the search's act rows from legal_v2
with a typed status carried through `SearchHit`, after legal_v2's "Doc nr. <page id>" and order-number titles are fixed
(LEG-PDYY, LEG-R2DJ). The client then reads that field and drops `legalStatusOfHit`. If the subtitle's format changes
first, a tail that is not a status draws no mark. Until then, an act with no status whose citation itself ends in a
status word (", abrogat") would draw that word's mark: the one ambiguity the allow-list cannot remove.

On a phone the word is never shown beside the mark (it would squeeze the title out next to a long identifier); hover
and screen readers still get it, a touch-only reader sees the mark alone (Codex review, round 2; kept as the owner's
compact row).
