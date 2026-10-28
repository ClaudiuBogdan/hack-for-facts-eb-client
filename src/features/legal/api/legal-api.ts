import type { LegislationFrontDoor, LegislationOverview } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegislationFrontDoorLive, fetchLegislationOverviewLive } from './legal-api.live'
import { fetchLegislationFrontDoorMock, fetchLegislationOverviewMock } from './legal-api.mock'

/**
 * Mock/live dispatcher for the legal domain. Going live is a swap here plus a
 * real implementation in `legal-api.live.ts` — no UI changes.
 */
export async function fetchLegislationOverview(): Promise<LegislationOverview> {
  if (isLegalMockEnabled()) return fetchLegislationOverviewMock()
  return fetchLegislationOverviewLive()
}

/** The front door's gazette band: the latest Monitorul Oficial issues, without the analytics tab's ranking. */
export async function fetchLegislationFrontDoor(signal?: AbortSignal): Promise<LegislationFrontDoor> {
  if (isLegalMockEnabled()) return fetchLegislationFrontDoorMock()
  return fetchLegislationFrontDoorLive(signal)
}
