/**
 * Facet helpers for the proiecte (laws) tab's PNRR-style search: the filter
 * sheet + active-chips row + trigger-badge count. Pure, mirroring
 * `countActiveMemberSpeechFilters`. Labels delegate to `bill-profile-data.ts`
 * so the chips always match the sheet options.
 */
import type { ParliamentBillsSearch } from '@/schemas/parliament'
import { t } from '@lingui/core/macro'
import { getBillLocationLabel, getBillTypeLabel } from './bill-profile-data'

/**
 * Count the active FILTER facets (type + location + last-event period). The
 * free-text `q` lives in the always-visible search input (its own chip), and
 * `sortBy` is presentation, so neither counts toward the trigger badge.
 */
export function countActiveBillFilters(search: ParliamentBillsSearch): number {
  let count = 0
  if (search.billType) count += 1
  if (search.billLocation) count += 1
  if (search.from || search.to) count += 1
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

/** `2026-08-04` → `4 aug. 2026`, pinned to the source calendar day. */
function formatBillFilterDay(value: string): string {
  const day = value.slice(0, 10)
  const parsed = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Chip for the same last-event range the server applies to the list. */
export function getBillLastEventDateChipLabel(
  search: ParliamentBillsSearch,
): string | null {
  if (!search.from && !search.to) return null
  if (search.from && search.from === search.to) {
    return t`Ultima etapă: ${formatBillFilterDay(search.from)}`
  }
  const from = search.from ? formatBillFilterDay(search.from) : t`început`
  const to = search.to ? formatBillFilterDay(search.to) : t`prezent`
  return t`Ultima etapă: ${from} – ${to}`
}
