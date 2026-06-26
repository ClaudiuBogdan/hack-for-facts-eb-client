import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalActMock, fetchLegalLandingDataMock } from './legal-api.mock'
import {
  fetchLegalActLive,
  fetchLegalLandingDataLive,
} from './legal-api.live'
import type { LandingData, LegalAct } from '@/schemas/legal'

export async function fetchLegalAct(actId: string): Promise<LegalAct | null> {
  if (isLegalMockEnabled()) {
    return fetchLegalActMock(actId)
  }
  return fetchLegalActLive(actId)
}

export async function fetchLegalLandingData(): Promise<LandingData> {
  if (isLegalMockEnabled()) {
    return fetchLegalLandingDataMock()
  }
  return fetchLegalLandingDataLive()
}
