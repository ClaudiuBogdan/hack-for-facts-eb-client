# Procurement Rankings Surface — Implementation Plan

**Status:** Approved for Phase 1 — decisions locked 2026-07-21  
**Date:** 2026-07-21  
**Route:** `/procurement` (new `view=rankings`), peer to `view=overview` / `view=list`  
**Codes:** builds on shared-hub A2/F2, ranking-cards A2/B1/C1/D2, geography limits

> **Executive summary.** Rankings is the investigation *table* face of the same
> aggregates the Overview cards glance at. Ship as a third hub view backed by
> existing breakdown/facets at **top-50**, with **client-simulated pagination UI**
> (TODO for real server pagination), count-first sort, division-default CPV +
> code toggle, distinct-count summary columns, profile + “view records” drills,
> and explicit unavailable panels under buyer geography for buyers/suppliers.

---

## 0. Locked product decisions (2026-07-21)

| # | Question | Decision |
| --- | --- | --- |
| 1 | Depth | **Top-50 v1** + **simulate pagination in UI**; `TODO(ClickHouse / server offset)` for real deeper pagination later |
| 2 | CPV | **Division-default + `code` toggle** |
| 3 | Buyer geo | **Unavailable panel** for buyers/suppliers (do not hide sub-tabs); CPV stays live |
| 4 | Row click | **Profile primary** + **“view records”** → List with that dimension + current scope |
| 5 | Sort / value | **Count-sort only**; awarded value is a **display column**. Values/counts must **reflect applied hub filters** that the ranking scope can honor (including `status` when scoped — e.g. cancelled). Facets the aggregates cannot honor stay inactive chips |
| 6 | Unsupported facets | Inactive **“not applied to rankings”** chips (C1) |
| 7 | Distinct counts | **In v1** — whole-scope distinct institution/supplier (and when available, counterparties); under buyer geo show honesty / unavailable for party distincts |
| 8 | Card sheet vs tab | **Coexist** — Overview sheet stays top-10 glance; Rankings tab is the deeper table; card control can also deep-link to Rankings |

---

## 1. Verdict on user decisions (design rationale)

### Decision 1 — Surface shape: peer hub TAB → **AGREE**

Implement as a **third value of the existing hub `view` schema**
(`overview | list | rankings`) on `/procurement` — not a standalone route.

### Decision 2 — Grain: follow Overview grain → **AGREE**

Shared `grain` URL + Overview analysis toggle. Gate supplier when grain has no
awards (`procedures`).

### Decision 3 — CPV → **LOCKED: division-default + code toggle**

### Decision 4 — Row navigation → **LOCKED: profile + view records**

---

## 2. Open questions — closed

See §0. No blocking product questions remain for Phase 1 start.

---

## 3. Recommended IA

### Tabs

| Tab | `view` | Job |
| --- | --- | --- |
| Overview | `overview` | Glance: cards, map, trend |
| **Rankings** | `rankings` | Leaderboard tables (top-50 + simulated pages) |
| List | `list` | Paginated records |

Order: **Overview · List · Rankings**.

### URL keys

| Key | Values | Default | Notes |
| --- | --- | --- | --- |
| `view` | `overview \| list \| rankings` | `overview` | extend schema |
| `rankDim` | `buyer \| supplier \| cpv` | `buyer` | sub-tab |
| `cpvLevel` | `division \| code` | `division` | when `rankDim=cpv` |
| `rankPage` | int ≥ 1 | `1` | **client page** over the top-50 payload |
| `rankPageSize` | e.g. 10 \| 25 \| 50 | `10` | client page size; capped by payload length |
| `measure` | shared | shared | display emphasis; sort stays count |
| `grain` / period / buyer geo | shared | shared | reuse |

### Relationship to Overview cards

- Cards + top-10 sheet **coexist**.
- Card table icon / “See full rankings” → `view=rankings&rankDim=…` preserving scope.

---

## 4. Table contract per dimension

### Common columns

| Col | Source | Notes |
| --- | --- | --- |
| Rank | index in full top-50 (not page-local) | Stable across client pages |
| Name / label | party / CPV | + CUI or code secondary line |
| Records | `recordCount` | **default sort**, desc |
| Share % | `shareOfScope` | of current scope |
| Awarded value | `valueAwardedSum` | when served; reflects scoped filters |
| Distinct counterparties | when served | per-row only if bucket exposes it; else summary strip only |
| (actions) | — | profile link · “view records” |

### Summary strip (above table, v1)

| Metric | Notes |
| --- | --- |
| Distinct institutions in scope | From concentration / analysis measure when served |
| Distinct suppliers in scope | Same |
| Honesty under buyer geo | Party distincts unavailable → explicit copy |

### Simulated pagination (v1)

- Fetch **one** payload of ≤50 rows (`topN=50`).
- Client slices by `rankPage` / `rankPageSize` for the table body.
- Pagination chrome always present (prev/next, page size).
- When `rankPage` would exceed available client pages, clamp.
- Footer honesty: “Showing N of up to 50 for the current filters.”
- Code marker:

```ts
// TODO(ClickHouse / server offset pagination): replace client slice over
// topN=50 with a real paginated leaderboard query (page/pageSize → server).
// Until then, UI pagination only windows the honest top-50 payload.
```

### Buyer / Supplier / CPV

- Buyer geo → **unavailable panels** on buyer/supplier (sub-tabs stay visible).
- CPV stays live under geo; division default + code toggle.
- Row → profile; “view records” → List with dimension + current scope.

### Filters

| Filter | Rankings |
| --- | --- |
| period, grain, buyer geo | Applied (geo gates party dims) |
| `authority_cui`, `supplier_cui`, `cpv`, `cpv_division` | Applied via scope |
| `status` | **Apply when scope accepts it** so cancelled / other selections change counts and value |
| `source`, `value_state`, value range, `q` | **Not applied** → inactive “not applied to rankings” chips |
| supplier geography | Preview / not applied |

---

## 5. API honesty / phases

### Phase 1 (now)

- `topN=50`, count-sorted, client-simulated pages.
- Distinct-count **summary** (and per-row if API returns them).
- No Preview badge; unavailable = reason panels.
- Keep ClickHouse TODOs at fetch + pagination chrome.

### Phase 2

- Server offset pagination beyond 50.
- Value-sorted leaderboards (gated).
- Distincts under geography when keys retained.
- CPV code labels / category rollups / CSV.

---

## 6. Acceptance criteria (testable)

1. Peer tab `view=rankings`; no filter key stripping on switch.
2. Default `rankDim=buyer`, count-sorted top-50.
3. Pagination UI pages the top-50 client-side; footer discloses the 50 cap; TODO present in code.
4. Division default + working or honestly disabled code toggle.
5. Buyer geo → unavailable panels on buyer/supplier; CPV live; sub-tabs still visible.
6. Row → profile; “view records” → List with dimension + scope.
7. Status (when set) changes ranking numbers if scope supports it; unsupported facets show inactive chips.
8. Distinct institution/supplier summary visible when served; geo honesty when not.
9. Overview card sheet still works; card can deep-link to Rankings.
10. No fake rows beyond API payload.

---

## 7. Out of scope (Phase 1)

- Real server pagination past top-50.
- Value-sorted leaderboards as a sort option.
- Supplier geography applied.
- Pair D2 search from hub rankings (stays on slice pages).
- Standalone `/procurement/rankings` route; Phase C analytics BI.

---

## 8. File / touch list — Phase 1

- Schema: `view=rankings`, `rankDim`, `cpvLevel`, `rankPage`, `rankPageSize`.
- Tab nav + overview page branch.
- New `procurement-rankings-view.tsx` + `procurement-ranking-table.tsx`.
- Leaderboard fetch `topN=50` + ClickHouse TODO; client pagination TODO.
- Distinct summary strip; wire `status` into scope when supported.
- Hub chips: “not applied to rankings”; capability matrix row.
- Overview card deep-link to Rankings (keep sheet).
- i18n + schema/tab tests.

---

## 9. Risks

| Risk | Mitigation |
| --- | --- |
| Simulated pagination feels like fake depth | Cap disclosure + TODO; never invent rows beyond 50 |
| `status` on scope may be single-value / partial | Probe; if multi-status unsupported, document and chip honesty |
| Distinct measures fail under geo | Same unavailable pattern as party rankings |
| CPV code unsupported | Disable toggle with reason |
| Perf of top-50 + name resolve | Single active dim fetch; party name cache |
