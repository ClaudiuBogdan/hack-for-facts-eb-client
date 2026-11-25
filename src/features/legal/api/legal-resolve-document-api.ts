import { isLegalMockEnabled } from '../lib/mock-mode'
import { resolveLegalDocumentLive } from './legal-resolve-document-api.live'

/** Fixtures only in the development server and the tests: in production this is the constant `false`, so the mock is never emitted. */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

/** Mock/live dispatcher for `LegalAct.resolveDocument` (legal_v2 page ids). */
export async function resolveLegalDocument(
  actId: string,
  documentId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-resolve-document-api.mock')).resolveLegalDocumentMock()
  return resolveLegalDocumentLive(actId, documentId, signal)
}
