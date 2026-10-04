import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type { CompanyGroupByDim, CompanyGroupProfile, CompanyHubStats, CompanyRegistryBucket } from '@/schemas/private-company-hub'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { isPrivateCompanyMockEnabled } from '../lib/mock-mode'
import { getMockPrivateCompanyProfile, mockPrivateCompanyCuis } from '../mocks/fixtures'
import { MOCK_REGISTRY_ENVELOPE } from '../mocks/fixtures/registry'
import { assertRegistryScope, classifyRegistryError } from './company-registry-errors'
import { REGISTRY_ENVELOPE_FIELDS, mapRegistryEnvelope, rawRegistryEnvelopeSchema } from './graphql/company-registry-graphql'

/**
 * The registry's groupings: the directory's facets (`companyCountyProfile`)
 * and the hub's figures (`companyHubStats`). Both need a published edition —
 * the server refuses them otherwise, and the refusal is a state — and both are
 * read under the page's pinned scope: an answer under another is never kept.
 */

export const COMPANY_GROUP_PROFILE_QUERY = /* GraphQL */ `
  query CompanyGroupProfile($filter: CompaniesFilter, $groupBy: CompanyGroupBy!) {
    companyCountyProfile(filter: $filter, groupBy: $groupBy) {
      groupBy
      denominator
      groups { key label count basis }
      registry { ${REGISTRY_ENVELOPE_FIELDS} }
    }
  }
`

export const COMPANY_HUB_STATS_QUERY = /* GraphQL */ `
  query CompanyHubStats {
    companyHubStats {
      totalCompanies
      activeCompanies
      statusMix { key label count basis }
      topCounties { key label count basis }
      caenDivisions { key label count basis }
      coverage { territoryMatched territoryUnmatched }
      registry { ${REGISTRY_ENVELOPE_FIELDS} }
      computedAt
    }
  }
`

const rawBucketSchema = z.object({ key: z.string(), label: z.string().nullable(), count: z.number().int(), basis: z.string().nullable() })

export const companyGroupProfileResponseSchema = z.object({
  companyCountyProfile: z.object({
    groupBy: z.enum(['COUNTY', 'STATUS', 'CAEN_DIVISION']),
    denominator: z.number().int(),
    groups: z.array(rawBucketSchema),
    registry: rawRegistryEnvelopeSchema,
  }),
})

export const companyHubStatsResponseSchema = z.object({
  companyHubStats: z
    .object({
      totalCompanies: z.number().int(),
      activeCompanies: z.number().int(),
      statusMix: z.array(rawBucketSchema),
      topCounties: z.array(rawBucketSchema),
      caenDivisions: z.array(rawBucketSchema),
      coverage: z.object({ territoryMatched: z.number().int().nullable(), territoryUnmatched: z.number().int().nullable() }),
      registry: rawRegistryEnvelopeSchema,
      computedAt: z.string(),
    })
    .nullable(),
})

function bucket(raw: z.infer<typeof rawBucketSchema>): CompanyRegistryBucket {
  return { key: raw.key, label: raw.label, count: raw.count, basis: raw.basis ? raw.basis.toLowerCase() : null }
}

/** The grouping of the companies a directory filter selects, under the pinned scope. */
export async function fetchCompanyGroupProfile(
  groupBy: CompanyGroupByDim,
  filter: Record<string, unknown>,
  scopeKey: string,
  signal?: AbortSignal,
): Promise<CompanyGroupProfile> {
  if (isPrivateCompanyMockEnabled()) return mockGroupProfile(groupBy, scopeKey)
  let data: unknown
  try {
    data = await graphqlQuery<unknown>(COMPANY_GROUP_PROFILE_QUERY, { filter, groupBy }, { operationName: 'CompanyGroupProfile', signal })
  } catch (error) {
    throw classifyRegistryError(error)
  }
  const profile = companyGroupProfileResponseSchema.parse(data).companyCountyProfile
  const registry = mapRegistryEnvelope(profile.registry)
  assertRegistryScope(registry.scopeKey, scopeKey)
  return { registry, groupBy: profile.groupBy, denominator: profile.denominator, groups: profile.groups.map(bucket) }
}

/** The hub's figures under the pinned scope. */
export async function fetchCompanyHubStats(scopeKey: string, signal?: AbortSignal): Promise<CompanyHubStats> {
  if (isPrivateCompanyMockEnabled()) return mockHubStats(scopeKey)
  let data: unknown
  try {
    data = await graphqlQuery<unknown>(COMPANY_HUB_STATS_QUERY, {}, { operationName: 'companyHubStats', signal })
  } catch (error) {
    throw classifyRegistryError(error)
  }
  const stats = companyHubStatsResponseSchema.parse(data).companyHubStats
  if (stats === null) throw new Error('companyHubStats answered nothing')
  const registry = mapRegistryEnvelope(stats.registry)
  assertRegistryScope(registry.scopeKey, scopeKey)
  return {
    registry,
    totalCompanies: stats.totalCompanies,
    activeCompanies: stats.activeCompanies,
    statusMix: stats.statusMix.map(bucket),
    topCounties: stats.topCounties.map(bucket),
    caenDivisions: stats.caenDivisions.map(bucket),
    coverage: stats.coverage,
    computedAt: stats.computedAt,
  }
}

// ──────────────────────────────────────────────────────────── mock ──

function mockProfiles(): PrivateCompanyProfile[] {
  return mockPrivateCompanyCuis.flatMap((cui) => {
    const profile = getMockPrivateCompanyProfile(cui)
    return profile ? [profile] : []
  })
}

function counted(keys: readonly { key: string; label: string | null; basis: string | null }[]): CompanyRegistryBucket[] {
  const byKey = new Map<string, CompanyRegistryBucket>()
  for (const entry of keys) {
    const seen = byKey.get(entry.key)
    byKey.set(entry.key, { ...entry, count: (seen?.count ?? 0) + 1 })
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

function statusKey(profile: PrivateCompanyProfile) {
  const status = profile.registry.profile?.statusCode
  if (status?.value) return { key: status.value, label: profile.status?.label ?? null, basis: null }
  const basis = status?.basis ?? 'not_in_edition'
  return { key: `(${basis})`, label: null, basis }
}

function countyKey(profile: PrivateCompanyProfile) {
  const county = profile.registry.profile?.countyCode
  if (county?.value) return { key: county.value, label: profile.registry.profile?.countyName ?? null, basis: null }
  const basis = county?.basis ?? 'not_in_edition'
  return { key: `(${basis})`, label: null, basis }
}

function divisionKeys(profile: PrivateCompanyProfile) {
  const keys = new Set(profile.registry.caenObservations.flatMap((row) => (row.code ? [`${row.revision ?? 'unknown'}:${row.code.slice(0, 2)}`] : [])))
  return [...keys].map((key) => ({ key, label: null, basis: null }))
}

function mockGroupProfile(groupBy: CompanyGroupByDim, scopeKey: string): CompanyGroupProfile {
  assertRegistryScope(MOCK_REGISTRY_ENVELOPE.scopeKey, scopeKey)
  const active = mockProfiles().filter((profile) => profile.registry.identifiers.some((identifier) => identifier.hasActiveObservation))
  const groups =
    groupBy === 'COUNTY' ? counted(active.map(countyKey)) : groupBy === 'STATUS' ? counted(active.map(statusKey)) : counted(active.flatMap(divisionKeys))
  return { registry: MOCK_REGISTRY_ENVELOPE, groupBy, denominator: active.length, groups }
}

function mockHubStats(scopeKey: string): CompanyHubStats {
  assertRegistryScope(MOCK_REGISTRY_ENVELOPE.scopeKey, scopeKey)
  const profiles = mockProfiles()
  const active = profiles.filter((profile) => profile.registry.identifiers.some((identifier) => identifier.hasActiveObservation))
  return {
    registry: MOCK_REGISTRY_ENVELOPE,
    totalCompanies: profiles.length,
    activeCompanies: active.length,
    statusMix: counted(profiles.map(statusKey)),
    topCounties: counted(active.map(countyKey)).filter((entry) => entry.basis === null).slice(0, 10),
    caenDivisions: counted(active.flatMap(divisionKeys)),
    coverage: { territoryMatched: null, territoryUnmatched: null },
    computedAt: '2026-05-06T00:00:00.000Z',
  }
}
