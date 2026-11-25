import type { LegalActDetail } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalActDetailLive } from './legal-act-api.live'

/** Fixtures only in the development server and the tests: in production this is the constant `false`, so the fixture is never emitted. */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

/**
 * Mock/live dispatcher for one normative document.
 *
 * Unlike the overview, the live lane here is **real**: `legalAct(actId:)` is
 * served today by the redesign surface. Set `VITE_LEGAL_USE_LIVE_API=true` with
 * `VITE_API_URL` pointed at a redesign API to render production data.
 */
export async function fetchLegalActDetail(
  actId: string,
  signal?: AbortSignal,
): Promise<LegalActDetail | null> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('../mocks/fixtures/legal-act-detail')).legalActDetailById(actId)
  return fetchLegalActDetailLive(actId, signal)
}
