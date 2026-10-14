import { z } from 'zod'

/**
 * The elections catalog as the API serves it today: source editions and their
 * contests, metadata only (server `src/modules/elections/`). An edition is one
 * source's data set, not a distinct election — two editions of one event
 * overlap and are not additive. Every `reported*` value is the stored source
 * label, shown and filtered exactly as it comes: never trimmed, re-cased,
 * split or corrected. Results, turnout, candidates and mandates have no
 * served projection, so nothing here has a field for them.
 */

/** The page size every list reads with: the API's own default, within its bound of 100. */
export const ELECTIONS_PAGE_SIZE = 20

/** GraphQL's `Int`, which carries the page: a signed 32-bit integer. A larger page fails the request before the API reads it. */
const GRAPHQL_MAX_INT = 2_147_483_647

/** The last page these reads can ask for: GraphQL's largest `Int`, within the API's own bound that `(page - 1) × pageSize` stay a safe integer. */
export const ELECTIONS_MAX_PAGE = Math.min(GRAPHQL_MAX_INT, Math.floor(Number.MAX_SAFE_INTEGER / ELECTIONS_PAGE_SIZE))

/** The reported years the API filters by. */
export const REPORTED_YEAR_MIN = 1800
export const REPORTED_YEAR_MAX = 2100

/** The API's bounds for a filter label and for an edition or contest key. */
const MAX_LABEL_LENGTH = 128
const MAX_KEY_LENGTH = 512

/** The contest scope types the API serves: the source's reporting scope, not a verified jurisdiction. */
export const ELECTION_SCOPE_TYPES = ['siruta', 'county', 'diaspora', 'national', 'chamber', 'source_constituency'] as const
export type ElectionScopeType = (typeof ELECTION_SCOPE_TYPES)[number]

/** The API's rule for an opaque value: non-empty, bounded, no control characters. Nothing else is checked or changed. */
function isOpaqueText(value: string, maxLength: number): boolean {
  // eslint-disable-next-line no-control-regex -- Rejecting control characters is the point.
  return value.length > 0 && value.length <= maxLength && !/[\u0000-\u001f\u007f]/u.test(value)
}

/** An edition or contest key the API can look up. Any other key names no record: the page answers 404 without asking. */
export function isElectionRecordKey(value: string): boolean {
  return isOpaqueText(value, MAX_KEY_LENGTH)
}

// ── Responses ──

const evidenceStatusSchema = z.enum(['VERIFIED', 'HELD', 'UNAVAILABLE', 'UNKNOWN'])

/** What the API says is qualified about a row. Only the identity and the source selection change what the page says. */
const readinessSchema = z.object({
  identity: evidenceStatusSchema,
  sourceSelection: evidenceStatusSchema,
})
export type ElectionReadiness = z.infer<typeof readinessSchema>

export const electionEditionSchema = z.object({
  electionKey: z.string(),
  /** The platform's event grouping: unverified, and never an identity. */
  eventKey: z.string().nullable(),
  reportedName: z.string(),
  reportedYear: z.number().int().nullable(),
  reportedFamily: z.string(),
  /** A round label as stored („tur1", „final"): a label, not a finality status. */
  reportedRound: z.string().nullable(),
  /** ISO date (YYYY-MM-DD). */
  reportedDate: z.string().nullable(),
  reportedAuthority: z.string(),
  readiness: readinessSchema,
})
export type ElectionEdition = z.infer<typeof electionEditionSchema>

export const electionContestSchema = z.object({
  contestKey: z.string(),
  electionKey: z.string(),
  reportedOffice: z.string(),
  chamber: z.string().nullable(),
  reportedRound: z.string().nullable(),
  scopeType: z.enum(ELECTION_SCOPE_TYPES),
  /** The source's scope key: it can name a reporting location, not a verified territory. */
  sourceScopeKey: z.string(),
  scopeLabel: z.string().nullable(),
  constituencyCode: z.string().nullable(),
  constituencyName: z.string().nullable(),
  readiness: readinessSchema,
})
export type ElectionContest = z.infer<typeof electionContestSchema>

/** One page of a list, as the API counts it: `total` is the exact filtered count, independent of the page. */
function pageSchemaOf<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  })
}

export const electionEditionPageSchema = pageSchemaOf(electionEditionSchema)
export type ElectionEditionPage = z.infer<typeof electionEditionPageSchema>

export const electionContestPageSchema = pageSchemaOf(electionContestSchema)
export type ElectionContestPage = z.infer<typeof electionContestPageSchema>

// ── Search params ──

/** The router parses `?tur=1` into a number and `?tip=true` into a boolean; a label is the text either way. */
const asLabel = (value: unknown) => (typeof value === 'number' || typeof value === 'boolean' ? String(value) : value)

/** A filter label exactly as given, or none: an empty, over-long or control-character value is no filter at all. */
const labelParam = z
  .preprocess(asLabel, z.string().refine((value) => isOpaqueText(value, MAX_LABEL_LENGTH)).optional())
  .catch(undefined)

const yearParam = z
  .preprocess(
    (value) => (typeof value === 'string' && /^\d+$/u.test(value) ? Number(value) : value),
    z.number().int().min(REPORTED_YEAR_MIN).max(REPORTED_YEAR_MAX).optional(),
  )
  .catch(undefined)

const pageParam = z.number().int().min(1).max(ELECTIONS_MAX_PAGE).optional().catch(undefined)

/** `/alegeri`: the reported year and family the API filters by, and the page. */
export const electionsCatalogSearchSchema = z
  .object({
    an: yearParam,
    tip: labelParam,
    pagina: pageParam,
  })
  .catch({})
export type ElectionsCatalogSearch = z.infer<typeof electionsCatalogSearchSchema>

export function parseElectionsCatalogSearch(search: unknown): ElectionsCatalogSearch {
  return electionsCatalogSearchSchema.parse(search ?? {})
}

/** `/alegeri/$electionKey`: the edition's contests by reported office, scope type and reported round, and the page. */
export const electionContestsSearchSchema = z
  .object({
    functie: labelParam,
    arie: z.enum(ELECTION_SCOPE_TYPES).optional().catch(undefined),
    tur: labelParam,
    pagina: pageParam,
  })
  .catch({})
export type ElectionContestsSearch = z.infer<typeof electionContestsSearchSchema>

export function parseElectionContestsSearch(search: unknown): ElectionContestsSearch {
  return electionContestsSearchSchema.parse(search ?? {})
}
