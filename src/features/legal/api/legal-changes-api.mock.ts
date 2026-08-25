import type { LegalChangesFilter, LegalChangesPage } from '@/schemas/legal'
import { legislationChangesFixture } from '../mocks/fixtures/legislation-changes'

/**
 * Mock change-feed lane: the fixture rows filtered and re-sorted client-side
 * with the SERVER's semantics — (effective_date desc NULLS LAST, event_id
 * desc); `undated` serves only null-date rows; a since/until window excludes
 * them. Small on purpose: cursor mechanics (`after`, the filter-bound cursor)
 * are pinned against the live adapter, not re-invented here — the fixture's
 * job is to exercise every ROW state (future/past, portal/MO, dated/undated,
 * sourceAct present/null).
 */
function matches(
  row: (typeof legislationChangesFixture)[number],
  filter: LegalChangesFilter,
): boolean {
  if (filter.kind !== undefined && row.eventKind !== filter.kind) return false
  if (filter.source !== undefined && row.eventSource !== filter.source)
    return false
  if (filter.undated === true) return row.effectiveDate === null
  if (filter.since !== undefined || filter.until !== undefined) {
    if (row.effectiveDate === null) return false
    if (filter.since !== undefined && row.effectiveDate < filter.since)
      return false
    if (filter.until !== undefined && row.effectiveDate > filter.until)
      return false
  }
  return true
}

function serveOrder(
  a: (typeof legislationChangesFixture)[number],
  b: (typeof legislationChangesFixture)[number],
): number {
  if (a.effectiveDate !== b.effectiveDate) {
    if (a.effectiveDate === null) return 1
    if (b.effectiveDate === null) return -1
    return a.effectiveDate < b.effectiveDate ? 1 : -1
  }
  return Number(b.eventId) - Number(a.eventId)
}

export async function fetchRecentChangesPageMock(
  filter: LegalChangesFilter,
): Promise<LegalChangesPage> {
  const items = legislationChangesFixture.filter((row) => matches(row, filter))
  return { items: [...items].sort(serveOrder), endCursor: null }
}

export async function fetchRecentChangesCountMock(
  filter: LegalChangesFilter,
): Promise<number | null> {
  return legislationChangesFixture.filter((row) => matches(row, filter)).length
}
