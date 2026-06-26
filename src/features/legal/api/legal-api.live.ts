import { assertLiveApiAvailable } from '@/lib/scraper-references/mock-mode'
import type { LandingData, LegalAct } from '@/schemas/legal'

/**
 * Live adapter — NOT connected yet. Both calls gate on the Portal Legislativ
 * dataset being live-ready via `assertLiveApiAvailable`, which throws when the
 * live backend is not enabled. When the GraphQL schema and resolver are wired,
 * the typed fetches land here and the mock adapter is swapped out by
 * `legal-api.ts` without UI changes.
 *
 * `assertLiveApiAvailable` either returns (mock mode) or throws, so the code
 * after it is unreachable in the current configuration. `LandingData` is a
 * non-nullable contract, so the landing adapter must never return `null`; the
 * trailing `throw` documents that and keeps control-flow analysis honest once
 * the guard stops throwing.
 */

export async function fetchLegalActLive(
  _actId: string,
): Promise<LegalAct | null> {
  assertLiveApiAvailable(
    'legal-portal-legislativ',
    'Legal act live API is not connected yet.',
  )
  // Unreachable until assertLiveApiAvailable stops throwing.
  throw new Error('Legal act live API is not connected yet.')
}

export async function fetchLegalLandingDataLive(): Promise<LandingData> {
  assertLiveApiAvailable(
    'legal-portal-legislativ',
    'Legal landing data live API is not connected yet.',
  )
  // Unreachable until assertLiveApiAvailable stops throwing. The landing
  // contract is non-nullable, so never return null here.
  throw new Error('Legal landing data live API is not connected yet.')
}
