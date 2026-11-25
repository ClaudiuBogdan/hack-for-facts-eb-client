import type { LegislationFrontDoor, LegislationOverview } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegislationFrontDoorLive, fetchLegislationOverviewLive } from './legal-api.live'

/** Fixtures only in the development server and the tests: in production this is the constant `false`, so the mock is never emitted. */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

/**
 * Mock/live dispatcher for the legal domain. Going live is a swap here plus a
 * real implementation in `legal-api.live.ts` — no UI changes.
 */
export async function fetchLegislationOverview(): Promise<LegislationOverview> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-api.mock')).fetchLegislationOverviewMock()
  return fetchLegislationOverviewLive()
}

/** The front door's gazette band: the latest Monitorul Oficial issues, without the analytics tab's ranking. */
export async function fetchLegislationFrontDoor(signal?: AbortSignal): Promise<LegislationFrontDoor> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-api.mock')).fetchLegislationFrontDoorMock()
  return fetchLegislationFrontDoorLive(signal)
}
