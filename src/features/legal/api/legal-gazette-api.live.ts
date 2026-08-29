import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  gazetteIssueContentsSchema,
  gazetteIssuesPageSchema,
  type GazetteBrowseFilter,
  type GazetteIssueContents,
  type GazetteIssuesPage,
} from '@/schemas/legal'

/**
 * Live gazette directory adapter — one `moIssues` page per call, using the
 * server's OWN page/pageSize paging (`MoIssueConnection` is `edges` +
 * `pageInfo` + `total`, not `items`/`totalCount`). The year filter is
 * mandatory server-side ("mo issue browse requires a year filter"), so the
 * filter type makes it impossible to omit.
 */
const GAZETTE_DIRECTORY_QUERY = /* GraphQL */ `
  query LegislationGazetteDirectory($filter: MoIssuesFilter!, $page: Int!, $pageSize: Int!) {
    moIssues(filter: $filter, page: $page, pageSize: $pageSize, sort: ISSUE_DATE_DESC) {
      total
      pageInfo {
        hasNextPage
      }
      edges {
        node {
          moIssueId
          partCode
          issueLabel
          issueNumber
          issueYear
          issueDate
          pdfUrl
          hasArchiveIndex
          hasEmonitorLink
        }
      }
    }
  }
`

/**
 * One issue's archive index, fetched ON EXPANSION only — never per list row
 * (the per-row round-trip was explicitly rejected as a cost elsewhere in this
 * module). `moIssueId` is a BigInt scalar: it travels as a string.
 */
const GAZETTE_ISSUE_CONTENTS_QUERY = /* GraphQL */ `
  query LegislationGazetteIssueContents($moIssueId: BigInt!, $first: Int!) {
    moIssue(moIssueId: $moIssueId) {
      moIssueId
      contents(first: $first) {
        pageInfo {
          hasNextPage
        }
        edges {
          node {
            moActKey
            title
            actType
            actNumberNorm
            actYear
            issuerSlug
            actDate
            resolution
            act {
              actId
              displayCitation
              status
            }
          }
        }
      }
    }
  }
`

/**
 * Contents page size. Measured 2026-08-26 on live Partea I issues: 3–15
 * publications per issue, so 50 covers essentially every issue; when it does
 * not, the UI DISCLOSES the cap ("primele 50") — never a silent truncation.
 */
export const GAZETTE_CONTENTS_FIRST = 50

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

const int = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null

function nodes(connection: unknown): Raw[] {
  const edges = rec(connection).edges
  return Array.isArray(edges) ? edges.map((edge) => rec(rec(edge).node)) : []
}

export async function fetchGazetteIssuesPageLive(
  filter: GazetteBrowseFilter,
  options: {
    readonly page?: number
    readonly pageSize?: number
    readonly signal?: AbortSignal
  } = {},
): Promise<GazetteIssuesPage> {
  const data = await graphqlQuery<{ moIssues: Raw }>(
    GAZETTE_DIRECTORY_QUERY,
    {
      filter: {
        year: { eq: filter.year },
        ...(filter.part !== undefined && { partCode: { in: [filter.part] } }),
      },
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
    },
    {
      operationName: 'legislationGazetteDirectory',
      auth: 'none',
      signal: options.signal,
    },
  )

  const connection = rec(data.moIssues)
  const items = nodes(connection).map((node) => ({
    moIssueId: String(node.moIssueId ?? ''),
    partCode: str(node.partCode) ?? '',
    issueLabel: str(node.issueLabel) ?? '',
    issueNumber: int(node.issueNumber),
    issueYear: int(node.issueYear) ?? 0,
    issueDate: str(node.issueDate),
    pdfUrl: str(node.pdfUrl),
    hasArchiveIndex: node.hasArchiveIndex === true,
    hasEmonitorLink: node.hasEmonitorLink === true,
  }))

  return gazetteIssuesPageSchema.parse({
    items,
    total: int(connection.total),
    hasNextPage: rec(connection.pageInfo).hasNextPage === true,
  })
}

export async function fetchGazetteIssueContentsLive(
  moIssueId: string,
  options: { readonly signal?: AbortSignal } = {},
): Promise<GazetteIssueContents> {
  const data = await graphqlQuery<{ moIssue: Raw | null }>(
    GAZETTE_ISSUE_CONTENTS_QUERY,
    { moIssueId, first: GAZETTE_CONTENTS_FIRST },
    {
      operationName: 'legislationGazetteIssueContents',
      auth: 'none',
      signal: options.signal,
    },
  )

  if (data.moIssue === null || data.moIssue === undefined) {
    // A vanished id is an error state, not an empty contents list — rendering
    // "nicio publicație" for it would assert something we did not observe.
    throw new Error(`gazette issue ${moIssueId} not found`)
  }

  const contents = rec(rec(data.moIssue).contents)
  const items = nodes(contents).map((node) => {
    const act = rec(node.act)
    return {
      moActKey: String(node.moActKey ?? ''),
      title: str(node.title),
      actType: str(node.actType),
      actNumberNorm: str(node.actNumberNorm),
      actYear: int(node.actYear),
      issuerSlug: str(node.issuerSlug),
      actDate: str(node.actDate),
      resolution: str(node.resolution) ?? 'unmatched',
      act:
        node.act && str(act.actId) !== null
          ? {
              actId: String(act.actId),
              displayCitation: str(act.displayCitation) ?? String(act.actId),
              status: STATUS_BY_ENUM[str(act.status) ?? ''] ?? 'necunoscut',
            }
          : null,
    }
  })

  return gazetteIssueContentsSchema.parse({
    items,
    hasMore: rec(contents.pageInfo).hasNextPage === true,
  })
}
