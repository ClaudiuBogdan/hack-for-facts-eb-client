import { z } from 'zod'

/**
 * The elections pages' reads as the API serves them since 2026-10-21 (server
 * `src/modules/elections/`, the scrapper's serving model): the events with
 * published figures, each with its ballot days („occurrences"), one day's
 * contests, and the figures of a contest's own place. Families, offices,
 * rounds, kinds and statuses are the API's closed vocabularies; place and
 * party names come exactly as the API spells them. Counts arrive as decimal
 * strings and stay strings until they are formatted; a missing figure has no
 * row, so nothing here ever reads one as zero.
 *
 * Privacy: an independent competitor is a person, and the API names them by
 * their ballot label. The parse drops that label before anything reaches a
 * page, its cache or the server-rendered HTML; the page says „candidat
 * independent" instead. No competitor key is read, since an independent's
 * key spells the name too.
 */

/** The page size every list reads with: the API's own default, within its bound of 100. */
export const ELECTIONS_PAGE_SIZE = 20

/** GraphQL's `Int`, which carries the page: a signed 32-bit integer. A larger page fails the request before the API reads it. */
const GRAPHQL_MAX_INT = 2_147_483_647

/** The last page these reads can ask for: GraphQL's largest `Int`, within the API's own bound that `(page - 1) × pageSize` stay a safe integer. */
export const ELECTIONS_MAX_PAGE = Math.min(GRAPHQL_MAX_INT, Math.floor(Number.MAX_SAFE_INTEGER / ELECTIONS_PAGE_SIZE))

/** The API's bound for an event or contest key. */
const MAX_KEY_LENGTH = 512

export const ELECTION_FAMILIES = ['local', 'parliamentary', 'presidential', 'european', 'referendum'] as const
export type ElectionFamily = (typeof ELECTION_FAMILIES)[number]

export const ELECTION_ROUNDS = ['r1', 'r2', 'r3', 'unknown'] as const
export type ElectionRound = (typeof ELECTION_ROUNDS)[number]

export const ELECTION_OCCURRENCE_KINDS = ['general', 'runoff', 'repeat', 'partial'] as const
export type ElectionOccurrenceKind = (typeof ELECTION_OCCURRENCE_KINDS)[number]

/** Held, or annulled: an annulled contest may have no figures; one annulled after its count keeps them. */
export const ELECTION_STATUSES = ['held', 'annulled'] as const
export type ElectionStatus = (typeof ELECTION_STATUSES)[number]

/** The type of place an office covers: a UAT (by SIRUTA), a county, the diaspora, or the country. */
export const ELECTION_PLACE_TYPES = ['uat', 'county', 'national', 'diaspora'] as const
export type ElectionPlaceType = (typeof ELECTION_PLACE_TYPES)[number]

export const ELECTION_COMPETITOR_KINDS = ['party', 'minority_org', 'list', 'independent', 'independents_bucket'] as const
export type ElectionCompetitorKind = (typeof ELECTION_COMPETITOR_KINDS)[number]

/** Mandates per allocation phase are separate and never summed; votes carry `none`. */
export const ELECTION_ALLOCATION_PHASES = ['none', 'man_1', 'man_2', 'final'] as const
export type ElectionAllocationPhase = (typeof ELECTION_ALLOCATION_PHASES)[number]

export const ELECTION_TURNOUT_MEASURES = ['registered', 'voted', 'valid', 'invalid', 'blank'] as const
export type ElectionTurnoutMeasure = (typeof ELECTION_TURNOUT_MEASURES)[number]

/** VERIFIED: equals a separately published figure. UNCHECKED: no published counterpart. SUSPECT: a known defect. */
const FIGURE_STATUSES = ['VERIFIED', 'UNCHECKED', 'SUSPECT'] as const
const FINALITIES = ['final', 'provisional', 'unknown'] as const
const COMPLETENESS = ['complete', 'partial'] as const
const COUNTED_POPULATIONS = ['all', 'linked_only'] as const
const COVERAGE_STATES = ['usable', 'absent', 'links_missing', 'links_wrong'] as const

/** The API's office grammar (`mayor`, `county_council`, a qualified `office:part`), within its length bound. */
const OFFICE = /^[a-z][a-z0-9_]*(?::[a-z0-9_]+)?$/u
const MAX_OFFICE_LENGTH = 64
/** A county code as the API filters by it (`CJ`, `B`). */
const COUNTY_CODE = /^[A-Z]{1,2}$/u
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u

/** The API's rule for an opaque value: non-empty, bounded, no control characters. Nothing else is checked or changed. */
function isOpaqueText(value: string, maxLength: number): boolean {
  // eslint-disable-next-line no-control-regex -- Rejecting control characters is the point.
  return value.length > 0 && value.length <= maxLength && !/[\u0000-\u001f\u007f]/u.test(value)
}

/** An event or contest key the API can look up. Any other key names no record: the page answers 404 without asking. */
export function isElectionRecordKey(value: string): boolean {
  return isOpaqueText(value, MAX_KEY_LENGTH)
}

/** An office the API's filter accepts. */
export function isElectionOffice(value: string): boolean {
  return value.length <= MAX_OFFICE_LENGTH && OFFICE.test(value)
}

// ── Responses ──

/** A non-negative integer as a decimal string; 0 means the source printed 0. */
const countSchema = z.string().regex(/^\d+$/u)
const isoDateSchema = z.string().regex(ISO_DATE)
const issuesSchema = z.array(z.string())

const officeCountSchema = z.object({ office: z.string(), contests: z.number().int().nonnegative() })

/** One ballot day of an event: the date is its identity, the round and kind are attributes. */
const occurrenceSchema = z.object({
  occurrenceKey: z.string(),
  eventKey: z.string(),
  ballotDate: isoDateSchema,
  round: z.enum(ELECTION_ROUNDS),
  kind: z.enum(ELECTION_OCCURRENCE_KINDS),
  status: z.enum(ELECTION_STATUSES),
  offices: z.array(officeCountSchema),
})
export type ElectionOccurrence = z.infer<typeof occurrenceSchema>

/** An event with published figures; its family and year are parts of its key. */
export const electionEventSchema = z.object({
  eventKey: z.string(),
  family: z.enum(ELECTION_FAMILIES),
  year: z.number().int(),
  /** When the platform activated the event's current generation of figures. */
  publication: z.object({ activatedAt: z.string() }),
  occurrences: z.array(occurrenceSchema),
})
export type ElectionEvent = z.infer<typeof electionEventSchema>

/** A place. `name` is null for the diaspora and the country, and for a code the territory reference does not hold. */
const placeSchema = z.object({
  placeKey: z.string(),
  placeType: z.enum(ELECTION_PLACE_TYPES),
  sirutaCode: z.string().nullable(),
  countyCode: z.string().nullable(),
  name: z.string().nullable(),
  countyName: z.string().nullable(),
})
export type ElectionPlace = z.infer<typeof placeSchema>

/** A competitor as the pages may show it: an independent's label is dropped here, never later. */
const competitorSchema = z
  .object({ kind: z.enum(ELECTION_COMPETITOR_KINDS), label: z.string() })
  .transform(({ kind, label }) => ({ kind, label: kind === 'independent' ? null : label }))
export type ElectionCompetitor = z.infer<typeof competitorSchema>

/** A share of the same scope's valid votes (or registered voters), as the API rounds it: a decimal string. */
const shareSchema = z.object({ percent: z.string().regex(/^\d+(?:\.\d+)?$/u) })
export type ElectionShare = z.infer<typeof shareSchema>

const raceEntrySchema = z.object({ competitor: competitorSchema, votes: countSchema, share: shareSchema.nullable() })

/** Leader and runner-up by votes, computed by the API: never a winner, never a mandate. */
const raceSchema = z.object({
  competitorCount: z.number().int().nonnegative(),
  status: z.enum(['VERIFIED', 'UNCHECKED']),
  geographicCompleteness: z.enum(COMPLETENESS),
  finality: z.enum(FINALITIES),
  issues: issuesSchema,
  leader: raceEntrySchema,
  runnerUp: raceEntrySchema.nullable(),
  marginVotes: countSchema.nullable(),
  /** Percentage points of the same valid votes. */
  marginPoints: z.string().nullable(),
  tied: z.boolean(),
})
export type ElectionRace = z.infer<typeof raceSchema>

export const electionContestSchema = z.object({
  contestKey: z.string(),
  occurrenceKey: z.string(),
  eventKey: z.string(),
  office: z.string(),
  /** The place the office covers. */
  jurisdiction: placeSchema,
  status: z.enum(ELECTION_STATUSES),
  replacedBy: z.string().nullable(),
  /**
   * Null without votes at the jurisdiction (mandates only, or annulled without
   * figures), and also where its vote tallies do not count the same voters or
   * one is suspect: a null race never says there are no votes.
   */
  race: raceSchema.nullable(),
})
export type ElectionContest = z.infer<typeof electionContestSchema>

/** Each figure's quality, as the API states it: what the page must say before a reader trusts the number. */
const figureQualityShape = {
  value: countSchema,
  finality: z.enum(FINALITIES),
  geographicCompleteness: z.enum(COMPLETENESS),
  /** Set on national figures; null elsewhere. */
  includesDiaspora: z.boolean().nullable(),
  status: z.enum(FIGURE_STATUSES),
  issues: issuesSchema,
}

const tallySchema = z.object({
  ...figureQualityShape,
  competitor: competitorSchema,
  measure: z.enum(['votes', 'mandates']),
  allocationPhase: z.enum(ELECTION_ALLOCATION_PHASES),
  countedPopulation: z.enum(COUNTED_POPULATIONS),
  /** Votes only, and only when the share and the valid votes count the same voters. */
  share: shareSchema.nullable(),
})
export type ElectionTally = z.infer<typeof tallySchema>

const turnoutSchema = z.object({ ...figureQualityShape, measure: z.enum(ELECTION_TURNOUT_MEASURES) })
export type ElectionTurnoutFigure = z.infer<typeof turnoutSchema>

/** Whether a measure exists for the place: `absent` says it is not in the data, which is never a zero. */
const coverageSchema = z.object({
  measure: z.string(),
  allocationPhase: z.enum(ELECTION_ALLOCATION_PHASES),
  placeSpecific: z.boolean(),
  state: z.enum(COVERAGE_STATES),
  issues: issuesSchema,
})
export type ElectionCoverageCell = z.infer<typeof coverageSchema>

/** Every figure of one place in a contest: votes by value, then mandates by phase; turnout; coverage. */
export const electionResultSchema = z.object({
  tallies: z.array(tallySchema),
  turnout: z.array(turnoutSchema),
  /** Voted of registered, only when both are complete and unflagged; never for the diaspora. */
  participation: shareSchema.nullable(),
  /** The same read's race, so the gap shown always matches the votes shown; null where the votes are not comparable. */
  race: z
    .object({ tied: z.boolean(), marginVotes: countSchema.nullable(), marginPoints: z.string().nullable(), issues: issuesSchema })
    .nullable(),
  coverage: z.array(coverageSchema),
})
export type ElectionResult = z.infer<typeof electionResultSchema>

/** One page of a list, as the API counts it: `total` is the exact count, independent of the page. */
function pageSchemaOf<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  })
}

export const electionEventPageSchema = pageSchemaOf(electionEventSchema)
export type ElectionEventPage = z.infer<typeof electionEventPageSchema>

export const electionContestPageSchema = pageSchemaOf(electionContestSchema)
export type ElectionContestPage = z.infer<typeof electionContestPageSchema>

// ── Search params ──

const pageParam = z.number().int().min(1).max(ELECTIONS_MAX_PAGE).optional().catch(undefined)

/** `/alegeri`: the page. The API filters events by nothing else. */
export const electionsCatalogSearchSchema = z.object({ pagina: pageParam }).catch({})
export type ElectionsCatalogSearch = z.infer<typeof electionsCatalogSearchSchema>

export function parseElectionsCatalogSearch(search: unknown): ElectionsCatalogSearch {
  return electionsCatalogSearchSchema.parse(search ?? {})
}

/**
 * `/alegeri/$electionKey`: the ballot day by its date (its identity within
 * the event; none is the event's first day), then that day's contests by
 * office, place type and county, each one exact value the API accepts, and
 * the page.
 */
export const electionContestsSearchSchema = z
  .object({
    data: z.string().regex(ISO_DATE).optional().catch(undefined),
    functie: z.string().refine(isElectionOffice).optional().catch(undefined),
    arie: z.enum(ELECTION_PLACE_TYPES).optional().catch(undefined),
    judet: z.string().regex(COUNTY_CODE).optional().catch(undefined),
    pagina: pageParam,
  })
  .catch({})
export type ElectionContestsSearch = z.infer<typeof electionContestsSearchSchema>

export function parseElectionContestsSearch(search: unknown): ElectionContestsSearch {
  return electionContestsSearchSchema.parse(search ?? {})
}
