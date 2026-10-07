import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { judicialAggregateSchema } from '@/schemas/judicial'
import { NO_CASES, type Caseload, type CaseloadRead } from '../lib/analysis-plans'

/**
 * The analysis page's one read (design.md §15): `judicialCaseload` by a
 * grouping and a filter, as `analysis-plans.ts` plans them. It asks for
 * counts only — a group's key and its count, and the filtered set's total.
 */

export const ANALYSIS_CASELOAD_QUERY = `query JusticeAnalysisCaseload($groupBy: JudicialAggregateGroupBy!, $filter: JudicialCasesFilter) {
  judicialCaseload(groupBy: $groupBy, filter: $filter) { denominator groups { key caseCount } }
}`

export function caseloadOf(data: unknown): Caseload {
  const parsed = judicialAggregateSchema.parse((data as { readonly judicialCaseload?: unknown } | null)?.judicialCaseload)
  return { total: parsed.denominator, groups: parsed.groups.map((group) => ({ key: group.key, count: group.caseCount })) }
}

/** A read; one with nothing to read answers zero without asking. */
export async function fetchCaseload(read: CaseloadRead, signal?: AbortSignal): Promise<Caseload> {
  if (read.filter === null) return NO_CASES
  const data = await graphqlQuery<unknown>(ANALYSIS_CASELOAD_QUERY, { groupBy: read.groupBy, filter: read.filter }, { operationName: 'JusticeAnalysisCaseload', signal })
  return caseloadOf(data)
}
