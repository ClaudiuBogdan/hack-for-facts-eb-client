/**
 * Live company data via the redesign GraphQL API. All requests go through the
 * shared `graphqlQuery` transport; raw responses are Zod-parsed then mapped
 * onto the UI's `PrivateCompanyProfile` / search types.
 *
 * Registry-bound reads carry the scope the page pinned and refuse an answer
 * under another one (`CompanyRegistryScopeMovedError`); a registry that cannot
 * answer a filter or sort is `CompanyRegistryUnavailableError`, never an
 * empty page.
 */
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type {
  CompanyResolveRequest,
  CompanyResolveResult,
  PrivateCompanySearchQuery,
  PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'
import {
  COMPANIES_SEARCH_QUERY,
  COMPANY_PROFILE_QUERY,
  COMPANY_RESOLVE_RESULT_QUERY,
  companiesSearchResponseSchema,
  companyProfileResponseSchema,
  companyResolveResultResponseSchema,
} from './graphql/company-queries'
import {
  mapCompanyListItem,
  mapCompanyProfile,
  mapCompanyResolveResult,
} from './graphql/company-mappers'
import { buildCompaniesFilter, type CompaniesFilterInput } from './graphql/company-filters'
import { mapRegistryEnvelope } from './graphql/company-registry-graphql'
import { assertRegistryScope, classifyRegistryError } from './company-registry-errors'

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

/** A canonical CUI: 2–10 digits, no leading zero (the analytics company picker's grammar), nothing else. */
const CANONICAL_CUI = /^[1-9]\d{1,9}$/u

export async function fetchPrivateCompanySearchLive(
  query: PrivateCompanySearchQuery,
): Promise<PrivateCompanySearchResultPage> {
  const trimmedQ = query.q?.trim()
  // The API's `q` searches names only: a typed canonical CUI asks for that exact company instead.
  const cui = trimmedQ && CANONICAL_CUI.test(trimmedQ) ? trimmedQ : undefined
  const facets = buildCompaniesFilter(query)
  const filter: CompaniesFilterInput | undefined = cui ? { cui: { eq: cui }, ...facets } : facets
  const variables = {
    filter,
    q: !cui && trimmedQ && trimmedQ.length > 0 ? trimmedQ : undefined,
    sort: query.sort ? SORT_MAP[query.sort] : undefined,
    first: query.pageSize,
    after: query.cursor ?? undefined,
  }

  let data: unknown
  try {
    data = await graphqlQuery<unknown>(COMPANIES_SEARCH_QUERY, variables, {
      operationName: 'companies',
      signal: query.signal,
    })
  } catch (error) {
    // A continuation the server refuses means the scope moved: the list restarts, it does not mix editions.
    throw classifyRegistryError(error, { continuation: Boolean(query.cursor) })
  }
  const parsed = companiesSearchResponseSchema.parse(data)
  const registry = mapRegistryEnvelope(parsed.companies.registry)
  assertRegistryScope(registry.scopeKey, query.scopeKey)

  const { hasNextPage, endCursor } = parsed.companies.pageInfo
  return {
    items: parsed.companies.edges.map((edge) => mapCompanyListItem(edge.node, registry)),
    // Only advance when the server reports both another page AND a cursor.
    nextCursor: hasNextPage && endCursor ? endCursor : null,
    totalCount: parsed.companies.totalCount,
    totalEstimated: parsed.companies.totalEstimated,
    registry,
  }
}

/**
 * `companyResolveResult`: NAME/REGNUM send the page's accepted registry scope,
 * CAEN/COUNTY send none. A failure is a failure — the transport's error, or a
 * registry refusal (`classifyRegistryError`: the scope key refused as stale,
 * a scope that moved during the request) — never an empty answer; a
 * cancelled request rejects as it came. Whether the answer may be used is
 * checked by the caller (`acceptCompanyResolveResult`).
 */
export async function resolveCompaniesLive(request: CompanyResolveRequest, signal?: AbortSignal): Promise<CompanyResolveResult> {
  const variables = {
    dim: request.dim,
    q: request.q,
    limit: request.limit,
    ...('registryScope' in request ? { registryScope: request.registryScope } : {}),
  }
  let data: unknown
  try {
    data = await graphqlQuery<unknown>(COMPANY_RESOLVE_RESULT_QUERY, variables, { operationName: 'companyResolveResult', signal })
  } catch (error) {
    throw classifyRegistryError(error)
  }
  const parsed = companyResolveResultResponseSchema.parse(data)
  // Without an error the field is never null; if it is, nothing was answered — a failure, not zero hits.
  if (parsed.companyResolveResult === null) throw new Error('companyResolveResult answered nothing')
  return mapCompanyResolveResult(parsed.companyResolveResult)
}
