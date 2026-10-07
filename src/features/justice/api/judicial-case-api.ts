import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { judicialCaseDetailSchema, type JudicialCaseDetail } from '@/schemas/judicial'
import { z } from 'zod'
import { caseSheetOf, otherCaseIds, type CaseSheet, type RelatedCaseRead } from '../lib/case-model'
import { CASE_QUERY, relatedCasesQuery } from './judicial-queries'

/**
 * A case page's reads: the case by its court and number (the durable key —
 * a case id can change on a reload), then the other end of each of its
 * same-file links, one aliased request. The selection asks for no party
 * name and no hearing solution: the API withholds both, and this client
 * never asks.
 */

/** The links a page follows; a case with more lists the rest as a count. */
export const RELATED_CASES_READ = 10

const relatedNodeSchema = z
  .object({
    case: z.object({
      caseId: z.string(),
      institutionCode: z.string(),
      caseNumber: z.string(),
      category: z.string().nullable(),
      stageName: z.string().nullable(),
      sourceOpenedAt: z.string().nullable(),
    }),
  })
  .nullable()

/** The case's answer as the model reads it; null when the court has no case of that number. */
export function caseDetailOf(data: unknown): JudicialCaseDetail | null {
  return z.object({ judicialCase: judicialCaseDetailSchema.nullable() }).parse(data).judicialCase
}

/** The related cases' answer: the case at the other end of each link that has one, in the links' order. */
export function relatedReadOf(data: Record<string, unknown>, ids: readonly string[]): RelatedCaseRead {
  return {
    status: 'read',
    cases: ids.flatMap((_, index) => {
      const node = relatedNodeSchema.parse(data[`r${index}`] ?? null)
      return node ? [node.case] : []
    }),
  }
}

/** The case page's sheet; null when the court has no case of that number. */
export async function fetchCaseSheet(code: string, number: string, signal?: AbortSignal): Promise<CaseSheet | null> {
  const data = await graphqlQuery<unknown>(CASE_QUERY, { code, number }, { operationName: 'JudicialCasePage', signal })
  const detail = caseDetailOf(data)
  if (detail === null) return null

  const ids = otherCaseIds(detail).slice(0, RELATED_CASES_READ)
  let related: RelatedCaseRead = { status: 'none' }
  if (ids.length > 0) {
    try {
      const relatedData = await graphqlQuery<Record<string, unknown>>(
        relatedCasesQuery(ids),
        Object.fromEntries(ids.map((id, index) => [`id${index}`, id])),
        { operationName: 'JudicialRelatedCases', signal },
      )
      related = relatedReadOf(relatedData, ids)
    } catch (error) {
      if (signal?.aborted) throw error
      related = { status: 'failed' }
    }
  }
  return caseSheetOf(detail, related)
}
