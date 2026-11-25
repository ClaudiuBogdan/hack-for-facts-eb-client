import type { LegalOutlineEntry } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalOutlineLive } from './legal-outline-api.live'

/** Fixtures only in the development server and the tests: in production this is the constant `false`, so the mock is never emitted. */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

/**
 * Mock/live dispatcher for a document's outline (the reader TOC + `?nod=`
 * resolution substrate). Both lanes resolve to the complete entry list —
 * keyset paging is an adapter detail, never a consumer concern.
 */
export async function fetchLegalOutline(
  documentId: string,
  signal?: AbortSignal,
): Promise<LegalOutlineEntry[]> {
  if (FIXTURE_BUILD && isLegalMockEnabled()) return (await import('./legal-outline-api.mock')).fetchLegalOutlineMock(documentId)
  return fetchLegalOutlineLive(documentId, signal)
}
