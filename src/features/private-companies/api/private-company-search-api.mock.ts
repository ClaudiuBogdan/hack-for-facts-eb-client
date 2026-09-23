/**
 * Mock implementations of the company search / resolve / group-profile APIs,
 * derived from the profile fixtures, so the directory and the profiles are
 * exercisable under `VITE_MOCK_DATASETS=private-companies` without a backend.
 * The hub's figures are the real snapshot, not fixtures: its county links
 * resolve here, but its ranked companies exist only in the live API.
 *
 * The filter semantics here mirror the server's `CompaniesFilter`: multi-value
 * facets are OR-within / AND-across, `caen` matches by prefix below 4 digits,
 * and `regFrom`/`regTo` are an inclusive range.
 */
import type {
  CompanyGroupByDim,
  CompanyGroupSlice,
  PrivateCompanyCountyFacet,
  PrivateCompanySearchQuery,
  PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import {
  getMockPrivateCompanyProfile,
  mockPrivateCompanyCuis,
} from '../mocks/fixtures'
import { foldCountyName } from '../lib/county-names'
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

function matchesSet(
  values: readonly string[] | undefined,
  actual: string | null | undefined,
): boolean {
  if (!values || values.length === 0) return true
  if (!actual) return false
  return values.includes(actual)
}

function matchesCaen(caen: string | undefined, profile: PrivateCompanyProfile): boolean {
  const trimmed = caen?.trim()
  if (!trimmed) return true
  return profile.caenActivities.some((activity) =>
    trimmed.length < 4 ? activity.code.startsWith(trimmed) : activity.code === trimmed,
  )
}

/** A county as the server compares it: no „Județul"/„Municipiul", no diacritics, any case. */
function countyKey(name: string): string {
  return foldCountyName(name).replace(/^(judetul|municipiul)\s+/, '')
}

/** The server folds both sides and compares them whole, so `Cluj`, `CLUJ` and `Județul Cluj` agree and `Clu` matches nothing. */
function matchesCounty(counties: readonly string[] | undefined, county: string | null): boolean {
  if (!counties || counties.length === 0) return true
  if (!county) return false
  const key = countyKey(county)
  return counties.some((wanted) => key === countyKey(wanted))
}

function matchesDateRange(
  query: PrivateCompanySearchQuery,
  registrationDate: string | null,
): boolean {
  if (!query.regFrom && !query.regTo) return true
  if (!registrationDate) return false
  if (query.regFrom && registrationDate < query.regFrom) return false
  if (query.regTo && registrationDate > query.regTo) return false
  return true
}

function matchesProfile(
  profile: PrivateCompanyProfile,
  query: PrivateCompanySearchQuery,
): boolean {
  const q = query.q?.trim().toLowerCase()
  if (q && !profile.legalName.toLowerCase().includes(q) && profile.cui !== q) {
    return false
  }
  if (!matchesCounty(query.county, profile.address.county)) return false
  if (!matchesSet(query.status, profile.status?.code)) return false
  if (!matchesSet(query.legalForm, profile.legalForm)) return false
  if (!matchesCaen(query.caen, profile)) return false
  if (!matchesDateRange(query, profile.registrationDate)) return false
  if (typeof query.vat === 'boolean' && profile.fiscal.vatPayer !== query.vat) {
    return false
  }
  if (
    typeof query.inactive === 'boolean' &&
    profile.fiscal.inactive !== query.inactive
  ) {
    return false
  }
  return true
}

function sortProfiles(
  profiles: PrivateCompanyProfile[],
  sort: PrivateCompanySearchQuery['sort'],
): PrivateCompanyProfile[] {
  if (!sort) return profiles
  const sorted = [...profiles]
  if (sort === 'name') {
    sorted.sort((a, b) => a.legalName.localeCompare(b.legalName, 'ro'))
  } else if (sort === 'cui') {
    sorted.sort((a, b) => Number(a.cui ?? 0) - Number(b.cui ?? 0))
  } else {
    // Newest registrations first; companies without a date sink to the bottom.
    sorted.sort((a, b) => (b.registrationDate ?? '').localeCompare(a.registrationDate ?? ''))
  }
  return sorted
}

export async function fetchPrivateCompanySearchMock(
  query: PrivateCompanySearchQuery,
): Promise<PrivateCompanySearchResultPage> {
  await new Promise((resolve) => setTimeout(resolve, 100))

  const matched = mockProfiles().filter((profile) => matchesProfile(profile, query))
  const items = sortProfiles(matched, query.sort).map(toResultItem)

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
  const groups = await fetchCompanyGroupProfileMock('COUNTY')
  return groups
    .map((group) => ({ name: group.key, count: group.count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
}

function groupKeyFor(
  profile: PrivateCompanyProfile,
  groupBy: CompanyGroupByDim,
): { key: string; label: string | null } | null {
  if (groupBy === 'COUNTY') {
    return profile.address.county ? { key: profile.address.county, label: null } : null
  }
  if (groupBy === 'STATUS') {
    return profile.status
      ? { key: profile.status.code, label: profile.status.label }
      : null
  }
  const caen = profile.caenActivities[0]
  if (!caen) return null
  return { key: caen.code.slice(0, 2), label: caen.label }
}

export async function fetchCompanyGroupProfileMock(
  groupBy: CompanyGroupByDim,
  profiles: PrivateCompanyProfile[] = mockProfiles(),
): Promise<CompanyGroupSlice[]> {
  const byKey = new Map<string, CompanyGroupSlice>()
  for (const profile of profiles) {
    const group = groupKeyFor(profile, groupBy)
    if (!group) continue
    const existing = byKey.get(group.key)
    byKey.set(group.key, {
      key: group.key,
      label: existing?.label ?? group.label,
      count: (existing?.count ?? 0) + 1,
    })
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count)
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
