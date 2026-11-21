import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { legislationFreshnessSchema, type LegislationFreshness } from '@/schemas/legal'
import { bucharestToday } from '../lib/legal-coverage'

/**
 * Live adapter for the corpus frontiers — ONE round-trip:
 *
 *  - `moIssues(filter: {year}, sort: ISSUE_DATE_DESC, pageSize: 1)` — the
 *    newest gazette issue. The year bound is mandatory server-side, so a year
 *    with no issue yet (early January, or a frozen discovery) reads the
 *    previous year once more, as the overview does;
 *  - `legalRecentChanges(until: today, first: 1)` — the newest change already
 *    in force (the feed leads with future-dated events otherwise);
 *  - `legalActCounts(groupBy: STATUS, filter: decizie × curtea-constitutionala)`
 *    — the Constitutional Court decisions held as acts. STATUS partitions, so
 *    a COMPLETE response sums to the exact count; anything less is unknown.
 *
 * Validated against the dev API on 2026-11-20 (legacy source): 2026-07-09,
 * 2026-09-25 and 22 856.
 */
const FRESHNESS_QUERY = /* GraphQL */ `
  query LegislationFreshness($moYear: Int!, $today: String!) {
    latestIssue: moIssues(filter: { year: { eq: $moYear } }, pageSize: 1, sort: ISSUE_DATE_DESC) {
      edges {
        node {
          issueDate
        }
      }
    }
    latestChange: legalRecentChanges(until: $today, first: 1) {
      edges {
        node {
          effectiveDate
        }
      }
    }
    ccrDecisions: legalActCounts(
      groupBy: STATUS
      filter: { actType: { in: ["decizie"] }, issuerSlug: { in: ["curtea-constitutionala"] } }
    ) {
      bucketsTruncated
      otherCount
      buckets {
        count
      }
    }
  }
`

type Raw = Record<string, unknown>

const rec = (value: unknown): Raw =>
  value && typeof value === 'object' ? (value as Raw) : {}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/

function firstNodeDate(connection: unknown, field: string): string | null {
  const edges = rec(connection).edges
  if (!Array.isArray(edges) || edges.length === 0) return null
  const value = rec(rec(edges[0]).node)[field]
  return typeof value === 'string' && ISO_DATE.test(value) ? value.slice(0, 10) : null
}

/** The exact count of a complete STATUS partition, else null. */
function partitionTotal(result: unknown): number | null {
  const raw = rec(result)
  if (raw.bucketsTruncated !== false || raw.otherCount !== 0) return null
  const buckets = Array.isArray(raw.buckets) ? raw.buckets : []
  let sum = 0
  for (const bucket of buckets) {
    const count = rec(bucket).count
    if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) return null
    sum += Math.trunc(count)
  }
  return sum
}

export async function fetchLegislationFreshnessLive(
  options: { readonly signal?: AbortSignal; readonly now?: Date } = {},
): Promise<LegislationFreshness> {
  const today = bucharestToday(options.now)
  const year = Number(today.slice(0, 4))
  const run = (moYear: number) =>
    graphqlQuery<Raw>(
      FRESHNESS_QUERY,
      { moYear, today },
      { operationName: 'legislationFreshness', auth: 'none', signal: options.signal },
    )

  const data = await run(year)
  let latestIssueDate = firstNodeDate(data.latestIssue, 'issueDate')
  if (latestIssueDate === null) {
    latestIssueDate = firstNodeDate((await run(year - 1)).latestIssue, 'issueDate')
  }

  return legislationFreshnessSchema.parse({
    latestIssueDate,
    latestEffectiveChangeDate: firstNodeDate(data.latestChange, 'effectiveDate'),
    ccrDecisionCount: partitionTotal(data.ccrDecisions),
  })
}
