# Phase B — Honesty filters coordination

> Status: **blocked on API / data pipeline** — client readiness notes only  
> Owner lanes: data pipeline (rollups + facts), API (SDL + matrix), client (wire when green)

## Goal

Finish filters that today are half-wired or approximated, without inventing blocked facets in the UI.

## Work items

### 1. Key-retaining region rollup (or bounded facts query)

**Why:** Under `buyerRegion`, the client cannot show top authorities/suppliers or `distinctAuthorities` / `distinctSuppliers` — the current region×CPV monthly rollup drops party keys.

**Data pipeline**

- Add a key-retaining monthly rollup (e.g. region×authority or edge-by-region) **or** publish a bounded facts read path for entity-scoped region queries.
- Rebuild analysis facts after the entity geography resolver so buyer-region coverage clears the degraded gate.

**API**

- Extend the procurement analysis capability matrix for the new rollup.
- Keep fail-closed matrix hash checks between API and active generation.

**Client (when matrix green)**

- Resume party rankings + analysis workspace under buyer geography in `procurement-overview-page.tsx`.
- Remove the “unavailable under regional rollup” copy.

### 2. Search-list geography on GraphQL search filters

**Why:** Internal filter specs already support `countyCode` / `region` via core territory joins; public GraphQL search inputs do not expose them. Overview geography does not carry into `/procurement/search`.

**API**

- Add `buyerRegion` / `buyerCounty` (and later supplier axes) to contract, procedure, and direct-acquisition search filter inputs.
- Reuse the same resolver join path as cursor/list filters; keep direct-acquisition selective gates.

**Client**

- Forward overview geography into search URL params.
- Stop ignoring `county` / `region` in `procurement-filters.ts` builders once the API exposes them.
- Remove the “search opens without this location filter” warning when wired.

### 3. Review signals on the generation stack

**Why:** UI previously advertised `same_day` / `repeated_pairs` without narrowing results. Phase A disables the control. Legacy same-day candidate tables are not on the active analysis generation surface.

**Data pipeline / API**

- Republish same-day DA candidates (and repeated-pair edges) against active analysis generations.
- Expose a GraphQL search filter or a dedicated review-signals query.

**Client**

- Re-enable the filter-sheet control and active chips in `filter-meta.ts`.
- Optionally add `/procurement/semnale` explorer (see `review-signals-explorer.md`).

### 4. County / UAT (stop county→region approximation)

**Why:** Client maps `buyerCounty` → parent `buyerRegion` today.

**Data pipeline**

- Wave-2 rollups: `buyer_county_code`, `buyer_siruta` on facts + monthly tables.

**API**

- Accept `buyerCounty` / `buyerSiruta` in analysis scope; add breakdown dimensions when ready.

**Client**

- Pass county/UAT natively; remove approximation messaging in `procurement-geography.ts` / overview filter sheet.

## Acceptance checklist

- [ ] Party rankings work under `buyerRegion`
- [ ] Search results respect buyer geography from overview
- [ ] Signal facet actually filters (or stays hidden)
- [ ] County filter is county-precise, not region approximation
- [ ] Capability matrix + client docs updated together

## References

- Client: [`geography-filter-client-readiness.md`](./geography-filter-client-readiness.md)
- Spec: [`docs/specs/procurement-geography-filter-requirements.md`](../../../specs/procurement-geography-filter-requirements.md)
- Product intent: [`docs/ux-research/procurement.md`](../../../ux-research/procurement.md)
