import type { LegislationFreshness } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegislationFreshnessLive } from './legal-freshness-api.live'

/**
 * The fixture is served only by the development server and the tests: it names real acts as they were when it
 * was copied, so in production the condition is the constant `false` and the fixture's module is never emitted
 * (the same guard as the analytics adapter's).
 */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

/**
 * Mock/live dispatcher for the corpus frontiers. Its OWN request, like the
 * status counts: a failure leaves the dates and the count unknown (surfaces
 * drop them) instead of failing a route.
 */
export async function fetchLegislationFreshness(
  options: { readonly signal?: AbortSignal } = {},
): Promise<LegislationFreshness> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-freshness-api.mock')).fetchLegislationFreshnessMock()
  return fetchLegislationFreshnessLive(options)
}
