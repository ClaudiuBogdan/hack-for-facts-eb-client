import type { LegalDomainActCounts } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchDomainActCountsLive } from './legal-domain-counts-api.live'
import { fetchDomainActCountsMock } from './legal-domain-counts-api.mock'

/**
 * Mock/live dispatcher for the domain grid's counts.
 *
 * Deliberately its OWN request rather than a rider on
 * `fetchLegislationOverview`: the shared transport fails the whole request on
 * any GraphQL error entry, and the overview runs in the route loader — folded
 * in, a failed aggregate would take down the KPI chips, the gazette band and
 * the route itself, when the contract here is the opposite (the grid renders
 * its 16 cells label-only). One request still serves every cell; the cost
 * that was rejected was 16 per-cell round-trips, not a second page query.
 */
export async function fetchDomainActCounts(
  options: { readonly signal?: AbortSignal } = {},
): Promise<LegalDomainActCounts> {
  if (isLegalMockEnabled()) return fetchDomainActCountsMock()
  return fetchDomainActCountsLive(options)
}
