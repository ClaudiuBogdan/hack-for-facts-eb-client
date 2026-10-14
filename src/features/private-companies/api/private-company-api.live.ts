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
import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/graphql-client'
import type {
  CompanyResolveRequest,
  CompanyResolveResult,
  PrivateCompanySearchQuery,
  PrivateCompanySearchResultPage,
} from '@/schemas/private-company-search'
import type { CompanyMainActivityHistoryKind, CompanyMainActivityHistoryResult } from '@/schemas/private-company-main-activity'
import {
  COMPANIES_SEARCH_QUERY,
  COMPANY_MAIN_ACTIVITY_HISTORY_QUERY,
  COMPANY_PROFILE_QUERY,
  COMPANY_PROFILE_QUERY_LEGACY,
  COMPANY_PROFILE_QUERY_WITHOUT_MAIN,
  COMPANY_PROFILE_QUERY_WITHOUT_SELECTION,
  COMPANY_PROFILE_QUERY_WITHOUT_SELECTION_OR_MAIN,
  COMPANY_RESOLVE_RESULT_QUERY,
  companiesSearchResponseSchema,
  companyMainActivityHistoryResponseSchema,
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

/** Every error the API sent is the derived activity's alone (`company.activitySelection`): the rest of the company was served. */
export function isActivitySelectionOnlyError(error: unknown): boolean {
  if (!(error instanceof GraphQLRequestError) || error.graphQLErrors.length === 0) return false
  return error.graphQLErrors.every((entry) => entry.path?.length === 2 && entry.path[0] === 'company' && entry.path[1] === 'activitySelection')
}

const PRE_ACTIVITY_FIELD = /^Cannot query field "(activitySelection|classState)" on type "(Company|CompanyCaenActivity|CompanyRegistryCaenObservation)"/u

/**
 * An API from before the derived activity rejected the document at validation
 * (`Cannot query field "activitySelection" | "classState"`): nothing was read,
 * and the older document is the answer it can give.
 */
export function isPreActivityApiError(error: unknown): boolean {
  if (!(error instanceof GraphQLRequestError) || error.graphQLErrors.length === 0) return false
  return error.graphQLErrors.every((entry) => PRE_ACTIVITY_FIELD.test(entry.message))
}

/**
 * The GraphQL validation messages of an API from before the ANAF-assumed main
 * activity, for exactly its new names: the `Company.mainActivity` field, the
 * two `CompanyCaenActivity` flags, the `Query.companyMainActivityHistory`
 * root, the history's kind enum type and its arguments. Anchored on the whole
 * message (graphql-js may append a „Did you mean" suggestion), so no other
 * error — a privacy refusal, `SERVICE_UNAVAILABLE` („the main activity
 * changed during the request; retry"), an unknown enum value, a transport
 * failure, another field — ever reads as an older API.
 */
const PRE_MAIN_PROFILE_MESSAGES: readonly RegExp[] = [
  /^Cannot query field "mainActivity" on type "Company"\.(?: Did you mean .+\?)?$/u,
  /^Cannot query field "(?:isMainCaen|matchesAssumedMainCode)" on type "CompanyCaenActivity"\.(?: Did you mean .+\?)?$/u,
]
const PRE_MAIN_HISTORY_MESSAGES: readonly RegExp[] = [
  /^Cannot query field "companyMainActivityHistory" on type "Query"\.(?: Did you mean .+\?)?$/u,
  /^Unknown type "CompanyMainActivityHistoryKind"\.(?: Did you mean .+\?)?$/u,
  /^Unknown argument "(?:kind|first|after)" on field "Query\.companyMainActivityHistory"\.(?: Did you mean .+\?)?$/u,
]

/**
 * Every error is one of these validation messages (and there is one): the API
 * rejected the document for not knowing them. A validation error has no
 * `path`; an execution error (one with a path) never matches, whatever it says.
 */
function onlyRejected(error: unknown, messages: readonly RegExp[]): boolean {
  if (!(error instanceof GraphQLRequestError) || error.graphQLErrors.length === 0) return false
  return error.graphQLErrors.every((entry) => (entry.path?.length ?? 0) === 0 && typeof entry.message === 'string' && messages.some((pattern) => pattern.test(entry.message)))
}

/** An API from before the main activity rejected the profile's main fields, and nothing else. */
export function isPreMainActivityApiError(error: unknown): boolean {
  return onlyRejected(error, PRE_MAIN_PROFILE_MESSAGES)
}

/** An API from before the main activity rejected the history root (its field, kind type or arguments), and nothing else. */
export function isPreMainActivityHistoryApiError(error: unknown): boolean {
  return onlyRejected(error, PRE_MAIN_HISTORY_MESSAGES)
}

/**
 * An API from before the derived activity: it rejects those fields and —
 * newer still — the main activity's, at once. The older document, without
 * either, is its answer.
 */
function isPreActivityAndMainApiError(error: unknown): boolean {
  if (!onlyRejected(error, [PRE_ACTIVITY_FIELD, ...PRE_MAIN_PROFILE_MESSAGES])) return false
  return (error as GraphQLRequestError).graphQLErrors.some((entry) => PRE_ACTIVITY_FIELD.test(entry.message))
}

const ask = (document: string, cui: string, signal?: AbortSignal) => graphqlQuery<unknown>(document, { cui }, { operationName: 'company', signal })

/**
 * The profile as the API can serve it. Every fallback is an exact, named
 * reason — never a guess from an error:
 *
 * - an API from before the derived activity (it rejects those fields at
 *   validation, and the main activity's with them): the older document,
 *   exactly as the profile read before;
 * - an API from before the main activity alone (it rejects only the main
 *   fields): the same document without them — nothing new is shown;
 * - the derived activity alone refused at execution: the document without
 *   it, the selection said to be unavailable (the main activity, already
 *   validated, still asked).
 *
 * Any other error fails the read as before: a privacy refusal, a main
 * activity that changed during the request, an unknown value, the network.
 */
export async function fetchPrivateCompanyProfileLive(
  cui: string,
  signal?: AbortSignal,
): Promise<PrivateCompanyProfile | null> {
  let data: unknown
  let selectionUnavailable = false
  let main = true
  try {
    data = await ask(COMPANY_PROFILE_QUERY, cui, signal)
  } catch (error) {
    if (isPreActivityApiError(error) || isPreActivityAndMainApiError(error)) {
      // An older API: the profile exactly as it read before (no selection, no class states, no main activity).
      data = await ask(COMPANY_PROFILE_QUERY_LEGACY, cui, signal)
    } else if (isActivitySelectionOnlyError(error)) {
      // The selection alone was refused (an edition holding more observation groups than the
      // server bounds): the company again without it, the selection said to be unavailable.
      data = await ask(COMPANY_PROFILE_QUERY_WITHOUT_SELECTION, cui, signal)
      selectionUnavailable = true
    } else if (isPreMainActivityApiError(error)) {
      main = false
    } else {
      throw error
    }
  }
  if (!main) {
    // An API without the main activity: the current document without it, its own refusals as before.
    try {
      data = await ask(COMPANY_PROFILE_QUERY_WITHOUT_MAIN, cui, signal)
    } catch (error) {
      if (!isActivitySelectionOnlyError(error)) throw error
      data = await ask(COMPANY_PROFILE_QUERY_WITHOUT_SELECTION_OR_MAIN, cui, signal)
      selectionUnavailable = true
    }
  }
  const parsed = companyProfileResponseSchema.parse(data)
  // company(cui) returns null for an unknown CUI → surface as 404 upstream.
  const profile = mapCompanyProfile(parsed)
  return profile && selectionUnavailable ? { ...profile, activitySelectionUnavailable: true } : profile
}

/**
 * The server's typed refusal of a main activity that moved while the request
 * settled (`SERVICE_UNAVAILABLE`, „the main activity changed during the
 * request; retry"). A failure to retry — never an older API, and never the
 * registry's own move (whose message shares the words).
 */
export function isMainActivityMovedError(error: unknown): boolean {
  return (
    error instanceof GraphQLRequestError &&
    error.graphQLErrors.some((entry) => entry.extensions?.code === 'SERVICE_UNAVAILABLE' && entry.message === 'the main activity changed during the request; retry')
  )
}

/** How many entries a history page asks for (the API bounds it to 1..50). */
export const MAIN_ACTIVITY_HISTORY_PAGE = 10

/**
 * One page of the ANAF-assumed main activity's history, newest first. The
 * page must be answered under `scopeKey`, the registry scope the profile was
 * read under (`CompanyRegistryScopeMovedError` otherwise); an API from before
 * the history root is `unsupported` (nothing is shown); every other failure
 * is a failure, never an empty history.
 */
export async function fetchCompanyMainActivityHistoryLive(
  request: { readonly cui: string; readonly kind: CompanyMainActivityHistoryKind; readonly after: string | null; readonly scopeKey: string },
  signal?: AbortSignal,
): Promise<CompanyMainActivityHistoryResult> {
  let data: unknown
  try {
    data = await graphqlQuery<unknown>(
      COMPANY_MAIN_ACTIVITY_HISTORY_QUERY,
      { cui: request.cui, kind: request.kind, first: MAIN_ACTIVITY_HISTORY_PAGE, ...(request.after ? { after: request.after } : {}) },
      { operationName: 'companyMainActivityHistory', signal },
    )
  } catch (error) {
    if (isPreMainActivityHistoryApiError(error)) return { status: 'unsupported' }
    // A moved main activity fails as it came (the read retries it); only the registry's own refusals are classified.
    if (isMainActivityMovedError(error)) throw error
    throw classifyRegistryError(error, { continuation: request.after !== null })
  }
  const history = companyMainActivityHistoryResponseSchema.parse(data).companyMainActivityHistory
  if (history === null) return { status: 'not_public' }
  const registry = mapRegistryEnvelope(history.registry)
  assertRegistryScope(registry.scopeKey, request.scopeKey)
  if (history.kind !== request.kind) throw new Error(`companyMainActivityHistory answered ${history.kind} for ${request.kind}`)
  return {
    status: 'page',
    page: {
      state: history.state,
      kind: history.kind,
      outcomes: history.outcomes,
      evidence: history.evidence,
      // Only advance when the server reports both another page AND a cursor.
      nextCursor: history.hasNextPage && history.endCursor ? history.endCursor : null,
      scopeKey: registry.scopeKey,
    },
  }
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
