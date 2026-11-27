import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { legalActsPageSchema, type LegalActsPage } from '@/schemas/legal'
import { legalSearchFilterInput, type LegalSearchFilter } from './legal-search-api.live'

/**
 * The act list behind the search with no term (owner, 27 November 2026; it was the Acte directory's) — one `legalActs` page per call, cursor-only (223k
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

/** The filter is the search's own (`LegalSearchFilter`), so a list with no term narrows exactly as the search does. */
export async function fetchLegalActsPageLive(
  filter: LegalSearchFilter,
  options: { readonly first?: number; readonly after?: string; readonly signal?: AbortSignal } = {},
): Promise<LegalActsPage> {
  const data = await graphqlQuery<{ legalActs: Raw }>(
    ACTS_DIRECTORY_QUERY,
    {
      filter: legalSearchFilterInput(filter),
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
      // Bridged on legal_v2: a null status or in-degree stays null (unknown).
      status:
        typeof node.status === 'string' ? (STATUS_BY_ENUM[node.status] ?? 'necunoscut') : null,
      inDegree:
        typeof node.inDegree === 'number' && Number.isFinite(node.inDegree)
          ? Math.trunc(node.inDegree)
          : null,
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
