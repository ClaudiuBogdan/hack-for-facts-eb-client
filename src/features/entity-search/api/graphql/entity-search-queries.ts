/**
 * GraphQL query document + raw-response Zod schema for the redesign global
 * entity search (`searchEntities`). The raw shapes mirror the server SDL
 * (`GlobalSearchResult` / `SearchHit` / `SearchHitCompany` / `SearchFacet`);
 * the mappers in `entity-search-mappers.ts` translate them into the UI's
 * `EntitySearchResult`.
 *
 * Server typedefs (read-only reference):
 *   hack-for-facts-eb-server/src/modules/shared/shell/graphql/typedefs.ts
 *
 * The schema is strict (shared-search contract r2): an answer whose company
 * metadata does not hold together is unreadable, and the transport turns it
 * into a withheld answer to retry — never into an empty healthy list.
 */
import { z } from 'zod'
import { ENTITY_SEARCH_CONTRIBUTION_REASONS } from '@/schemas/entity-search'

export const SEARCH_ENTITIES_QUERY = /* GraphQL */ `
  query SearchEntities(
    $q: String!
    $docTypes: [String!]
    $roles: [String!]
    $county: String
    $isUat: Boolean
    $entityTags: [String!]
    $excludeEntityTags: [String!]
    $isActive: Boolean
    $limit: Int
    $offset: Int
  ) {
    searchEntities(
      q: $q
      docTypes: $docTypes
      roles: $roles
      county: $county
      isUat: $isUat
      entityTags: $entityTags
      excludeEntityTags: $excludeEntityTags
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
        isUat
        entityTags
        ngoRegistryNumber
        ngoRegistryStatus
        company {
          registryState
          name
          nameSource
          legalForm
          countyCode
          countyName
          active
          identifiers
        }
      }
      generation {
        generationId
        registryScopeKey
      }
      companyScope
      companyContribution
      companyContributionReason
      continuation {
        candidatesReturned
        nextOffset
      }
    }
  }
`

/** The server's offset bound: `nextOffset` never passes it. */
export const SEARCH_OFFSET_MAX = 1000

/** `score` may arrive as number or null; coerce defensively. */
const numberOrNull = z.union([z.number(), z.string()]).nullable()
const countSchema = z.number().int().nonnegative()
const nonBlank = z.string().refine((value) => value.trim() !== '', 'blank')

const rawSearchFacetSchema = z.strictObject({
  field: z.string(),
  value: z.string(),
  count: countSchema,
})

const rawSearchHitCompanySchema = z.strictObject({
  registryState: z.enum(['IN_EDITION', 'NOT_IN_EDITION']),
  name: nonBlank,
  nameSource: z.enum(['onrc_edition', 'core_organization']),
  legalForm: z.string().nullable(),
  countyCode: z.string().nullable(),
  countyName: z.string().nullable(),
  active: z.boolean().nullable(),
  identifiers: z.array(z.string()),
})

const rawSearchHitSchema = z.strictObject({
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
  // Null is unknown (contract r2 §4): never defaulted to active or inactive.
  isActive: z.boolean().nullable(),
  isUat: z.boolean().nullish(),
  entityTags: z.array(z.string()).nullish(),
  /** The NGO registry's own number and status, on the registry's organisations (`source::rnong`); the registry route's lookup. */
  ngoRegistryNumber: z.string().nullish(),
  ngoRegistryStatus: z.string().nullish(),
  company: rawSearchHitCompanySchema.nullable(),
})

// DEPLOY ORDER: SERVER FIRST, THEN CLIENT. The document SELECTS the contract
// fields, so a server without them rejects the whole query and no response
// reaches Zod; nothing here is defaulted.
const rawSearchResultObjectSchema = z.strictObject({
  query: z.string(),
  engine: z.enum(['meili', 'postgres', 'none']),
  degraded: z.boolean(),
  estimatedTotalHits: countSchema,
  facets: z.array(rawSearchFacetSchema),
  hits: z.array(rawSearchHitSchema),
  generation: z
    .strictObject({ generationId: nonBlank, registryScopeKey: nonBlank })
    .nullable(),
  companyScope: nonBlank.nullable(),
  companyContribution: z.enum(['CURRENT', 'PARTIAL', 'UNAVAILABLE']),
  companyContributionReason: z.enum(ENTITY_SEARCH_CONTRIBUTION_REASONS).nullable(),
  continuation: z.strictObject({
    candidatesReturned: countSchema,
    nextOffset: z.number().int().positive().max(SEARCH_OFFSET_MAX).nullable(),
  }),
})

type RawSearchResult = z.infer<typeof rawSearchResultObjectSchema>

/**
 * What makes an answer's company metadata unreadable (contract r2 §3, §4, §6).
 * Each line is a contract rule; none of them is a server implementation detail.
 */
function searchResultProblems(result: RawSearchResult): readonly string[] {
  const problems: string[] = []
  const { companyContribution: state, companyContributionReason: reason } = result
  if ((state === 'CURRENT') !== (reason === null)) {
    problems.push('the reason must be null exactly when the contribution is CURRENT')
  }
  if ((state === 'PARTIAL') !== (reason === 'generation_scope_stale')) {
    problems.push('PARTIAL comes exactly with generation_scope_stale')
  }
  if (result.degraded !== (reason === 'engine_unavailable')) {
    problems.push('degraded comes exactly with engine_unavailable')
  }
  if (state !== 'UNAVAILABLE') {
    const witnessed = result.generation?.registryScopeKey
    if (witnessed === undefined || result.companyScope === null) {
      problems.push(`${state} needs a witnessed generation and a company scope`)
    } else if ((witnessed === result.companyScope) !== (state === 'CURRENT')) {
      problems.push(`${state} contradicts the generation's scope`)
    }
  }
  for (const hit of result.hits) {
    if (state === 'UNAVAILABLE' && (hit.company !== null || hit.docType === 'company')) {
      problems.push('company values were served while the contribution is UNAVAILABLE')
    }
    if (hit.docType === 'company' && hit.company === null) {
      problems.push('a company document came without its company part')
    }
  }
  if (result.hits.length > result.continuation.candidatesReturned) {
    problems.push('more hits than candidates')
  }
  if (result.continuation.nextOffset !== null && result.continuation.candidatesReturned === 0) {
    problems.push('a next page after an empty candidate page')
  }
  return [...new Set(problems)]
}

/**
 * The root is nullable: the server's final check answers `null` with one
 * `SERVICE_UNAVAILABLE` error when it refuses the answer. The transport turns
 * that, and anything this schema refuses, into a withheld answer.
 */
export const searchEntitiesResponseSchema = z.strictObject({
  searchEntities: rawSearchResultObjectSchema
    .superRefine((result, context) => {
      for (const message of searchResultProblems(result)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message })
      }
    })
    .nullable(),
})

export type RawSearchHit = z.infer<typeof rawSearchHitSchema>
export type RawSearchHitCompany = z.infer<typeof rawSearchHitCompanySchema>
export type RawSearchFacet = z.infer<typeof rawSearchFacetSchema>
export type SearchEntitiesResponse = z.infer<typeof searchEntitiesResponseSchema>
export type SearchEntitiesAnswer = NonNullable<SearchEntitiesResponse['searchEntities']>
