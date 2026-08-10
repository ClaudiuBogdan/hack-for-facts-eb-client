import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  legalActsPageSchema,
  type LegalActsBrowseFilter,
  type LegalActsPage,
} from '@/schemas/legal'

/**
 * Live directory adapter — one `legalActs` page per call, cursor-only (223k
 * acts; numbered pages are a lie at that scale). The status filter speaks the
 * DB kebab vocabulary (string-typed filter input); the GraphQL enum mapping
 * belongs to the ACT rows coming back, not to the filter going in.
 */
const ACTS_DIRECTORY_QUERY = /* GraphQL */ `
  query LegalActsDirectory($filter: LegalActsFilter, $first: Int!, $after: String) {
    legalActs(filter: $filter, first: $first, after: $after) {
      totalCount
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          actId
          displayCitation
          actType
          actNumber
          actYear
          issuerSlug
          status
          inDegree
        }
      }
    }
  }
`

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

function buildFilter(filter: LegalActsBrowseFilter): Raw | null {
  const parts: Raw = {}
  // actType and status are `in`-only filter families (array-typed spec);
  // only year exposes `eq`. Validated against the real schema by the server's
  // legal-client-contract test.
  if (filter.actType !== undefined) parts.actType = { in: [filter.actType] }
  if (filter.year !== undefined) parts.year = { eq: filter.year }
  if (filter.status !== undefined) parts.status = { in: [filter.status] }
  return Object.keys(parts).length > 0 ? parts : null
}

export async function fetchLegalActsPageLive(
  filter: LegalActsBrowseFilter,
  options: { readonly first?: number; readonly after?: string; readonly signal?: AbortSignal } = {},
): Promise<LegalActsPage> {
  const data = await graphqlQuery<{ legalActs: Raw }>(
    ACTS_DIRECTORY_QUERY,
    {
      filter: buildFilter(filter),
      first: options.first ?? 20,
      after: options.after ?? null,
    },
    { operationName: 'legalActsDirectory', auth: 'none', signal: options.signal },
  )

  const connection = rec(data.legalActs)
  const pageInfo = rec(connection.pageInfo)
  const edges = Array.isArray(connection.edges) ? connection.edges : []
  const items = edges.map((edge) => {
    const node = rec(rec(edge).node)
    return {
      actId: String(node.actId ?? ''),
      displayCitation:
        typeof node.displayCitation === 'string' && node.displayCitation.length > 0
          ? node.displayCitation
          : String(node.actId ?? ''),
      actType: typeof node.actType === 'string' ? node.actType : '',
      actNumber: typeof node.actNumber === 'string' ? node.actNumber : null,
      actYear: typeof node.actYear === 'number' ? node.actYear : null,
      issuerSlug: typeof node.issuerSlug === 'string' ? node.issuerSlug : null,
      status:
        STATUS_BY_ENUM[typeof node.status === 'string' ? node.status : ''] ?? 'necunoscut',
      inDegree:
        typeof node.inDegree === 'number' && Number.isFinite(node.inDegree)
          ? Math.trunc(node.inDegree)
          : 0,
    }
  })

  return legalActsPageSchema.parse({
    items,
    // hasNextPage false ⇒ the cursor is exhausted even if the server minted one.
    endCursor:
      pageInfo.hasNextPage === true && typeof pageInfo.endCursor === 'string'
        ? pageInfo.endCursor
        : null,
    totalCount:
      typeof connection.totalCount === 'number' ? Math.trunc(connection.totalCount) : null,
  })
}
