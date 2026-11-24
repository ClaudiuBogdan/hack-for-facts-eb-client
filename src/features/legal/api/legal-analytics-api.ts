import type { LegalAnalyticsAnswer, LegalAnalyticsArgs, LegalAnalyticsView } from '@/schemas/legal-analytics'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalAnalyticsLive } from './legal-analytics-api.live'
import { fetchLegalAnalyticsMock } from './legal-analytics-api.mock'

export { LegalAnalyticsError, type LegalAnalyticsErrorKind } from './legal-analytics-api.live'

/** Mock/live dispatcher for the legislation analytics views; both lanes validate through the same schemas. */
export async function fetchLegalAnalytics<V extends LegalAnalyticsView>(
  view: V,
  args: LegalAnalyticsArgs,
  signal?: AbortSignal,
): Promise<LegalAnalyticsAnswer<V>> {
  if (isLegalMockEnabled()) return fetchLegalAnalyticsMock(view, args)
  return fetchLegalAnalyticsLive(view, args, signal)
}
