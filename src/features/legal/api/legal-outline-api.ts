import type { LegalOutlineEntry } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalOutlineLive } from './legal-outline-api.live'
import { fetchLegalOutlineMock } from './legal-outline-api.mock'

/**
 * Mock/live dispatcher for a document's outline (the reader TOC + `?nod=`
 * resolution substrate). Both lanes resolve to the complete entry list —
 * keyset paging is an adapter detail, never a consumer concern.
 */
export async function fetchLegalOutline(
  documentId: string,
  signal?: AbortSignal,
): Promise<LegalOutlineEntry[]> {
  if (isLegalMockEnabled()) return fetchLegalOutlineMock(documentId)
  return fetchLegalOutlineLive(documentId, signal)
}
