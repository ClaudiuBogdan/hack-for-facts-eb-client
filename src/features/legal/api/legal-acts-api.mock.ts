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
  // Domain, category and penalties are read from summaries the fixture rows do
  // not carry, so under one of them no fixture act qualifies (Codex review,
  // round 1). Their request shape is pinned by the live adapter's test.
  if (filter.domain?.length || filter.category?.length || filter.penaltiesMentioned) return { items: [], endCursor: null, totalCount: 0 }
  const items = legislationOverviewFixture.mostCitedActs.filter(
    (act) =>
      (filter.actType === undefined || filter.actType.includes(act.actType)) &&
      (filter.status === undefined || (act.status !== null && filter.status.includes(act.status))) &&
      (filter.yearFrom === undefined || (act.actYear !== null && act.actYear >= filter.yearFrom)) &&
      (filter.yearTo === undefined || (act.actYear !== null && act.actYear <= filter.yearTo)),
  )
  return { items, endCursor: null, totalCount: items.length }
}
