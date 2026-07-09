/**
 * Facet helpers for the proiecte (laws) tab's PNRR-style search: the filter
 * sheet + active-chips row + trigger-badge count. Pure, mirroring
 * `countActiveMemberSpeechFilters`. Labels delegate to `bill-profile-data.ts`
 * so the chips always match the sheet options.
 */
import type { ParliamentBillsSearch } from '@/schemas/parliament'
import { getBillLocationLabel, getBillTypeLabel } from './bill-profile-data'

/**
 * Count the active FILTER facets (type + location). The free-text `q` lives in
 * the always-visible search input (its own chip), and `sortBy` is presentation,
 * so neither counts toward the trigger badge.
 */
export function countActiveBillFilters(search: ParliamentBillsSearch): number {
  let count = 0
  if (search.billType) count += 1
  if (search.billLocation) count += 1
  return count
}

/** Chip label for the bill-type facet. */
export function getBillTypeChipLabel(search: ParliamentBillsSearch): string | null {
  return search.billType ? `Tip: ${getBillTypeLabel(search.billType)}` : null
}

/** Chip label for the current-location facet. */
export function getBillLocationChipLabel(
  search: ParliamentBillsSearch,
): string | null {
  return search.billLocation
    ? `Etapă: ${getBillLocationLabel(search.billLocation)}`
    : null
}
