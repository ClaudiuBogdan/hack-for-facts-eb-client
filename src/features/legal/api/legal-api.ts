import type { LegislationOverview } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegislationOverviewLive } from './legal-api.live'
import { fetchLegislationOverviewMock } from './legal-api.mock'

/**
 * Mock/live dispatcher for the legal domain. Going live is a swap here plus a
 * real implementation in `legal-api.live.ts` — no UI changes.
 */
export async function fetchLegislationOverview(): Promise<LegislationOverview> {
  if (isLegalMockEnabled()) return fetchLegislationOverviewMock()
  return fetchLegislationOverviewLive()
}
