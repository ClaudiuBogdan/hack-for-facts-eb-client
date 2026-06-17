import type { PrivateCompanyProfile } from '@/schemas/private-company'
import type {
  PrivateCompanyCountyFacet,
  PrivateCompanySearchQuery,
  PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'
import { isPrivateCompanyMockEnabled } from '../lib/mock-mode'
import { fetchPrivateCompanyProfileMock } from './private-company-api.mock'
import {
  fetchPrivateCompanyCountiesLive,
  fetchPrivateCompanyProfileLive,
  fetchPrivateCompanySearchLive,
  resolveCompanyByNameLive,
  type CompanyResolveHit,
} from './private-company-api.live'
import {
  fetchPrivateCompanyCountiesMock,
  fetchPrivateCompanySearchMock,
  resolveCompanyByNameMock,
} from './private-company-search-api.mock'

export type { CompanyResolveHit } from './private-company-api.live'

export async function fetchPrivateCompanyProfile(
  cui: string,
): Promise<PrivateCompanyProfile | null> {
  if (isPrivateCompanyMockEnabled()) {
    return fetchPrivateCompanyProfileMock(cui)
  }
  return fetchPrivateCompanyProfileLive(cui)
}

export async function fetchPrivateCompanySearch(
  query: PrivateCompanySearchQuery,
): Promise<PrivateCompanySearchResultPage> {
  if (isPrivateCompanyMockEnabled()) {
    return fetchPrivateCompanySearchMock(query)
  }
  return fetchPrivateCompanySearchLive(query)
}

export async function fetchPrivateCompanyCounties(): Promise<
  PrivateCompanyCountyFacet[]
> {
  if (isPrivateCompanyMockEnabled()) {
    return fetchPrivateCompanyCountiesMock()
  }
  return fetchPrivateCompanyCountiesLive()
}

export async function resolveCompanyByName(
  q: string,
  limit?: number,
): Promise<CompanyResolveHit[]> {
  if (isPrivateCompanyMockEnabled()) {
    return resolveCompanyByNameMock(q, limit)
  }
  return resolveCompanyByNameLive(q, limit)
}
