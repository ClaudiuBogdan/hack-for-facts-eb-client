/**
 * Live global entity search via the redesign GraphQL API. Requests go through
 * the shared `graphqlQuery` transport (POST /api/v1/graphql); the raw response
 * is Zod-parsed then mapped onto the UI's `EntitySearchResult`.
 *
 * An empty/whitespace `q` short-circuits to a no-search result WITHOUT a
 * network call — the server answers a blank query with `no_search` anyway, and
 * the page should not fire a request while the box is empty.
 *
 * A refused answer (`searchEntities: null` with `SERVICE_UNAVAILABLE`) and an
 * answer whose metadata is unreadable both throw `EntitySearchWithheldError`:
 * every caller then shows its error/retry, never an empty healthy list.
 */
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type {
  EntitySearchInput,
  EntitySearchResult,
} from '@/schemas/entity-search'
import {
  SEARCH_ENTITIES_QUERY,
  searchEntitiesResponseSchema,
} from './graphql/entity-search-queries'
import { mapSearchResult } from './graphql/entity-search-mappers'
import { EntitySearchWithheldError, isServiceUnavailable } from './search-withheld-error'

/** The server's own no-search answer: not a zero, and nothing to page. */
function noSearchResult(): EntitySearchResult {
  return {
    query: '',
    engine: 'meili',
    // A blank query is answered without any network call, so nothing degraded.
    degraded: false,
    estimatedTotalHits: 0,
    facets: [],
    hits: [],
    generation: null,
    companyScope: null,
    companyContribution: 'UNAVAILABLE',
    companyContributionReason: 'no_search',
    continuation: { candidatesReturned: 0, nextOffset: null },
  }
}

/** Drop empty / blank optional list values so they are omitted from variables. */
function nonEmptyList(
  values: readonly string[] | undefined,
): readonly string[] | undefined {
  if (!values) return undefined
  const filtered = values.map((v) => v.trim()).filter((v) => v.length > 0)
  return filtered.length > 0 ? filtered : undefined
}

export async function searchEntitiesLive(
  input: EntitySearchInput,
  signal?: AbortSignal,
): Promise<EntitySearchResult> {
  const q = input.q.trim()
  if (q.length === 0) return noSearchResult()

  const county = input.county?.trim()
  const offset = input.offset ?? 0
  const variables = {
    q,
    docTypes: nonEmptyList(input.docTypes),
    roles: nonEmptyList(input.roles),
    county: county && county.length > 0 ? county : undefined,
    isActive: input.isActive,
    isUat: input.isUat,
    entityTags: input.entityTags,
    excludeEntityTags: input.excludeEntityTags,
    limit: input.limit,
    offset: input.offset,
  }

  let data: unknown
  try {
    // Public, anonymous search: never wait for the optional auth session
    // (up to 10s while Clerk initializes) before sending the request.
    data = await graphqlQuery<unknown>(SEARCH_ENTITIES_QUERY, variables, {
      operationName: 'searchEntities',
      auth: 'none',
      signal,
    })
  } catch (error) {
    if (isServiceUnavailable(error)) throw new EntitySearchWithheldError('refused', { cause: error })
    throw error
  }
  const parsed = searchEntitiesResponseSchema.safeParse(data)
  if (!parsed.success) throw new EntitySearchWithheldError('unreadable', { cause: parsed.error })
  const answer = parsed.data.searchEntities
  // A null root without its error is still a refusal, not an empty answer.
  if (answer === null) throw new EntitySearchWithheldError('refused')
  // The next page is exactly this page's offset plus its candidates (§6).
  const { candidatesReturned, nextOffset } = answer.continuation
  if (nextOffset !== null && nextOffset !== offset + candidatesReturned) {
    throw new EntitySearchWithheldError('unreadable')
  }
  return mapSearchResult(answer)
}
