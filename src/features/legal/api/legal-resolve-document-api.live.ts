import { graphqlQuery } from '@/lib/graphql/graphql-client'

/**
 * `LegalAct.resolveDocument(documentId)` — the server's ACT-SCOPED lookup of
 * an old Portal page id (legal_v2): the act's form that page shows, through
 * the page's preferred route, loaded or not; null when the page names no form
 * of this act. The reader still checks the answer is one of the act's
 * versions before reading it (I-17).
 */
const RESOLVE_DOCUMENT_QUERY = /* GraphQL */ `
  query LegalResolveDocument($actId: BigInt!, $documentId: String!) {
    legalAct(actId: $actId) {
      actId
      resolveDocument(documentId: $documentId)
    }
  }
`

export async function resolveLegalDocumentLive(
  actId: string,
  documentId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const data = await graphqlQuery<{
    legalAct: { resolveDocument?: unknown } | null
  }>(
    RESOLVE_DOCUMENT_QUERY,
    { actId, documentId },
    { operationName: 'legalResolveDocument', auth: 'none', signal },
  )
  const resolved = data.legalAct?.resolveDocument
  return typeof resolved === 'string' && resolved.length > 0 ? resolved : null
}
