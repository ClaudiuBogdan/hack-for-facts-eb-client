import type { LegalAnalyticsAnswer, LegalAnalyticsArgs, LegalAnalyticsView } from '@/schemas/legal-analytics'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalAnalyticsLive } from './legal-analytics-api.live'

export {
  LEGAL_ANALYTICS_UNAVAILABLE,
  LegalAnalyticsError,
  type LegalAnalyticsErrorKind,
} from './legal-analytics-api.live'

/**
 * Whether this build can serve the analytics fixture at all: only the development server and the tests. The
 * fixture names real acts as they were when it was copied, so a production build carries none of it: there the
 * condition is the constant `false`, and the fixture's module is never emitted.
 */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

/** The analytics answers are the fixture's (mock mode, development or tests only): the pages say so. */
export function isLegalAnalyticsMock(): boolean {
  return FIXTURE_BUILD && isLegalMockEnabled()
}

/** Mock/live dispatcher for the legislation analytics views; both lanes validate through the same schemas. */
export async function fetchLegalAnalytics<V extends LegalAnalyticsView>(
  view: V,
  args: LegalAnalyticsArgs,
  signal?: AbortSignal,
): Promise<LegalAnalyticsAnswer<V>> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) {
    const { fetchLegalAnalyticsMock } = await import('./legal-analytics-api.mock')
    return fetchLegalAnalyticsMock(view, args)
  }
  return fetchLegalAnalyticsLive(view, args, signal)
}
