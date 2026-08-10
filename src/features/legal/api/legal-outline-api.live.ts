import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { legalOutlineEntrySchema, type LegalOutlineEntry } from '@/schemas/legal'

/**
 * Live outline adapter — `legalDocumentOutline`, keyset-paged.
 *
 * The cursor is looped to exhaustion HERE so consumers get one array: the TOC
 * is only trustworthy complete (a half-fetched outline would silently drop
 * the annexes on exactly the giant documents that need navigation most).
 * Pages are 200 entries; the Codul-Fiscal class tops out around a few
 * thousand, so this stays a handful of round-trips behind one spinner.
 *
 * `maxDepth: 7` includes articles — the grain `?nod=` deep links and
 * jump-to-article need. (Server default is 3, which stops at chapters.)
 */
const OUTLINE_QUERY = /* GraphQL */ `
  query LegalDocumentOutline($documentId: String!, $maxDepth: Int!, $first: Int!, $after: String) {
    legalDocumentOutline(
      documentId: $documentId
      maxDepth: $maxDepth
      first: $first
      after: $after
    ) {
      entries {
        documentId
        path
        nodeKind
        label
        numberKey
        numberStatus
        depth
        orderIndex
        charStart
        charEnd
      }
      next
    }
  }
`

const OUTLINE_MAX_DEPTH = 7
const OUTLINE_PAGE_SIZE = 200
/** A page count no legitimate document reaches — a cursor loop fuse, logged loudly. */
const OUTLINE_MAX_PAGES = 100

interface RawOutlinePage {
  legalDocumentOutline: {
    entries: unknown[]
    next: string | null
  }
}

export async function fetchLegalOutlineLive(
  documentId: string,
  signal?: AbortSignal,
): Promise<LegalOutlineEntry[]> {
  const entries: LegalOutlineEntry[] = []
  let after: string | null = null

  for (let page = 0; page < OUTLINE_MAX_PAGES; page += 1) {
    const data: RawOutlinePage = await graphqlQuery<RawOutlinePage>(
      OUTLINE_QUERY,
      {
        documentId,
        maxDepth: OUTLINE_MAX_DEPTH,
        first: OUTLINE_PAGE_SIZE,
        after,
      },
      { operationName: 'legalDocumentOutline', auth: 'none', signal },
    )

    const connection = data.legalDocumentOutline
    for (const raw of connection.entries) {
      entries.push(legalOutlineEntrySchema.parse(raw))
    }

    if (connection.next === null || connection.entries.length === 0) {
      return entries
    }
    after = connection.next
  }

  // Tripping the fuse means either a cursor bug or a document beyond anything
  // in the corpus; serving a silently truncated TOC would be worse than none.
  throw new Error(
    `legalDocumentOutline for ${documentId} did not exhaust after ${OUTLINE_MAX_PAGES} pages`,
  )
}
