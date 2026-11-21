import type { LegislationFreshness } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegislationFreshnessLive } from './legal-freshness-api.live'
import { fetchLegislationFreshnessMock } from './legal-freshness-api.mock'

/**
 * Mock/live dispatcher for the corpus frontiers. Its OWN request, like the
 * status counts: a failure leaves the dates and the count unknown (surfaces
 * drop them) instead of failing a route.
 */
export async function fetchLegislationFreshness(
  options: { readonly signal?: AbortSignal } = {},
): Promise<LegislationFreshness> {
  if (isLegalMockEnabled()) return fetchLegislationFreshnessMock()
  return fetchLegislationFreshnessLive(options)
}
