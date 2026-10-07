import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { judicialAggregateSchema, judicialCaseListRowSchema, judicialCourtSchema } from '@/schemas/judicial'
import { z } from 'zod'
import { MAIN_STAGES } from '../lib/judicial-model'
import { courtSheetOf, childLevelOf, type CourtSheet, type CourtReads } from '../lib/court-model'
import { CASES_QUERY, CHILDREN_QUERY, COURT_CASES_PAGE_SIZE, COURT_QUERY } from './judicial-queries'

export { COURT_CASES_PAGE_SIZE }

/**
 * A court page's reads: the court and its children, its newest case, its
 * caseload by year, the year's matters and stages, and the first page of its
 * cases — one request — then its children's cases of the year, when it has
 * children. Every count is `judicialCaseload`'s.
 */

const casesConnectionSchema = z.object({
  edges: z.array(z.object({ node: judicialCaseListRowSchema })),
  pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
})

const courtResponseSchema = z.object({
  court: judicialCourtSchema.nullable(),
  newestModified: z.object({ edges: z.array(z.object({ node: z.object({ latestSourceModifiedAt: z.string().nullable() }) })) }),
  newestOpened: z.object({ edges: z.array(z.object({ node: z.object({ sourceOpenedAt: z.string().nullable() }) })) }),
  years: judicialAggregateSchema,
  matters: judicialAggregateSchema,
  ...Object.fromEntries(MAIN_STAGES.map((_, index) => [`stage${index}`, z.object({ denominator: z.number().int().nonnegative() })])),
  cases: casesConnectionSchema,
})

const childrenResponseSchema = z.object({ judicialCaseload: judicialAggregateSchema })

/** The court page's first answer as the model reads it; null when the API has no such court. */
export function courtReadsOf(data: unknown, year: number): Omit<CourtReads, 'children'> | null {
  const parsed = courtResponseSchema.parse(data)
  if (parsed.court === null) return null
  return {
    court: parsed.court,
    year,
    newestModifiedAt: parsed.newestModified.edges[0]?.node.latestSourceModifiedAt ?? null,
    newestOpenedAt: parsed.newestOpened.edges[0]?.node.sourceOpenedAt ?? null,
    years: parsed.years,
    matters: parsed.matters,
    stages: MAIN_STAGES.map((main, index) => ({ key: main.key, count: (parsed[`stage${index}` as keyof typeof parsed] as { denominator: number }).denominator })),
    cases: {
      rows: parsed.cases.edges.map((edge) => edge.node),
      endCursor: parsed.cases.pageInfo.endCursor,
      hasNextPage: parsed.cases.pageInfo.hasNextPage,
    },
  }
}

/** The children's answer: their cases of the year, by court. */
export function childrenReadOf(data: unknown): CourtReads['children'] {
  return { status: 'read', groups: childrenResponseSchema.parse(data).judicialCaseload.groups }
}

/**
 * The court page's sheet for one year; null when the API has no such court.
 * The children's counts are a second read: when it fails, the sheet is
 * marked partial (served once, read again) and the children show without
 * counts.
 */
export async function fetchCourtSheet(code: string, year: number, signal?: AbortSignal): Promise<CourtSheet | null> {
  const court = { institutionCode: { in: [code] } }
  const inYear = { ...court, year: { eq: year } }
  const data = await graphqlQuery<unknown>(
    COURT_QUERY,
    {
      code,
      court,
      year: inYear,
      ...Object.fromEntries(MAIN_STAGES.map((main, index) => [`stage${index}`, { ...inYear, stage: { in: [main.stage] } }])),
      first: COURT_CASES_PAGE_SIZE,
    },
    { operationName: 'JudicialCourtPage', signal },
  )
  const reads = courtReadsOf(data, year)
  if (reads === null) return null

  let children: CourtReads['children'] = { status: 'none' }
  if (childLevelOf(reads.court) !== null && reads.court.children.length > 0) {
    try {
      const childData = await graphqlQuery<unknown>(
        CHILDREN_QUERY,
        { filter: { institutionCode: { in: reads.court.children.map((child) => child.institutionCode) }, year: { eq: year } } },
        { operationName: 'JudicialCourtChildren', signal },
      )
      children = childrenReadOf(childData)
    } catch (error) {
      if (signal?.aborted) throw error
      children = { status: 'failed' }
    }
  }
  return courtSheetOf({ ...reads, children })
}

export interface CourtCasesPage {
  readonly rows: readonly z.infer<typeof judicialCaseListRowSchema>[]
  readonly endCursor: string | null
  readonly hasNextPage: boolean
}

/** The court's cases after a cursor, newest modification first (the API counts no total). */
export async function fetchCourtCases(code: string, after: string, signal?: AbortSignal): Promise<CourtCasesPage> {
  const data = await graphqlQuery<unknown>(
    CASES_QUERY,
    { court: { institutionCode: { in: [code] } }, first: COURT_CASES_PAGE_SIZE, after },
    { operationName: 'JudicialCourtCases', signal },
  )
  const connection = z.object({ judicialCases: casesConnectionSchema }).parse(data).judicialCases
  return { rows: connection.edges.map((edge) => edge.node), endCursor: connection.pageInfo.endCursor, hasNextPage: connection.pageInfo.hasNextPage }
}
