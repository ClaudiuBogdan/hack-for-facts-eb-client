/**
 * Live global entity search via the redesign GraphQL API. Requests go through
 * the shared `graphqlQuery` transport (POST /api/v1/graphql); the raw response
 * is Zod-parsed then mapped onto the UI's `EntitySearchResult`.
 *
 * An empty/whitespace `q` short-circuits to an empty result WITHOUT a network
 * call — the server returns empty for a blank query anyway, and the page should
 * not fire a request while the box is empty.
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

function emptyResult(query: string): EntitySearchResult {
  return {
    query,
    engine: 'meili',
    estimatedTotalHits: 0,
    facets: [],
    hits: [],
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
  if (q.length === 0) return emptyResult('')

  const county = input.county?.trim()
  const variables = {
    q,
    docTypes: nonEmptyList(input.docTypes),
    roles: nonEmptyList(input.roles),
    county: county && county.length > 0 ? county : undefined,
    isActive: input.isActive,
    limit: input.limit,
    offset: input.offset,
  }

  const data = await graphqlQuery<unknown>(SEARCH_ENTITIES_QUERY, variables, {
    operationName: 'searchEntities',
    signal,
  })
  const parsed = searchEntitiesResponseSchema.parse(data)
  return mapSearchResult(parsed)
}
