import { z } from 'zod'

/**
 * Seam types for the global entity-search page (`/experimental/search`).
 *
 * These mirror the redesign server's `searchEntities` GraphQL query and are the
 * contract the page components consume. The raw GraphQL response shapes +
 * response Zod schema live in `features/entity-search/api/graphql`; this module
 * is the UI-facing surface plus the URL search-param schema.
 */

/**
 * The doc_type values the server allows in `docTypes`. All ten are populated.
 * KEEP IN SYNC with SEARCH_ENTITY_DOC_TYPES on the server and PALETTE_DOC_TYPES
 * in the scrapper.
 *
 * These are IDENTITIES, one hit each: a CUI that is both a municipality and a
 * PNRR beneficiary is ONE hit whose `roles` carries both. Filter `docTypes` for
 * what a thing IS, `roles` for what it PLAYS.
 */
export const ENTITY_SEARCH_DOC_TYPES = [
  'organization',
  'company',
  'public_enterprise',
  'ngo',
  'pnrr_entity',
  'member',
  'bill',
  'committee',
  'legal_act',
  'mo_act',
] as const

export type EntitySearchDocType = (typeof ENTITY_SEARCH_DOC_TYPES)[number]

/** The two search engines the server can answer with. */
export type EntitySearchEngine = 'meili' | 'postgres'

/**
 * A single search result row. `docType` is typed as `string` (not the enum) on
 * purpose: the server may grow new doc types and the UI must not crash on an
 * unknown one — the badge/routing layers degrade gracefully instead.
 */
export interface EntitySearchHit {
  readonly id: string
  readonly docType: string
  readonly title: string
  readonly subtitle: string | null
  readonly snippet: string | null
  readonly countyName: string | null
  /** Every role this identity plays (organization + pnrr_entity + …). */
  readonly roles: readonly string[]
  /** False for struck-off companies and repealed acts. */
  readonly isActive: boolean
  readonly identifiers: readonly string[]
  readonly docId: string | null
  readonly docKey: string | null
  readonly url: string | null
  readonly score: number | null
  /** Computed deep-link: an internal route path or an external url. */
  readonly href: string
  /** True when `href` is an external url (open in a new tab). */
  readonly isExternal: boolean
}

export interface EntitySearchFacet {
  readonly field: string
  readonly value: string
  readonly count: number
}

export interface EntitySearchResult {
  readonly query: string
  readonly engine: EntitySearchEngine
  /**
   * The engine could not answer, so this came from the server's reduced outage
   * path (exact identifier only). Empty `hits` then mean "we could not look",
   * NOT "no matches" — say so rather than rendering an empty state.
   */
  readonly degraded: boolean
  readonly estimatedTotalHits: number
  readonly facets: readonly EntitySearchFacet[]
  readonly hits: readonly EntitySearchHit[]
}

/** Input passed to `searchEntitiesLive` / `useEntitySearch`. */
export interface EntitySearchInput {
  readonly q: string
  readonly docTypes?: readonly string[]
  readonly roles?: readonly string[]
  readonly county?: string
  readonly isActive?: boolean
  readonly limit?: number
  readonly offset?: number
}

/**
 * URL state for the `/experimental/search` route. TanStack Router JSON-parses
 * search params, so a numeric-looking `q` (`?q=2816464`) can arrive as a number
 * — coerce to string. `types` is a repeatable param; a single value arrives as
 * a string, so accept both and normalize to an array. `.catch(undefined)` keeps
 * a malformed param from throwing in `validateSearch`.
 */
/**
 * A free-text URL param: coerce numeric-looking values to string (so
 * `?q=2816464` works) but treat `null`/booleans as absent — otherwise
 * `z.coerce.string()` would turn `?q=null` into the literal text `"null"` and
 * search for it.
 */
const optionalSearchString = z
  .preprocess(
    (value) => (value === null || typeof value === 'boolean' ? undefined : value),
    z.coerce.string().optional(),
  )
  .catch(undefined)

export const entitySearchParamsSchema = z.object({
  q: optionalSearchString,
  types: z
    .union([z.array(z.string()), z.string()])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .optional()
    .catch(undefined),
  county: optionalSearchString,
  active: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional()
    .catch(undefined),
})

export type EntitySearchParams = z.infer<typeof entitySearchParamsSchema>

export function parseEntitySearchParams(
  search: Record<string, unknown>,
): EntitySearchParams {
  return entitySearchParamsSchema.parse(search)
}
