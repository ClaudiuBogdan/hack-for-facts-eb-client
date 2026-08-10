import type { LegalActsBrowseFilter, LegalActsPage } from '@/schemas/legal'
import { legislationOverviewFixture } from '../mocks/fixtures/legislation-overview'

/**
 * Mock directory lane: the overview fixture's ranked acts, filtered
 * client-side. Small on purpose — the directory's real behavior (cursor
 * exhaustion, filter shapes) is pinned against the live adapter's mapping,
 * not against an invented corpus.
 */
export async function fetchLegalActsPageMock(
  filter: LegalActsBrowseFilter,
): Promise<LegalActsPage> {
  const items = legislationOverviewFixture.mostCitedActs.filter(
    (act) =>
      (filter.actType === undefined || act.actType === filter.actType) &&
      (filter.year === undefined || act.actYear === filter.year) &&
      (filter.status === undefined || act.status === filter.status),
  )
  return { items, endCursor: null, totalCount: items.length }
}
