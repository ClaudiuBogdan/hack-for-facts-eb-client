import type { LegalActDetail } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { legalActDetailById } from '../mocks/fixtures/legal-act-detail'
import { fetchLegalActDetailLive } from './legal-act-api.live'

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
  if (isLegalMockEnabled()) return legalActDetailById(actId)
  return fetchLegalActDetailLive(actId, signal)
}
