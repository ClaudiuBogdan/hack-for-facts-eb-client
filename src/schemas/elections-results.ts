import { z } from 'zod'
import { ELECTION_ALLOCATION_PHASES, ELECTION_COMPETITOR_KINDS } from './elections-catalog'

/**
 * The analysis page's reads as the API serves them (server
 * `src/modules/elections/shell/graphql/schema.ts`): the tallies of one place,
 * an office aggregate or a contest, and the places of one type. Only what the
 * page folds into party lines is read. The competitor's actor key ties a
 * party across places; an independent's key and label spell a person's name,
 * and the reducer drops both at once, so neither is kept past the parse.
 *
 * Counts come as decimal strings; a missing figure has no row.
 */

export const electionResultTallySchema = z.object({
  measure: z.string(),
  allocationPhase: z.enum(ELECTION_ALLOCATION_PHASES),
  value: z.string().regex(/^\d+$/u),
  status: z.string(),
  issues: z.array(z.string()),
  competitor: z.object({
    kind: z.enum(ELECTION_COMPETITOR_KINDS),
    actorKey: z.string().nullable(),
    label: z.string(),
  }),
})
export type ElectionResultTally = z.infer<typeof electionResultTallySchema>

const talliesSchema = z.object({ tallies: z.array(electionResultTallySchema) })

const scopesSchema = z.object({
  total: z.number().int(),
  hasMore: z.boolean(),
  items: z.array(z.object({ place: z.object({ countyCode: z.string().nullable() }), tallies: z.array(electionResultTallySchema) })),
})

/** The local elections' mandates: three national aggregates and the mayors' and councillors' counties. `null`: no figures there. */
export const localMandatesResponseSchema = z.object({
  mayor: talliesSchema.nullable(),
  council: talliesSchema.nullable(),
  county: talliesSchema.nullable(),
  mayorCounties: scopesSchema,
  councilCounties: scopesSchema,
})
export type LocalMandatesResponse = z.infer<typeof localMandatesResponseSchema>

/** One county's council, read from its own contest. */
export const countyCouncilResponseSchema = z.object({ electionResult: talliesSchema.nullable() })
export type CountyCouncilResponse = z.infer<typeof countyCouncilResponseSchema>
