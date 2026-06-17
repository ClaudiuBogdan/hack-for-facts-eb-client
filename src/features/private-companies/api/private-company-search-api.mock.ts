/**
 * Mock implementations of the company search / resolve / county-list APIs,
 * derived from the existing profile fixtures so the search page is exercisable
 * under VITE_USE_MOCK_DATA without a live backend.
 */
import type {
  PrivateCompanyCountyFacet,
  PrivateCompanySearchQuery,
  PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import {
  getMockPrivateCompanyProfile,
  mockPrivateCompanyCuis,
} from '../mocks/fixtures'
import type { CompanyResolveHit } from './private-company-api.live'

function mockProfiles(): PrivateCompanyProfile[] {
  return mockPrivateCompanyCuis
    .map((cui) => getMockPrivateCompanyProfile(cui))
    .filter((profile): profile is PrivateCompanyProfile => profile !== null)
}

function toResultItem(profile: PrivateCompanyProfile) {
  return {
    cui: profile.cui ?? '',
    name: profile.legalName,
    legalForm: profile.legalForm,
    status: profile.status,
    county: profile.address.county,
    vatPayer: profile.fiscal.vatPayer,
    declaredFiscallyInactive: profile.fiscal.inactive,
    registrationDate: profile.registrationDate,
  }
}

export async function fetchPrivateCompanySearchMock(
  query: PrivateCompanySearchQuery,
): Promise<PrivateCompanySearchResultPage> {
  await new Promise((resolve) => setTimeout(resolve, 100))

  const q = query.q?.trim().toLowerCase()
  const items = mockProfiles()
    .filter((profile) => {
      if (q && !profile.legalName.toLowerCase().includes(q) && profile.cui !== q) {
        return false
      }
      if (query.county && profile.address.county !== query.county) return false
      if (query.status && profile.status?.code !== query.status) return false
      return true
    })
    .map(toResultItem)

  return {
    items,
    nextCursor: null,
    totalCount: items.length,
    totalEstimated: false,
  }
}

export async function fetchPrivateCompanyCountiesMock(): Promise<
  PrivateCompanyCountyFacet[]
> {
  const counts = new Map<string, number>()
  for (const profile of mockProfiles()) {
    const county = profile.address.county
    if (!county) continue
    counts.set(county, (counts.get(county) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
}

export async function resolveCompanyByNameMock(
  q: string,
  limit = 10,
): Promise<CompanyResolveHit[]> {
  const needle = q.trim().toLowerCase()
  if (needle.length === 0) return []
  return mockProfiles()
    .filter((profile) => profile.legalName.toLowerCase().includes(needle))
    .slice(0, limit)
    .map((profile) => ({
      cui: profile.cui,
      label: profile.legalName,
      value: profile.cui ?? '',
      confidence: 1,
    }))
}
