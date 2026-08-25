import type { LegalChangesFilter, LegalChangesPage } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import {
  fetchRecentChangesCountLive,
  fetchRecentChangesPageLive,
} from './legal-changes-api.live'
import {
  fetchRecentChangesCountMock,
  fetchRecentChangesPageMock,
} from './legal-changes-api.mock'

/**
 * Mock/live dispatcher for the change feed (`/legislation/changes`). One
 * cursor page per call; the cursor is bound to the filter server-side, so a
 * filter change must restart from the first page (no `after`).
 */
export async function fetchRecentChangesPage(
  filter: LegalChangesFilter,
  options: {
    readonly first?: number
    readonly after?: string
    readonly signal?: AbortSignal
  } = {},
): Promise<LegalChangesPage> {
  if (isLegalMockEnabled()) return fetchRecentChangesPageMock(filter)
  return fetchRecentChangesPageLive(filter, options)
}

/**
 * The filtered total — a SEPARATE request from the feed, keyed on the filter
 * and never on the cursor, because the server's count is a lazy full scan
 * whose failure would otherwise take the feed down with it (see the live
 * adapter). Null means "the server could not assert one" — render a lower
 * bound, never 0.
 */
export async function fetchRecentChangesCount(
  filter: LegalChangesFilter,
  options: { readonly signal?: AbortSignal } = {},
): Promise<number | null> {
  if (isLegalMockEnabled()) return fetchRecentChangesCountMock(filter)
  return fetchRecentChangesCountLive(filter, options)
}
