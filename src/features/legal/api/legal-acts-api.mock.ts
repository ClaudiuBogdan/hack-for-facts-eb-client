import type { LegalActsPage } from '@/schemas/legal'
import type { LegalSearchFilter } from './legal-search-api.live'
import { legislationOverviewFixture } from '../mocks/fixtures/legislation-overview'

/**
 * Mock lane of the act list: the overview fixture's ranked acts, filtered
 * client-side by type, status and year range. Small on purpose — the real
 * behavior (cursor exhaustion, filter shapes) is pinned against the live
 * adapter's mapping, not against an invented corpus.
 */
export async function fetchLegalActsPageMock(
  filter: LegalSearchFilter,
): Promise<LegalActsPage> {
  // Domain, category and penalties are deliberately NOT applied: the fixture
  // rows carry no summary, and pretending to filter would return the same list
  // under a claim it cannot honor. Their request shape is pinned by the live
  // adapter's test instead.
  const items = legislationOverviewFixture.mostCitedActs.filter(
    (act) =>
      (filter.actType === undefined || filter.actType.includes(act.actType)) &&
      (filter.status === undefined || (act.status !== null && filter.status.includes(act.status))) &&
      (filter.yearFrom === undefined || (act.actYear !== null && act.actYear >= filter.yearFrom)) &&
      (filter.yearTo === undefined || (act.actYear !== null && act.actYear <= filter.yearTo)),
  )
  return { items, endCursor: null, totalCount: items.length }
}
