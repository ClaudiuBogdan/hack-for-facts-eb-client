import { isLegalMockEnabled } from '../lib/mock-mode'
import { fetchLegalRenderLive } from './legal-render-api.live'
import type { LegalRenderData } from '../lib/tldf/schemas'

/** Fixtures only in the development server and the tests: in production this is the constant `false`, so the mock is never emitted. */
const FIXTURE_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'test'

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
  if (FIXTURE_BUILD && isLegalMockEnabled()) {
    return (await import('./legal-render-api.mock')).fetchLegalRenderMock(documentId, options)
  }
  return fetchLegalRenderLive(documentId, options)
}
