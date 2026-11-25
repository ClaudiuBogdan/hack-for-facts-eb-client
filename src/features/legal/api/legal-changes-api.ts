import type { LegalChangesFilter, LegalChangesPage } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import {
  fetchRecentChangesCountLive,
  fetchRecentChangesPageLive,
} from './legal-changes-api.live'

/**
 * The fixture is served only by the development server and the tests: it names real acts as they were when it
 * was copied, so in production the condition is the constant `false` and the fixture's module is never emitted
 * (the same guard as the analytics adapter's).
 */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

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
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-changes-api.mock')).fetchRecentChangesPageMock(filter)
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
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-changes-api.mock')).fetchRecentChangesCountMock(filter)
  return fetchRecentChangesCountLive(filter, options)
}
