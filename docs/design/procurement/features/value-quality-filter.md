# Value-quality search filter

The procurement search sheet exposes a **Value quality** facet that filters
records by the data-layer value-resolution state (rules v2). It sits beside the
Status facet on the procedures / contracts / direct-acquisition grains
(modifications have no resolved value and are excluded).

## Why

Every valued row carries a `value.valueState` explaining whether its money is
trustworthy (see `ValueWithCurrency` / `describeMoney`). The filter lets a user
scope a search to, say, only **confirmed** values, or surface only **atypical**
(corrupted-source) rows for review — the same categories they see on each record.

## Categories → raw states

The UI offers curated categories (not the raw enum). Each maps to one or more
server `value_state` tokens; the mapping lives in
`src/features/procurement/lib/value-category.ts` (`expandValueCategories`):

| Category (UI)         | `value_state` tokens |
| --------------------- | -------------------- |
| Valoare confirmată (`accepted`)  | `official_exact`, `official_ron_equivalent`, `cross_source_exact`*, `official_document_recovered`* |
| Valută străină (`foreign`)       | `foreign_currency_only` |
| Valoare atipică (`invalid`)      | `invalid_source_value` |
| Valoare-cadru (`framework`)      | `ambiguous_grain` |
| Surse divergente (`conflict`)    | `conflicting_sources` |
| Fără valoare (`missing`)         | `source_missing`, `not_applicable` |

\* Reserved states the v2 engine does not yet mint but that are part of the
frozen server contract — included so a later activation needs no client change.

The categories are intentionally the same set as the record display kinds
(`describeMoney`), so a word means the same thing on a record and in the filter.

## Data flow

```
URL ?value_state=accepted,invalid
  → procurementSearchSchema (comma-list, unknown tokens dropped)   schemas/procurement-search.ts
  → ProcurementSearchState.value_state: ProcurementValueCategory[]
  → build{Procedures,Contracts,DirectAcquisitions}Filter           api/graphql/procurement-filters.ts
      expandValueCategories(...) → filter.valueState = { in: [...] }
  → GraphQL StringInInput `valueState` on each grain filter         (server contract)
```

- **State:** a `value_state` URL param (comma-list of category tokens; junk
  normalises away via the `.catch` idiom, like `status`).
- **Setter:** `useProcurementFilterState().setValueCategories`.
- **UI:** a multi-select `ToggleGroup` in `ProcurementFilterSheet`
  (`valueCategoryLabel` for the RO labels).
- **Chips / active count:** a `value-state` chip in `filter-meta.ts`, cleared to
  `{ value_state: undefined }`; `CLEAR_ALL_FILTERS_PATCH` resets it.

## Tests

- `lib/value-category.test.ts` — the category → state expansion (dedup, empty →
  undefined, every category non-empty).
- `api/graphql/procurement-filters.test.ts` — the builders emit
  `valueState: { in }` on all three grains, union + de-dup, omitted when empty.
- `lib/filter-meta.test.ts` — the value-quality chip + clear-all.
- `schemas/procurement-search.test.ts` — comma-list parse, unknown-token drop.

## Notes

- Modifications are excluded (no resolved value; the facet is hidden for that
  grain, and `buildModificationsFilter` never emits `valueState`).
- The server filter is additive: an omitted `valueState` = no constraint. The
  facet never sends an empty `in: []`.
