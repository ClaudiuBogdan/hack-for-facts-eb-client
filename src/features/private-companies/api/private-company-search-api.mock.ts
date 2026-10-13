/**
 * MOCK name resolve, derived from the profile fixtures, so the name lookups
 * are exercisable under `VITE_MOCK_DATASETS=private-companies` without a
 * backend. Every scoped answer carries the mock registry envelope
 * (`mode: 'mock'`); nothing here ever stands in for a live answer.
 */
import type { CompanyResolveHit, CompanyResolveRequest, CompanyResolveResult } from '@/schemas/private-company-search'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { getMockPrivateCompanyProfile, mockPrivateCompanyCuis } from '../mocks/fixtures'
import { MOCK_REGISTRY_ENVELOPE } from '../mocks/fixtures/registry'
import { countyName } from '../lib/hub-counties'
import { assertRegistryScope } from './company-registry-errors'

function mockProfiles(): PrivateCompanyProfile[] {
  return mockPrivateCompanyCuis
    .map((cui) => getMockPrivateCompanyProfile(cui))
    .filter((profile): profile is PrivateCompanyProfile => profile !== null)
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
