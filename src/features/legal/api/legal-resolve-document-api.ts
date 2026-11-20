import { isLegalMockEnabled } from '../lib/mock-mode'
import { resolveLegalDocumentLive } from './legal-resolve-document-api.live'
import { resolveLegalDocumentMock } from './legal-resolve-document-api.mock'

/** Mock/live dispatcher for `LegalAct.resolveDocument` (legal_v2 page ids). */
export async function resolveLegalDocument(
  actId: string,
  documentId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  if (isLegalMockEnabled()) return resolveLegalDocumentMock()
  return resolveLegalDocumentLive(actId, documentId, signal)
}
