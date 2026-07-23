/**
 * The record-kind search facet (serving convention 2026-07-23; scrapper
 * docs/procurement/PROCUREMENT_TYPES_AND_VALUES_EXPLAINED.md §5–§6): what a
 * contract row IS — an actual purchase (contract award) vs a framework
 * agreement (an umbrella whose value is a ceiling, not spend). Orthogonal to
 * the value-quality facet (./value-category): a framework can carry a
 * perfectly parseable ceiling, and a purchase can carry a corrupted value.
 * Contracts grain only — the server exposes recordKind on
 * ProcurementContractsFilter alone.
 */
import type { ProcurementRecordKindOption } from '@/schemas/procurement-search'

export type { ProcurementRecordKindOption } from '@/schemas/procurement-search'
export { PROCUREMENT_RECORD_KIND_OPTIONS } from '@/schemas/procurement-search'

/** Facet option → server recordKind tokens (rows with NULL kind read as contract_award server-side). */
const RECORD_KINDS_BY_OPTION: Readonly<
  Record<ProcurementRecordKindOption, readonly string[]>
> = {
  purchases: ['contract_award'],
  frameworks: ['framework_agreement'],
}

/**
 * Expand selected options into the server `recordKind: { in }` tokens.
 * `undefined` when nothing (or everything) is effectively selected — selecting
 * both options is the same as no constraint, so we omit the filter entirely.
 */
export function expandRecordKinds(
  options: readonly ProcurementRecordKindOption[],
): string[] | undefined {
  if (options.length === 0) return undefined
  const kinds = new Set<string>()
  for (const option of options) {
    for (const kind of RECORD_KINDS_BY_OPTION[option]) kinds.add(kind)
  }
  // Both kinds selected = the full population; omit the predicate.
  if (kinds.size >= 2) return undefined
  return [...kinds]
}
