/**
 * The "value quality" search facet — a user-facing grouping of the data-layer
 * value-resolution states (rules v2) that mirrors the record display
 * (`describeMoney` in ./formatting). Each category maps to one or more raw
 * `value_state` tokens; the search builder expands the selected categories into
 * the server's `valueState: { in: [...] }` filter.
 *
 * Categories (aligned with the display kinds):
 *   accepted  — the money is confirmed and comparable (the accepted states)
 *   foreign   — a foreign-currency-only value (no comparable RON, unless BNR)
 *   invalid   — a corrupted / out-of-bounds source value ("atipică")
 *   ambiguous — grain-ambiguous value (framework ceilings + cross-source
 *               pending-audit rows); frameworks AS RECORDS live in the
 *               separate record-kind facet (./record-kind)
 *   conflict  — sources disagree on the value
 *   missing   — no value recorded, or not applicable to the row
 *
 * The raw-state vocabulary is the frozen server contract
 * (server ACCEPTED_VALUE_STATES ∪ VALUE_STATES); keep it in sync with
 * `valueResolutionSchema` in `@/schemas/procurement`.
 */
import type { ProcurementValueCategory } from '@/schemas/procurement-search'

export type { ProcurementValueCategory } from '@/schemas/procurement-search'
export { PROCUREMENT_VALUE_CATEGORIES } from '@/schemas/procurement-search'

/**
 * Category → raw `value_state` tokens. The accepted set includes the two
 * reserved states (`cross_source_exact`, `official_document_recovered`) that the
 * v2 engine does not yet mint but that are part of the frozen contract — so a
 * later activation needs no client change.
 */
const VALUE_STATES_BY_CATEGORY: Readonly<
  Record<ProcurementValueCategory, readonly string[]>
> = {
  accepted: [
    'official_exact',
    'official_ron_equivalent',
    'cross_source_exact',
    'official_document_recovered',
  ],
  foreign: ['foreign_currency_only'],
  invalid: ['invalid_source_value'],
  ambiguous: ['ambiguous_grain'],
  conflict: ['conflicting_sources'],
  missing: ['source_missing', 'not_applicable'],
}

/**
 * Expand selected categories into the de-duplicated raw `value_state` tokens for
 * the server `valueState: { in }` filter. Returns `undefined` when nothing is
 * selected (an omitted key = no constraint), matching the other builders.
 */
export function expandValueCategories(
  categories: readonly ProcurementValueCategory[],
): string[] | undefined {
  if (categories.length === 0) return undefined
  const states = new Set<string>()
  for (const category of categories) {
    for (const state of VALUE_STATES_BY_CATEGORY[category]) states.add(state)
  }
  return states.size > 0 ? [...states] : undefined
}
