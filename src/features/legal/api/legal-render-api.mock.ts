/**
 * Mock render lane: serves the two COMMITTED REAL TLDF artifacts
 * (`../mocks/fixtures/tldf/`, byte-identical to the scrapper's fixtures) in
 * the exact REST response shape, through the same Zod parse as the live lane.
 *
 *  - `100023` — a single-chunk act (envelope; 11 act marks, six heading kinds).
 *  - `100019` — a chunked act (manifest + 2 chunk groups, 446k chars).
 *
 * Any other document id answers the honest `unavailable` failure — the mock
 * never invents a text for an act we did not fixture, so the reader's
 * "no servable text" state is exercised instead of papered over.
 *
 * Fixtures load via dynamic `import()` so ~2 MB of law text stays out of the
 * main bundle and is fetched only when the mock lane actually renders.
 */

import { LegalRenderFailureError } from '../lib/legal-render-error'
import { legalRenderResponseSchema } from '../lib/tldf/schemas'
import type { LegalRenderData } from '../lib/tldf/schemas'

interface FixtureRow {
  readonly chunk_index: number
  readonly chunk_count: number
  readonly block_id: string | null
  readonly tldf: Record<string, unknown>
}

const FIXTURE_DOCS: Record<string, () => Promise<{ default: FixtureRow[] }>> = {
  '100023': () => import('../mocks/fixtures/tldf/render-rows-100023.json'),
  '100019': () => import('../mocks/fixtures/tldf/render-rows-100019.json'),
}

const kindOf = (row: FixtureRow): 'envelope' | 'manifest' | 'chunk' => {
  if (row.chunk_index > 0) return 'chunk'
  return row.chunk_count === 1 ? 'envelope' : 'manifest'
}

export async function fetchLegalRenderMock(
  documentId: string,
  options: { readonly chunkIndex?: number } = {},
): Promise<LegalRenderData> {
  const load = FIXTURE_DOCS[documentId]
  if (load === undefined) {
    throw new LegalRenderFailureError({
      kind: 'unavailable',
      documentId,
      renderStatus: 'content_unavailable',
      message: `mock lane holds no artifact for document ${documentId}`,
      retryable: false,
    })
  }
  const rows = (await load()).default
  const wanted = options.chunkIndex ?? 0
  const row = rows.find((r) => r.chunk_index === wanted)
  if (row === undefined) {
    throw new LegalRenderFailureError({
      kind: 'not_found',
      documentId,
      message: `mock document ${documentId} has no chunk ${String(wanted)}`,
      retryable: false,
    })
  }

  const head = row.tldf as {
    generation: { run_id: number }
    text_sha256: string
    compiler_version?: string
  }
  // The mock passes through the SAME schema as the live lane, so a fixture
  // that drifts from the contract fails tests instead of rendering anyway.
  const parsed = legalRenderResponseSchema.parse({
    ok: true,
    data: {
      documentId,
      kind: kindOf(row),
      chunkIndex: row.chunk_index,
      chunkCount: row.chunk_count,
      tldf: row.tldf,
    },
    meta: {
      requestId: 'mock',
      runId: String(head.generation.run_id),
      textSha256: head.text_sha256,
      // Chunk rows carry only the DDL-bound head fields; the envelope value
      // is on chunk 0 and identical across the generation.
      compilerVersion: head.compiler_version ?? 'tldf-compiler-v3',
      compiledAt: '2026-08-05T09:00:00.000Z',
    },
  })
  return parsed.data
}
