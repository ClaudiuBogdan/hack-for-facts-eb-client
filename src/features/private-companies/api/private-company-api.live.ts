import { assertLiveApiAvailable } from '@/lib/scraper-references/mock-mode'
import type { PrivateCompanyProfile } from '@/schemas/private-company'

export async function fetchPrivateCompanyProfileLive(
  _cui: string,
): Promise<PrivateCompanyProfile | null> {
  assertLiveApiAvailable(
    'private-companies-onrc',
    'Private company live API is not connected yet.',
  )
  return null
}
