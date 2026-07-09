import type { PrivateCompanyProfile } from '@/schemas/private-company'
import type {
  CompanyHubStats,
  PrivateCompanyCountyFacet,
  PrivateCompanySearchQuery,
  PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'
import { isPrivateCompanyMockEnabled } from '../lib/mock-mode'
import { fetchPrivateCompanyProfileMock } from './private-company-api.mock'
import {
  fetchCompanyHubStatsLive,
  fetchPrivateCompanyCountiesLive,
  fetchPrivateCompanyProfileLive,
  fetchPrivateCompanySearchLive,
  resolveCompanyByNameLive,
  type CompanyResolveHit,
} from './private-company-api.live'
import {
  fetchCompanyHubStatsMock,
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

/**
 * One cached server aggregate — never assembled client-side from three
 * `companyCountyProfile` calls (the CAEN_DIVISION leg alone is ~10-13s cold).
 * The live `companyHubStats` field is being added server-side; until it ships,
 * only the mock path returns data and the hub renders its error/retry state.
 */
export async function fetchCompanyHubStats(
  signal?: AbortSignal,
): Promise<CompanyHubStats> {
  if (isPrivateCompanyMockEnabled()) {
    return fetchCompanyHubStatsMock()
  }
  return fetchCompanyHubStatsLive(signal)
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
