import type { LegalStatusActCounts } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchStatusActCountsLive } from './legal-status-counts-api.live'
import { fetchStatusActCountsMock } from './legal-status-counts-api.mock'

/**
 * Mock/live dispatcher for the headline counts — the KPI strip's four tiles
 * and the header chips.
 *
 * Deliberately its OWN request rather than a rider on
 * `fetchLegislationOverview`, for the same reason as the domain grid's
 * counts: the shared transport fails the whole request on any GraphQL error
 * entry, and the overview runs in the route loader — folded in, a failed
 * aggregate would take down the gazette band, the citation ranking and the
 * route itself, when the contract here is the opposite (the strip renders
 * its tiles label-only and says the numbers could not load). One request
 * still serves every tile AND the chips; what this replaced was four aliased
 * per-status `totalCount` queries, not a second page query.
 */
export async function fetchStatusActCounts(
  options: { readonly signal?: AbortSignal } = {},
): Promise<LegalStatusActCounts> {
  if (isLegalMockEnabled()) return fetchStatusActCountsMock()
  return fetchStatusActCountsLive(options)
}
