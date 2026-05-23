import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { isPrivateCompanyMockEnabled } from '../lib/mock-mode'
import { fetchPrivateCompanyProfileMock } from './private-company-api.mock'
import { fetchPrivateCompanyProfileLive } from './private-company-api.live'

export async function fetchPrivateCompanyProfile(
  cui: string,
): Promise<PrivateCompanyProfile | null> {
  if (isPrivateCompanyMockEnabled()) {
    return fetchPrivateCompanyProfileMock(cui)
  }
  return fetchPrivateCompanyProfileLive(cui)
}
