import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type { LegalActStatus } from '@/schemas/legal'
import type { ChangeRow } from './changes.model'

/**
 * The prototype's own reads of `legalRecentChanges` (the live adapter, `features/legal/api/legal-changes-api.live.ts`,
 * sends one kind and no description; promotion moves these into it). Two server rules hold here, the last layer
 * before the wire: `kinds` is never an empty list (the server rejects it), and `undatedOnly` never travels with
 * `since`/`until` (the server refuses the combination). The count is its own query, as in the live adapter: a count
 * failure arrives as a field error, which would take the whole page down with it.
 */

export type ChangesQuery = {
  readonly kinds: readonly string[]
  readonly since?: string
  readonly until?: string
  readonly undatedOnly?: boolean
}

const PAGE_QUERY = /* GraphQL */ `
  query LegislationChangesPrototype($since: String, $until: String, $kinds: [String!], $undatedOnly: Boolean, $first: Int!, $after: String) {
    legalRecentChanges(since: $since, until: $until, kinds: $kinds, undatedOnly: $undatedOnly, first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          eventId
          eventKind
          effectiveDate
          sourceAct {
            actId
            displayCitation
            summary { description }
          }
          actId
          displayCitation
          status
        }
      }
    }
  }
`

const COUNT_QUERY = /* GraphQL */ `
  query LegislationChangesPrototypeCount($since: String, $until: String, $kinds: [String!], $undatedOnly: Boolean) {
    legalRecentChanges(since: $since, until: $until, kinds: $kinds, undatedOnly: $undatedOnly, first: 1) {
      totalCount
    }
  }
`

const STATUS_BY_ENUM: Record<string, LegalActStatus> = {
  IN_VIGOARE: 'in-vigoare',
  MODIFICAT: 'modificat',
  ABROGAT: 'abrogat',
  ABROGAT_PARTIAL: 'abrogat-partial',
  SUSPENDAT: 'suspendat',
  IESIT_DIN_VIGOARE: 'iesit-din-vigoare',
  NECUNOSCUT: 'necunoscut',
}

type Raw = Record<string, unknown>
const rec = (value: unknown): Raw => (value && typeof value === 'object' ? (value as Raw) : {})
const str = (value: unknown): string | null => (typeof value === 'string' && value.trim().length > 0 ? value : null)

function variablesOf(q: ChangesQuery): Raw {
  const undated = q.undatedOnly === true
  return {
    ...(q.kinds.length > 0 && { kinds: [...q.kinds] }),
    ...(!undated && q.since !== undefined && { since: q.since }),
    ...(!undated && q.until !== undefined && { until: q.until }),
    ...(undated && { undatedOnly: true }),
  }
}

/** The chosen kinds inside the tab's own, or the tab's own when none of the chosen belongs to it — never empty. */
export function narrowKinds(tabKinds: readonly string[], chosen: readonly string[]): readonly string[] {
  const inside = tabKinds.filter((kind) => chosen.includes(kind))
  return inside.length > 0 ? inside : tabKinds
}

export async function fetchChangesPage(
  q: ChangesQuery,
  options: { readonly first?: number; readonly after?: string; readonly signal?: AbortSignal },
): Promise<{ readonly items: readonly ChangeRow[]; readonly endCursor: string | null }> {
  const data = await graphqlQuery<{ legalRecentChanges: Raw }>(
    PAGE_QUERY,
    { ...variablesOf(q), first: options.first ?? 20, ...(options.after !== undefined && { after: options.after }) },
    { operationName: 'legislationChangesPrototype', auth: 'none', signal: options.signal },
  )
  const connection = rec(data.legalRecentChanges)
  const pageInfo = rec(connection.pageInfo)
  const edges = Array.isArray(connection.edges) ? connection.edges : []
  const items = edges.map((edge): ChangeRow => {
    const node = rec(rec(edge).node)
    const source = rec(node.sourceAct)
    const sourceId = str(source.actId) ?? (typeof source.actId === 'number' ? String(source.actId) : null)
    return {
      eventId: String(node.eventId ?? ''),
      eventKind: str(node.eventKind) ?? '',
      effectiveDate: str(node.effectiveDate),
      actId: String(node.actId ?? ''),
      displayCitation: str(node.displayCitation) ?? String(node.actId ?? ''),
      status: STATUS_BY_ENUM[str(node.status) ?? ''] ?? 'necunoscut',
      sourceAct:
        sourceId !== null
          ? { actId: sourceId, displayCitation: str(source.displayCitation) ?? sourceId, description: str(rec(source.summary).description) }
          : null,
    }
  })
  return { items, endCursor: pageInfo.hasNextPage === true && typeof pageInfo.endCursor === 'string' ? pageInfo.endCursor : null }
}

export async function fetchChangesCount(q: ChangesQuery, options: { readonly signal?: AbortSignal } = {}): Promise<number | null> {
  const data = await graphqlQuery<{ legalRecentChanges: Raw }>(COUNT_QUERY, variablesOf(q), {
    operationName: 'legislationChangesPrototypeCount',
    auth: 'none',
    signal: options.signal,
  })
  const total = rec(data.legalRecentChanges).totalCount
  return typeof total === 'number' && Number.isFinite(total) ? Math.trunc(total) : null
}
