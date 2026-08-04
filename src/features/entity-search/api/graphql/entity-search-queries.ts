/**
 * GraphQL query document + raw-response Zod schema for the redesign global
 * entity search (`searchEntities`). The raw shapes mirror the server SDL
 * (`SearchEntitiesResult` / `SearchHit` / `SearchFacet`); the mappers in
 * `entity-search-mappers.ts` translate them into the UI's `EntitySearchResult`.
 *
 * Server typedefs (read-only reference):
 *   hack-for-facts-eb-server/src/modules/.../searchEntities typedefs
 */
import { z } from 'zod'

export const SEARCH_ENTITIES_QUERY = /* GraphQL */ `
  query SearchEntities(
    $q: String!
    $docTypes: [String!]
    $roles: [String!]
    $county: String
    $isActive: Boolean
    $limit: Int
    $offset: Int
  ) {
    searchEntities(
      q: $q
      docTypes: $docTypes
      roles: $roles
      county: $county
      isActive: $isActive
      limit: $limit
      offset: $offset
    ) {
      query
      engine
      estimatedTotalHits
      facets {
        field
        value
        count
      }
      hits {
        id
        docType
        title
        snippet
        score
        source
        docId
        docKey
        subtitle
        countyName
        url
        rankBoost
        cuis
        identifiers
        roles
        isActive
      }
    }
  }
`

/** `score` / `rankBoost` may arrive as number or null; coerce defensively. */
const numberOrNull = z.union([z.number(), z.string()]).nullable()

const rawSearchFacetSchema = z.object({
  field: z.string(),
  value: z.string(),
  count: z.number(),
})

const rawSearchHitSchema = z.object({
  id: z.string(),
  docType: z.string(),
  title: z.string(),
  snippet: z.string().nullable(),
  score: numberOrNull,
  source: z.string().nullable(),
  docId: z.union([z.string(), z.number()]).nullable(),
  docKey: z.string().nullable(),
  subtitle: z.string().nullable(),
  countyName: z.string().nullable(),
  url: z.string().nullable(),
  rankBoost: numberOrNull,
  cuis: z.array(z.string()).nullable(),
  identifiers: z.array(z.string()).nullable(),
  roles: z.array(z.string()).nullable(),
  isActive: z.boolean().nullable(),
})

export const searchEntitiesResponseSchema = z.object({
  searchEntities: z.object({
    query: z.string(),
    engine: z.enum(['meili', 'postgres']),
    estimatedTotalHits: z.number(),
    facets: z.array(rawSearchFacetSchema),
    hits: z.array(rawSearchHitSchema),
  }),
})

export type RawSearchHit = z.infer<typeof rawSearchHitSchema>
export type RawSearchFacet = z.infer<typeof rawSearchFacetSchema>
export type SearchEntitiesResponse = z.infer<typeof searchEntitiesResponseSchema>
