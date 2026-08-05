import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalRenderLive } from './legal-render-api.live'
import { fetchLegalRenderMock } from './legal-render-api.mock'
import type { LegalRenderData } from '../lib/tldf/schemas'

/**
 * Mock/live dispatcher for the TLDF render read (base = envelope or manifest;
 * with `chunkIndex` = one physical chunk group). Both lanes resolve to the
 * same Zod-validated `LegalRenderData` and both fail as classified
 * `LegalRenderFailureError`s, so the reader is written once.
 */
export async function fetchLegalRender(
  documentId: string,
  options: { readonly chunkIndex?: number; readonly signal?: AbortSignal } = {},
): Promise<LegalRenderData> {
  if (isLegalMockEnabled()) {
    return fetchLegalRenderMock(documentId, options)
  }
  return fetchLegalRenderLive(documentId, options)
}
