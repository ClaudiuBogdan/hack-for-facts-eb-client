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
      degraded
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
        docId
        docKey
        subtitle
        countyName
        url
        cuis
        identifiers
        roles
        isActive
      }
    }
  }
`

/** `score` may arrive as number or null; coerce defensively. */
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
  // `source` and `rankBoost` were fetched here and discarded: neither reached
  // the mapper, the seam type, or any component. Dropped 2026-08-26
  // (SEARCH_LAYER_REVIEW_2026-08-25.md F15). `roles` stays — it is part of the
  // declared identity contract (filter `docTypes` for what a thing IS, `roles`
  // for what it PLAYS) and the input filter is plumbed end to end.
  docId: z.union([z.string(), z.number()]).nullable(),
  docKey: z.string().nullable(),
  subtitle: z.string().nullable(),
  countyName: z.string().nullable(),
  url: z.string().nullable(),
  cuis: z.array(z.string()).nullable(),
  identifiers: z.array(z.string()).nullable(),
  roles: z.array(z.string()).nullable(),
  isActive: z.boolean().nullable(),
})

export const searchEntitiesResponseSchema = z.object({
  searchEntities: z.object({
    query: z.string(),
    engine: z.enum(['meili', 'postgres']),
    // DEPLOY ORDER: SERVER FIRST, THEN CLIENT — this default does not change
    // that. An earlier version of this comment claimed the default made a
    // client-first rollout safe; it does not. The document above SELECTS
    // `degraded`, so a server without the field rejects the whole query
    // ("Cannot query field \"degraded\" on type \"GlobalSearchResult\"") and no
    // response ever reaches Zod. The default only covers a server that answers
    // without the field, which GraphQL does not do.
    degraded: z.boolean().optional().default(false),
    estimatedTotalHits: z.number(),
    facets: z.array(rawSearchFacetSchema),
    hits: z.array(rawSearchHitSchema),
  }),
})

export type RawSearchHit = z.infer<typeof rawSearchHitSchema>
export type RawSearchFacet = z.infer<typeof rawSearchFacetSchema>
export type SearchEntitiesResponse = z.infer<typeof searchEntitiesResponseSchema>
