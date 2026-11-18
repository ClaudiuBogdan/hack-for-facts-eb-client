import { z } from 'zod'
import { ELECTION_PLACE_TYPES, ISO_DATE } from './elections-search'

export {
  ELECTION_PLACE_TYPES,
  ELECTIONS_MAX_PAGE,
  ELECTIONS_PAGE_SIZE,
  electionContestsSearchSchema,
  electionsCatalogSearchSchema,
  isElectionOffice,
  isElectionRecordKey,
  parseElectionContestsSearch,
  parseElectionsCatalogSearch,
  type ElectionContestsSearch,
  type ElectionPlaceType,
  type ElectionsCatalogSearch,
} from './elections-search'

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
 * An independent competitor is a person, whom the API names by their ballot
 * label; the pages show that label as served (the owner's call, 2026-10-31)
 * and say the competitor is independent. No competitor key is read: the pages
 * need none, and people are never joined across sources.
 */



export const ELECTION_FAMILIES = ['local', 'parliamentary', 'presidential', 'european', 'referendum'] as const
export type ElectionFamily = (typeof ELECTION_FAMILIES)[number]

export const ELECTION_ROUNDS = ['r1', 'r2', 'r3', 'unknown'] as const
export type ElectionRound = (typeof ELECTION_ROUNDS)[number]

export const ELECTION_OCCURRENCE_KINDS = ['general', 'runoff', 'repeat', 'partial'] as const
export type ElectionOccurrenceKind = (typeof ELECTION_OCCURRENCE_KINDS)[number]

/** Held, or annulled: an annulled contest may have no figures; one annulled after its count keeps them. */
export const ELECTION_STATUSES = ['held', 'annulled'] as const
export type ElectionStatus = (typeof ELECTION_STATUSES)[number]


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

/** A competitor by kind and the API's label: a party's or list's name, or an independent's ballot name. */
const competitorSchema = z.object({ kind: z.enum(ELECTION_COMPETITOR_KINDS), label: z.string() })
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
