/**
 * MOCK implementations of the company search and name resolve, derived from
 * the profile fixtures, so the directory and the profiles are exercisable
 * under `VITE_MOCK_DATASETS=private-companies` without a backend. Every page
 * carries the mock registry envelope (`mode: 'mock'`); nothing here ever
 * stands in for a live answer.
 *
 * The filter semantics mirror the API's (API19), over each fixture's ONE
 * identifier: `status` matches ANY observed status code, `county` a county
 * code or name of the identifier, `caen` the digits in any revision of the
 * edition's observations (a prefix below 4 digits), `onrcCaen` one code in
 * one revision, the recorded-date range an inclusive range; the fiscal
 * switches are ANAF's.
 */
import type {
  CompanyResolveHit,
  CompanyResolveRequest,
  CompanyResolveResult,
  PrivateCompanySearchQuery,
  PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { getMockPrivateCompanyProfile, mockPrivateCompanyCuis } from '../mocks/fixtures'
import { MOCK_REGISTRY_ENVELOPE } from '../mocks/fixtures/registry'
import { foldCountyName } from '../lib/county-names'
import { countyName } from '../lib/hub-counties'
import { parseCaenSelector } from '../lib/company-caen-selector'
import { assertRegistryScope } from './company-registry-errors'

function mockProfiles(): PrivateCompanyProfile[] {
  return mockPrivateCompanyCuis
    .map((cui) => getMockPrivateCompanyProfile(cui))
    .filter((profile): profile is PrivateCompanyProfile => profile !== null)
}

function toResultItem(profile: PrivateCompanyProfile): PrivateCompanySearchResultPage['items'][number] {
  const evidence = profile.registry.profile
  return {
    cui: profile.cui ?? '',
    name: profile.legalName,
    nameSource: profile.nameSource,
    legalForm: profile.legalForm,
    status: profile.status ? { code: profile.status.code, label: profile.status.label } : null,
    county: evidence?.countyName ?? null,
    vatPayer: profile.fiscal.vatPayer,
    declaredFiscallyInactive: profile.fiscal.inactive,
    registrationDate: profile.registrationDate,
    registryCuiState: profile.registry.cuiState,
    hasActiveObservation: profile.registry.identifiers.some((identifier) => identifier.hasActiveObservation),
    statusBasis: evidence?.statusCode.basis ?? null,
    countyBasis: evidence?.countyCode.basis ?? null,
    recordedDateBasis: evidence?.recordedDate.basis ?? null,
  }
}

/** A county as the server compares it: a code, or a name with no „Județul"/„Municipiul", no diacritics, any case. */
function countyKey(name: string): string {
  return foldCountyName(name).replace(/^(judetul|municipiul)\s+/, '')
}

function matchesCounty(counties: readonly string[] | undefined, codes: readonly string[]): boolean {
  if (!counties || counties.length === 0) return true
  const keys = new Set(codes.flatMap((code) => [code, countyKey(countyName(code))]))
  return counties.some((wanted) => keys.has(wanted) || keys.has(countyKey(wanted)))
}

function matchesProfile(profile: PrivateCompanyProfile, query: PrivateCompanySearchQuery): boolean {
  const q = query.q?.trim().toLowerCase()
  if (q && !profile.legalName.toLowerCase().includes(q) && profile.cui !== q) return false
  const identifier = profile.registry.identifiers[0]
  const caenRows = profile.registry.caenObservations
  if (query.status?.length && !query.status.some((code) => identifier?.statusCodes.includes(code))) return false
  if (!matchesCounty(query.county, identifier?.countyCodes ?? [])) return false
  if (query.legalForm?.length && !query.legalForm.includes(profile.legalForm ?? '')) return false
  const caen = query.caen?.trim()
  if (caen && !caenRows.some((row) => row.code !== null && (caen.length < 4 ? row.code.startsWith(caen) : row.code === caen))) return false
  const selectors = (query.onrcCaen ?? []).flatMap((value) => parseCaenSelector(value) ?? [])
  if (selectors.length > 0 && !selectors.some((selector) => caenRows.some((row) => row.revision === selector.revision && row.code === selector.code))) return false
  const recorded = profile.registrationDate
  if ((query.regFrom || query.regTo) && !recorded) return false
  if (recorded && query.regFrom && recorded < query.regFrom) return false
  if (recorded && query.regTo && recorded > query.regTo) return false
  if (typeof query.vat === 'boolean' && profile.fiscal.vatPayer !== query.vat) return false
  if (typeof query.inactive === 'boolean' && profile.fiscal.inactive !== query.inactive) return false
  return true
}

function sortProfiles(profiles: PrivateCompanyProfile[], sort: PrivateCompanySearchQuery['sort']): PrivateCompanyProfile[] {
  if (!sort) return profiles
  const sorted = [...profiles]
  if (sort === 'name') sorted.sort((a, b) => a.legalName.localeCompare(b.legalName, 'ro'))
  else if (sort === 'cui') sorted.sort((a, b) => Number(a.cui ?? 0) - Number(b.cui ?? 0))
  // Newest recorded dates first; companies without one sink to the bottom.
  else sorted.sort((a, b) => (b.registrationDate ?? '').localeCompare(a.registrationDate ?? ''))
  return sorted
}

export async function fetchPrivateCompanySearchMock(query: PrivateCompanySearchQuery): Promise<PrivateCompanySearchResultPage> {
  await new Promise((resolve) => setTimeout(resolve, 100))
  assertRegistryScope(MOCK_REGISTRY_ENVELOPE.scopeKey, query.scopeKey)
  const matched = mockProfiles().filter((profile) => matchesProfile(profile, query))
  const items = sortProfiles(matched, query.sort).map(toResultItem)
  return { items, nextCursor: null, totalCount: items.length, totalEstimated: false, registry: MOCK_REGISTRY_ENVELOPE }
}

/**
 * `companyResolveResult` over the fixtures, in the API's terms: NAME and
 * REGNUM under the mock registry scope — a `registryScope` it did not issue is
 * refused as the API refuses it (a moved scope), zero hits still scoped;
 * CAEN and COUNTY as catalogs with no scope, each CAEN row with its own
 * revision and key and its label as the catalog's (or its key, unlabelled).
 * The mock search engine is never down: `degraded` is false.
 */
export async function resolveCompaniesMock(request: CompanyResolveRequest): Promise<CompanyResolveResult> {
  await new Promise((resolve) => setTimeout(resolve, 60))
  const needle = request.q.trim().toLowerCase()
  const limit = request.limit ?? 10
  const take = (hits: CompanyResolveHit[]) => (limit > 0 ? hits.slice(0, limit) : [])
  if (request.dim === 'NAME' || request.dim === 'REGNUM') {
    assertRegistryScope(MOCK_REGISTRY_ENVELOPE.scopeKey, request.registryScope)
    const matches =
      request.dim === 'NAME'
        ? mockProfiles().filter((profile) => needle.length > 0 && profile.legalName.toLowerCase().includes(needle))
        : mockProfiles().filter((profile) => profile.registry.identifiers.some((identifier) => identifier.identifierKey.toLowerCase() === needle))
    const hits = take(
      matches.map((profile) => ({
        dim: request.dim,
        cui: profile.cui,
        label: profile.legalName,
        value: request.dim === 'NAME' ? (profile.cui ?? '') : (profile.registry.identifiers[0]?.identifierKey ?? ''),
        confidence: 1,
        revision: null,
        key: null,
        labelSource: profile.nameSource,
      })),
    )
    return { hits, degraded: false, ambiguous: hits.length > 1, registry: MOCK_REGISTRY_ENVELOPE, scopeKey: MOCK_REGISTRY_ENVELOPE.scopeKey }
  }
  const catalog: CompanyResolveHit[] =
    request.dim === 'CAEN'
      ? uniqueBy(
          mockProfiles().flatMap((profile) => profile.caenActivities.filter((activity) => activity.source === 'onrc' && activity.rev !== null)),
          (activity) => `${activity.rev ?? ''}:${activity.code}`,
        )
          .filter((activity) => activity.code.startsWith(needle) || (activity.label ?? '').toLowerCase().includes(needle))
          .map((activity) => ({
            dim: 'CAEN' as const,
            cui: null,
            label: activity.label ?? `${activity.rev ?? ''}:${activity.code}`,
            value: activity.code,
            confidence: 1,
            revision: activity.rev,
            key: `${activity.rev ?? ''}:${activity.code}`,
            labelSource: activity.label ? ('current_db_catalog' as const) : null,
          }))
      : uniqueBy(
          mockProfiles().flatMap((profile) => profile.registry.identifiers.flatMap((identifier) => identifier.countyCodes)),
          (code) => code,
        )
          .map(countyName)
          .filter((name) => name.toLowerCase().includes(needle))
          .map((name) => ({ dim: 'COUNTY' as const, cui: null, label: name, value: name, confidence: 1, revision: null, key: null, labelSource: 'territory_hub' as const }))
  const hits = take(catalog)
  return { hits, degraded: false, ambiguous: hits.length > 1, registry: null, scopeKey: null }
}

function uniqueBy<T>(items: readonly T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = keyOf(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
