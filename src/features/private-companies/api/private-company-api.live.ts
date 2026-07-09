/**
 * Live company data via the redesign GraphQL API. Replaces the former throwing
 * stub. All requests go through the shared `graphqlQuery` transport; raw
 * responses are Zod-parsed then mapped onto the UI's `PrivateCompanyProfile` /
 * search types.
 */
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/graphql-client'
import type {
  CompanyGroupByDim,
  CompanyGroupSlice,
  CompanyHubStats,
  PrivateCompanyCountyFacet,
  PrivateCompanySearchQuery,
  PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'
import {
  COMPANIES_SEARCH_QUERY,
  COMPANY_GROUP_PROFILE_QUERY,
  COMPANY_HUB_STATS_QUERY,
  COMPANY_PROFILE_QUERY,
  COMPANY_RESOLVE_QUERY,
  companiesSearchResponseSchema,
  companyGroupProfileResponseSchema,
  companyHubStatsResponseSchema,
  companyProfileResponseSchema,
  companyResolveResponseSchema,
} from './graphql/company-queries'
import {
  mapCompanyHubStats,
  mapCompanyListItem,
  mapCompanyProfile,
} from './graphql/company-mappers'
import { buildCompaniesFilter } from './graphql/company-filters'

export async function fetchPrivateCompanyProfileLive(
  cui: string,
): Promise<PrivateCompanyProfile | null> {
  const data = await graphqlQuery<unknown>(
    COMPANY_PROFILE_QUERY,
    { cui },
    { operationName: 'company' },
  )
  const parsed = companyProfileResponseSchema.parse(data)
  // company(cui) returns null for an unknown CUI → surface as 404 upstream.
  return mapCompanyProfile(parsed)
}

const SORT_MAP: Record<
  NonNullable<PrivateCompanySearchQuery['sort']>,
  'NAME' | 'REGISTRATION_DATE' | 'CUI'
> = {
  name: 'NAME',
  'registration-date': 'REGISTRATION_DATE',
  cui: 'CUI',
}

export async function fetchPrivateCompanySearchLive(
  query: PrivateCompanySearchQuery,
): Promise<PrivateCompanySearchResultPage> {
  const filter = buildCompaniesFilter(query)
  const trimmedQ = query.q?.trim()
  const variables = {
    filter,
    q: trimmedQ && trimmedQ.length > 0 ? trimmedQ : undefined,
    sort: query.sort ? SORT_MAP[query.sort] : undefined,
    first: query.pageSize,
    after: query.cursor ?? undefined,
  }

  const data = await graphqlQuery<unknown>(COMPANIES_SEARCH_QUERY, variables, {
    operationName: 'companies',
    signal: query.signal,
  })
  const parsed = companiesSearchResponseSchema.parse(data)

  const { hasNextPage, endCursor } = parsed.companies.pageInfo
  return {
    items: parsed.companies.edges.map((edge) => mapCompanyListItem(edge.node)),
    // Only advance when the server reports both another page AND a cursor.
    nextCursor: hasNextPage && endCursor ? endCursor : null,
    totalCount: parsed.companies.totalCount,
    totalEstimated: parsed.companies.totalEstimated,
  }
}

/** Active companies (status 1048 = funcțiune) — the default group-profile scope. */
const ACTIVE_COMPANY_FILTER = { status: { eq: '1048' } } as const

export async function fetchCompanyGroupProfileLive(
  groupBy: CompanyGroupByDim,
  filter: Record<string, unknown> = ACTIVE_COMPANY_FILTER,
  signal?: AbortSignal,
): Promise<CompanyGroupSlice[]> {
  const data = await graphqlQuery<unknown>(
    COMPANY_GROUP_PROFILE_QUERY,
    { filter, groupBy },
    { operationName: 'CompanyGroupProfile', signal },
  )
  const parsed = companyGroupProfileResponseSchema.parse(data)
  return parsed.companyCountyProfile.groups.filter((group) => group.key !== '(none)')
}

export async function fetchPrivateCompanyCountiesLive(): Promise<
  PrivateCompanyCountyFacet[]
> {
  // Enumerate counties over active companies; the profile requires at least one
  // filter and active counties cover all 41 + Bucureşti.
  const groups = await fetchCompanyGroupProfileLive('COUNTY')
  return groups
    .map((group) => ({ name: group.key, count: group.count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
}

export async function fetchCompanyHubStatsLive(
  signal?: AbortSignal,
): Promise<CompanyHubStats> {
  const data = await graphqlQuery<unknown>(
    COMPANY_HUB_STATS_QUERY,
    {},
    { operationName: 'CompanyHubStats', signal },
  )
  return mapCompanyHubStats(companyHubStatsResponseSchema.parse(data))
}

export type CompanyResolveHit = {
  readonly cui: string | null
  readonly label: string
  readonly value: string
  readonly confidence: number | null
}

export async function resolveCompanyByNameLive(
  q: string,
  limit = 10,
): Promise<CompanyResolveHit[]> {
  const trimmed = q.trim()
  if (trimmed.length === 0) return []

  try {
    const data = await graphqlQuery<unknown>(
      COMPANY_RESOLVE_QUERY,
      { dim: 'NAME', q: trimmed, limit },
      { operationName: 'companyResolve' },
    )
    const parsed = companyResolveResponseSchema.parse(data)
    return parsed.companyResolve.map((hit) => ({
      cui: hit.cui,
      label: hit.label,
      value: hit.value,
      confidence: hit.confidence,
    }))
  } catch (error) {
    // Resolve is a best-effort autocomplete aid; a GraphQL/transport failure
    // should not break the search page. Re-throw only programmer errors.
    if (error instanceof GraphQLRequestError) return []
    throw error
  }
}
