# Procurement Ranking Cards Requirements

**Status:** Approved — implemented in client (2026-07)  
**Date:** 2026-07-21  
**Scope:** Hub overview, institution/supplier slices, CPV category page  
**Components:** `ProcurementPartyRanking`, `ProcurementCategoryBars`, `ProcurementPreviewBadge`

This document captures product decisions made while polishing procurement
rankings. It is the contract for reviewing the UI, writing tests, and trying
alternative implementations that still satisfy the same requirements.

## Problem

Ranking cards on the procurement hub (and mirrored on institution, supplier, and
CPV pages) are a primary way users scan “who buys / who supplies / what
categories dominate” under the current filters.

Before this work:

- Cards dumped the full live top-N list at once, which felt dense next to the
  PNRR-style hub chrome.
- Nested `<details>` tables competed with the bar list for attention.
- Deeper rankings (top-50/100, value sort, pagination) are not served by the
  current GraphQL aggregates — tempting the UI to invent rows or pretend depth
  that the API does not provide.
- Future mock-ahead surfaces needed a clear honesty convention so Preview never
  gets confused with live answers.

## Product decisions

User choices locked in conversation (letters A2 / B1 / C1):

| Code | Decision |
| --- | --- |
| **A2** | Show **5** rows by default, **Show more / Show less** for the rest of the live payload, plus a **ranking sheet** that tables the **same** live top-N. |
| **B1** | Stay **API-honest**: only rows the current aggregates return (`TOP_N` ≤ 10 today). **TODO(ClickHouse)** for deeper ranking — never pad with fake or mock rows. |
| **C1** | Label future mock / placeholder surfaces with a **`Preview`** badge. Live GraphQL answers must not use Preview. |
| **D2** | Scoped ranking rows open **pair Search** (`authority_cui` + `supplier_cui` + grain + `sort=value_desc`); hub rows stay party pages. See § Authority × supplier drill-down. |

### Why A2 (not always-10, not a separate rankings page yet)

- **Default 5** matches the density pattern already used on PNRR overview
  (`RankedListCard` with `limit={5}`): glanceable first viewport, expand when
  needed.
- **Show more / less** keeps all live rows reachable without leaving the card.
- **Sheet table** gives a scannable, comparable view (rank, name, records, RON)
  without nesting a table under the bars.
- A dedicated `/procurement/rankings` page was deferred: deeper depth still
  needs analytics backend work (see B1). The sheet is enough for “same top-N,
  table form.”

### Why B1 (not mock top-50, not silent empty padding)

- Invented rows would break trust in a domain where coverage and answerability
  already matter.
- Empty-looking “more” that is not real data is worse than an honest short list.
- GraphQL `procurementBreakdown` / aggregates currently expose a small `topN`
  (client uses `10`; server caps higher but the hub stays at API depth).
- When ClickHouse (or equivalent analytics) can serve scoped top-50/100,
  pagination, and value sort, extend the sheet or add a rankings route — then
  remove the TODO, not the honesty rule.

### Why C1 (Preview badge for mocks only)

- UX-first work will sometimes ship UI ahead of serving APIs.
- Preview + a code `TODO(contract)` naming the missing API/scraper path makes
  that honesty visible in the product and in the codebase.
- Badge must never appear on live aggregate answers (rankings, stats, search
  results that are served).

## Alternatives considered and rejected

| Alternative | Why rejected |
| --- | --- |
| Always show all live rows (≤10) with no collapse | Dense; fights the quieter hub header. |
| Infinite scroll / “load more” from a fake deeper list | Violates B1; API does not serve that depth. |
| Nested `<details>` “View as table” under the card | Noisy; competed with bars; less discoverable than a dedicated sheet. |
| Separate rankings route now | Premature without deeper analytics; sheet covers same-data table need. |
| Pad to 50 with mock parties/categories | Dishonest; fails review of tests and trust. |
| Show “Preview” on live ranking cards | Confuses live and placeholder surfaces. |
| Labeled “Open ranking” text button | Visual noise; icon + accessible name is enough. |
| Keep CUI, share-of-scope, missing-amount footnotes on every card row | Information overload; detail belongs in the sheet / party page. |
| Footer “Search by authority/supplier” under each card | Redundant with hub search and row deep-links. |
| New edge sheet / pair page for authority×supplier records | Search already filters by both CUIs and sorts by value; a second list path would duplicate it. |

## Authority × supplier drill-down (2026-07-21)

**Status:** Approved — implemented in client  
**Code:** `D2` (pair Search deep link from scoped rankings)

### Job

Investigation path that rankings must support:

1. Hub shows a buyer with a suspicious RON total (count-ranked, but amount
   visible).
2. User opens the institution page and sees a top supplier carrying almost all
   of that amount.
3. User needs the **records between that buyer and that supplier**, **sorted by
   value**, so the outlier row is obvious and openable.

Without this step, clicking the supplier only opens the supplier profile — which
answers “who is this company?” but not “what did this school buy from them?”

### Decision

Reuse existing `/procurement/search` — no new edge page or pair sheet for v1.

URL contract when a scoped ranking row is clicked:

| Param | Value |
| --- | --- |
| `authority_cui` | Buyer CUI |
| `supplier_cui` | Supplier CUI |
| `grain` | `contracts` or `direct_acquisitions` (matches the slice toggle) |
| `sort` | `value_desc` |

Example (direct acquisitions):

`/procurement/search?authority_cui=…&supplier_cui=…&grain=direct_acquisitions&sort=value_desc`

Helper: `partyPairSearchLink` in
`src/features/procurement/lib/party-links.ts` (maps analysis grain
`contract` / `direct_acquisition` → Search grain). Wired via optional
`pairScope` + `grain` on `ProcurementPartyRanking` from the authority and
supplier slices.

### Why Search (not a sheet / edge route)

- Search already supports both CUIs (AND), value sort, and grain.
- A second list UI would duplicate the same query and diverge over time.
- A dedicated `/procurement/edges/...` route is premature until we know Search
  is too heavy for this job.
- Profile-only row links blocked the investigation path.

### Row link behaviour

| Context | Row click |
| --- | --- |
| Institution / entity Achiziții (`pairScope` = authority) | Pair search URL |
| Supplier page (`pairScope` = supplier) | Pair search URL |
| Hub overview / CPV page (no `pairScope`) | Institution or supplier procurement page |

The ranking table sheet uses the **same** row destinations as the card.

### Alternatives rejected

| Alternative | Why rejected |
| --- | --- |
| Sheet of pair records on the institution page | Second list UI for the same Search query |
| Dedicated `/procurement/edges/...` route | Premature; Search already answers the job |
| Keep row → supplier profile only | Blocks the investigation path (profile ≠ pair records) |
| Fix bad aggregate amounts in the UI | Data-layer / answerability problem; UI must expose records, not invent corrections |

### Acceptance (pair drill-down)

11. On an institution page, clicking a top-supplier row opens Search with both
    CUIs, `sort=value_desc`, and the grain matching the page toggle.
12. On a supplier page, clicking a top-buyer row does the symmetric pair Search.
13. Hub (and other unscoped) party ranking rows still open the party procurement
    page, not a pair Search.
14. Pair drill does not invent records; it only deep-links into live Search.
15. Active Search filters/chips reflect both parties so the user can see the
    scope of the list they landed on.

## Card UX (accepted shape)

Applies to party rankings and CPV category bars unless a surface documents an
exception.

### Header

- Title + short description (e.g. “By number of records.”).
- Icon-only control (`Table2`) opens the ranking sheet.
  - Accessible name / title: “Open ranking table”.
  - Hidden when there are no rows or when the panel is in an explicit
    unavailable state.

### Default list

- Show the first **5** live rows (`CARD_LIMIT = 5`).
- If more live rows exist, show **Show more** / **Show less** (not pagination
  against a deeper API).
- Expanded state may scroll within the card on larger breakpoints; it does not
  fetch additional rows.

### Row content (low noise)

Each row is one scan line plus a thin proportion bar:

| Surface | Primary label | Right-hand metrics | Bar |
| --- | --- | --- | --- |
| Party ranking | Rank + party display name (link per pair-scope rules above) | **Record count** (bold) · compact **RON total** when served (middot-separated) | Thin mark; width ∝ record count vs max in the payload |
| Category bars | Rank + CPV division label (link to category page when code exists) | **Share %** (bold) · record count (muted, middot-separated) | Thin mark; width ∝ record count vs max |

Rules:

- **Counts lead.** Amounts are secondary and only when the API provides them.
- Count and RON (or share and count) must read as **two tokens**, not one jammed
  string.
- Do **not** show on the card row: CUI line, share-of-scope, “records without
  usable amount”, long “X records” copy, or CPV code inline with the label.
- CUI / CPV code may appear in `title` tooltips and **must** appear in the sheet
  table (code under the label, or CUI under the party name).
- Unavailable / matrix-blocked scopes use an explicit reason string — never an
  empty list that looks like “no buyers exist.”
- Row links under `pairScope` go to pair Search; otherwise to the party page.
  Sheet rows match the card.

### Sheet

- Same row set as the card’s live payload (not a different query, not a longer
  mock list).
- Columns: rank, party or CPV division, records, RON total.
- Short description only (e.g. “Top {n} for the current filters.”). Do not put
  ClickHouse roadmap copy in the UI; keep that in code TODOs and this spec.
- Row links navigate to the same destinations as the card; closing the sheet on
  navigate is fine.

## Preview convention (C1)

- Component: `ProcurementPreviewBadge`.
- Use only when the surface is intentionally mock / placeholder.
- Pair with `TODO(...)` naming the required contract (ClickHouse, OpenSearch,
  MiniSearch, GraphQL matrix field, scraper lane, etc.).
- Live ranking cards and live sheets do **not** show Preview.

## Data contract

- Source: existing live aggregates (`TOP_N = 10` in
  `procurement-api.live.ts` today).
- Ranking measure for these cards: **record count** (flow count), not unguarded
  value rank.
- Unscoped party rows link to `/procurement/institutions/$cui` or
  `/procurement/suppliers/$cui`.
- Scoped party rows (`pairScope`) link to `/procurement/search` with both party
  CUIs, matching grain, and `sort=value_desc`.
- Category rows link to `/procurement/categories/$code`.
- When geography (or another scope) makes party rankings unanswerable, pass
  `unavailableReason` and do not render a fake empty ranking.

## Surfaces in scope

| Surface | Party rankings | Category bars |
| --- | --- | --- |
| `/procurement` overview | Top buyers, top suppliers | Spending categories |
| `/procurement/institutions/$cui` | Top suppliers | Categories purchased |
| `/procurement/suppliers/$cui` | Top buyers | Categories supplied |
| `/procurement/categories/$code` | Top buyers, top suppliers | — |

## Non-goals

- Deeper than API top-N without a new serving path.
- Value-first leaderboards as the default sort on ranking cards (pair Search
  uses value sort; cards stay count-first).
- Export / CSV from the ranking sheet (future analytics surface).
- Replacing search or institution/supplier pages with rankings.
- Treating the sheet as a second data source.
- New GraphQL for pair lists (reuse Search).
- Correcting misleading source amounts in the client.

## Acceptance criteria

Use these to review UI, tests, and alternate implementations:

1. With more than 5 live rows, the card shows 5, then expands/collapses to the
   full live payload without fetching beyond `TOP_N`.
2. With 5 or fewer live rows, no show-more control appears.
3. The sheet lists exactly the same parties/categories and measures as the card
   payload for the current filters.
4. No mock, duplicated, or zero-padded rows appear to suggest deeper coverage.
5. Card rows stay to rank + name + one metric pair + thin bar; secondary
   identity/quality footnotes stay out of the card.
6. Table open control is icon-only and has an accessible name.
7. Unscoped party/category names deep-link to the correct procurement pages when
   IDs exist; scoped party rows deep-link to pair Search (criteria 11–13).
8. Explicit unavailable states are distinguishable from “zero results.”
9. `ProcurementPreviewBadge` is unused on these live ranking surfaces.
10. Code near `TOP_N` / ranking components retains a ClickHouse (or successor)
    TODO until deeper rankings are actually served.

## Implementation pointers (non-normative)

- `src/features/procurement/components/procurement-party-ranking.tsx`
  (`pairScope`, `grain`)
- `src/features/procurement/lib/party-links.ts` (`partyPairSearchLink`,
  `analysisGrainToSearchGrain`)
- `src/features/procurement/components/procurement-authority-slice.tsx`
- `src/features/procurement/components/procurement-supplier-slice.tsx`
- `src/features/procurement/components/procurement-category-bars.tsx`
- `src/features/procurement/components/procurement-preview-badge.tsx`
- `src/features/procurement/api/procurement-api.live.ts` (`TOP_N`)
- Visual reference: PNRR `RankedListCard` in
  `src/features/pnrr/components/tabs/PnrrOverview.tsx`

## Related docs

- Hub / spine: [`docs/design/procurement/features/phase-a-spine.md`](../design/procurement/features/phase-a-spine.md)
- Search (pair drill target): [`docs/design/procurement/features/procurement-search-listing.md`](../design/procurement/features/procurement-search-listing.md)
- Authority slice: [`docs/design/procurement/features/authority-procurement-slice.md`](../design/procurement/features/authority-procurement-slice.md)
- Supplier slice: [`docs/design/procurement/features/supplier-procurement-slice.md`](../design/procurement/features/supplier-procurement-slice.md)
- Analytics depth (future rankings route): [`docs/design/procurement/features/phase-c-analytics-depth.md`](../design/procurement/features/phase-c-analytics-depth.md)
- Geography unavailable rankings: [`docs/specs/procurement-geography-filter-requirements.md`](./procurement-geography-filter-requirements.md)
