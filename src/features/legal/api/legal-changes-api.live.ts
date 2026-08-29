import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  legalChangesPageSchema,
  type LegalChangesFilter,
  type LegalChangesPage,
} from '@/schemas/legal'

/**
 * Live adapters for the global change feed (`/legislation/changes`) — the
 * `legalRecentChanges` connection: keyset-cursor paging (`after` +
 * `pageInfo.endCursor`, NOT the gazette's page/pageSize), ordered by
 * (effective_date desc, event_id desc), the cursor bound to the filter — the
 * server answers "cursor/filter mismatch; restart pagination" if a cursor
 * outlives its filter, so the component resets paging on every filter change.
 *
 * The feed query deliberately does NOT select `totalCount`: the server
 * resolves it lazily and a count failure resolves the field null WITH a
 * field-level `errors[]` entry — which the shared `graphqlQuery` treats as a
 * failed request, so one slow count would take the whole feed down. The count
 * is `fetchRecentChangesCountLive`, its own request keyed on the filter (not
 * the cursor — paging must not re-run a full-scan count).
 */
const CHANGES_FEED_QUERY = /* GraphQL */ `
  query LegislationChangesFeed($since: String, $until: String, $kinds: [String!], $eventSource: String, $undatedOnly: Boolean, $first: Int!, $after: String) {
    legalRecentChanges(since: $since, until: $until, kinds: $kinds, eventSource: $eventSource, undatedOnly: $undatedOnly, first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          eventId
          eventKind
          effectiveDate
          eventSource
          sourceAct {
            actId
            displayCitation
          }
          actId
          displayCitation
          status
        }
      }
    }
  }
`

/** The count alone; `first: 1` because the connection still serves a page. */
const CHANGES_COUNT_QUERY = /* GraphQL */ `
  query LegislationChangesCount($since: String, $until: String, $kinds: [String!], $eventSource: String, $undatedOnly: Boolean) {
    legalRecentChanges(since: $since, until: $until, kinds: $kinds, eventSource: $eventSource, undatedOnly: $undatedOnly, first: 1) {
      totalCount
    }
  }
`

/** Server act-status enum → the DB kebab vocabulary the UI schema speaks. */
const STATUS_BY_ENUM: Record<string, string> = {
  IN_VIGOARE: 'in-vigoare',
  MODIFICAT: 'modificat',
  ABROGAT: 'abrogat',
  ABROGAT_PARTIAL: 'abrogat-partial',
  SUSPENDAT: 'suspendat',
  IESIT_DIN_VIGOARE: 'iesit-din-vigoare',
  NECUNOSCUT: 'necunoscut',
}

type Raw = Record<string, unknown>

const rec = (value: unknown): Raw =>
  value && typeof value === 'object' ? (value as Raw) : {}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

/**
 * The filter, as GraphQL variables. Two server rules are enforced HERE, the
 * last layer before the wire, no matter what the component hands over:
 *  - `kinds` is only ever present as a non-empty array — the server REJECTS
 *    `kinds: []` and blank-only entries as invalid input, never reads them as
 *    "all kinds"; "no kind chosen" means the key is ABSENT;
 *  - `undatedOnly` strips `since`/`until` — the server refuses the
 *    combination outright (undated events fail every date comparison).
 */
function buildFeedVariables(filter: LegalChangesFilter): Raw {
  const undated = filter.undated === true
  return {
    ...(!undated && filter.since !== undefined && { since: filter.since }),
    ...(!undated && filter.until !== undefined && { until: filter.until }),
    ...(filter.kind !== undefined && { kinds: [filter.kind] }),
    ...(filter.source !== undefined && { eventSource: filter.source }),
    ...(undated && { undatedOnly: true }),
  }
}

export async function fetchRecentChangesPageLive(
  filter: LegalChangesFilter,
  options: {
    readonly first?: number
    readonly after?: string
    readonly signal?: AbortSignal
  } = {},
): Promise<LegalChangesPage> {
  const data = await graphqlQuery<{ legalRecentChanges: Raw }>(
    CHANGES_FEED_QUERY,
    {
      ...buildFeedVariables(filter),
      first: options.first ?? 20,
      ...(options.after !== undefined && { after: options.after }),
    },
    {
      operationName: 'legislationChangesFeed',
      auth: 'none',
      signal: options.signal,
    },
  )

  const connection = rec(data.legalRecentChanges)
  const pageInfo = rec(connection.pageInfo)
  const edges = Array.isArray(connection.edges) ? connection.edges : []
  const items = edges.map((edge) => {
    const node = rec(rec(edge).node)
    const sourceAct = rec(node.sourceAct)
    const sourceActId = str(sourceAct.actId)
    return {
      eventId: String(node.eventId ?? ''),
      eventKind: str(node.eventKind) ?? '',
      effectiveDate: str(node.effectiveDate),
      eventSource: str(node.eventSource) ?? '',
      sourceAct:
        node.sourceAct && sourceActId !== null
          ? {
              actId: sourceActId,
              displayCitation: str(sourceAct.displayCitation) ?? sourceActId,
            }
          : null,
      actId: String(node.actId ?? ''),
      displayCitation: str(node.displayCitation) ?? String(node.actId ?? ''),
      status: STATUS_BY_ENUM[str(node.status) ?? ''] ?? 'necunoscut',
    }
  })

  return legalChangesPageSchema.parse({
    items,
    // hasNextPage false ⇒ the cursor is exhausted even if the server minted one.
    endCursor:
      pageInfo.hasNextPage === true && typeof pageInfo.endCursor === 'string'
        ? pageInfo.endCursor
        : null,
  })
}

/**
 * The filtered total, or null when the server cannot assert one — the count
 * is a full scan today, so a timeout is its likeliest failure. The CALLER
 * (React Query) owns transport failures; this function only maps a served
 * value, so an aborted request stays an error and is never cached as
 * "unknown".
 */
export async function fetchRecentChangesCountLive(
  filter: LegalChangesFilter,
  options: { readonly signal?: AbortSignal } = {},
): Promise<number | null> {
  const data = await graphqlQuery<{ legalRecentChanges: Raw }>(
    CHANGES_COUNT_QUERY,
    buildFeedVariables(filter),
    {
      operationName: 'legislationChangesCount',
      auth: 'none',
      signal: options.signal,
    },
  )

  const totalCount = rec(data.legalRecentChanges).totalCount
  return typeof totalCount === 'number' && Number.isFinite(totalCount)
    ? Math.trunc(totalCount)
    : null
}
