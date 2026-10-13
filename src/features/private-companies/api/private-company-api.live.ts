/**
 * Live company data via the redesign GraphQL API. All requests go through the
 * shared `graphqlQuery` transport; raw responses are Zod-parsed then mapped
 * onto the UI's `PrivateCompanyProfile` / name-resolve types.
 *
 * A registry-bound read carries the scope the page pinned; an answer under
 * another one is refused (`CompanyRegistryScopeMovedError`), never kept.
 */
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/graphql-client'
import type { CompanyResolveRequest, CompanyResolveResult } from '@/schemas/private-company-search'
import {
  COMPANY_PROFILE_QUERY,
  COMPANY_PROFILE_QUERY_LEGACY,
  COMPANY_PROFILE_QUERY_WITHOUT_SELECTION,
  COMPANY_RESOLVE_RESULT_QUERY,
  companyProfileResponseSchema,
  companyResolveResultResponseSchema,
} from './graphql/company-queries'
import { mapCompanyProfile, mapCompanyResolveResult } from './graphql/company-mappers'
import { classifyRegistryError } from './company-registry-errors'

/** Every error the API sent is the derived activity's alone (`company.activitySelection`): the rest of the company was served. */
export function isActivitySelectionOnlyError(error: unknown): boolean {
  if (!(error instanceof GraphQLRequestError) || error.graphQLErrors.length === 0) return false
  return error.graphQLErrors.every((entry) => entry.path?.length === 2 && entry.path[0] === 'company' && entry.path[1] === 'activitySelection')
}

/**
 * An API from before the derived activity rejected the document at validation
 * (`Cannot query field "activitySelection" | "classState"`): nothing was read,
 * and the older document is the answer it can give.
 */
export function isPreActivityApiError(error: unknown): boolean {
  if (!(error instanceof GraphQLRequestError) || error.graphQLErrors.length === 0) return false
  return error.graphQLErrors.every((entry) => /^Cannot query field "(activitySelection|classState)" on type "(Company|CompanyCaenActivity|CompanyRegistryCaenObservation)"/u.test(entry.message))
}

export async function fetchPrivateCompanyProfileLive(
  cui: string,
  signal?: AbortSignal,
): Promise<PrivateCompanyProfile | null> {
  let data: unknown
  let selectionUnavailable = false
  try {
    data = await graphqlQuery<unknown>(COMPANY_PROFILE_QUERY, { cui }, { operationName: 'company', signal })
  } catch (error) {
    if (isPreActivityApiError(error)) {
      // An older API: the profile exactly as it read before (no selection, no class states).
      data = await graphqlQuery<unknown>(COMPANY_PROFILE_QUERY_LEGACY, { cui }, { operationName: 'company', signal })
    } else if (isActivitySelectionOnlyError(error)) {
      // The selection alone was refused (an edition holding more observation groups than the
      // server bounds): the company again without it, the selection said to be unavailable.
      data = await graphqlQuery<unknown>(COMPANY_PROFILE_QUERY_WITHOUT_SELECTION, { cui }, { operationName: 'company', signal })
      selectionUnavailable = true
    } else {
      throw error
    }
  }
  const parsed = companyProfileResponseSchema.parse(data)
  // company(cui) returns null for an unknown CUI → surface as 404 upstream.
  const profile = mapCompanyProfile(parsed)
  return profile && selectionUnavailable ? { ...profile, activitySelectionUnavailable: true } : profile
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
