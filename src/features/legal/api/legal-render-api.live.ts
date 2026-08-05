/**
 * The reader's transport: the cacheable TLDF render REST endpoints.
 *
 *   GET /api/v1/legal/documents/:documentId/render
 *   GET /api/v1/legal/documents/:documentId/render/chunks/:chunkIndex
 *
 * This is the module's ONE deliberate exception to GraphQL-only transport
 * (the parliament transcript precedent): a rendered act is large, immutable
 * per generation, and wants `ETag` / `Cache-Control` semantics the browser
 * HTTP cache handles for free. The base call returns the complete envelope
 * for a single-chunk document or the physical MANIFEST for a chunked one —
 * never a partial `blocks[]` — and chunk groups are fetched by index.
 *
 * Every failure leaves as a `LegalRenderFailureError` carrying a classified
 * state, so the reader branches on a fact rather than a status code; a
 * network failure must never surface as "this act has no text".
 */

import { getApiBaseUrl } from '@/config/env'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import { createLogger } from '@/lib/logger'
import {
  classifyRenderFailure,
  LegalRenderFailureError,
} from '../lib/legal-render-error'
import { legalRenderResponseSchema } from '../lib/tldf/schemas'
import type { LegalRenderData } from '../lib/tldf/schemas'

const logger = createLogger('legal-render')

export const LEGAL_RENDER_ENDPOINT = '/api/v1/legal/documents'

export function renderUrl(documentId: string, chunkIndex?: number): string {
  const base = `${getApiBaseUrl()}${LEGAL_RENDER_ENDPOINT}/${encodeURIComponent(documentId)}/render`
  return chunkIndex === undefined ? base : `${base}/chunks/${String(chunkIndex)}`
}

function parseJsonSafely(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Fetch the base render (envelope or manifest) or, with `chunkIndex`, one
 * physical chunk group. The Zod parse is deep and kind-discriminated: a
 * mislabeled or malformed payload fails here, never in the renderer.
 */
export async function fetchLegalRenderLive(
  documentId: string,
  options: { readonly chunkIndex?: number; readonly signal?: AbortSignal } = {},
): Promise<LegalRenderData> {
  let response: Response
  try {
    response = await fetch(renderUrl(documentId, options.chunkIndex), {
      method: 'GET',
      referrerPolicy: API_FETCH_REFERRER_POLICY,
      headers: { Accept: 'application/json' },
      ...(options.signal && { signal: options.signal }),
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    logger.error('Render transport error', { documentId, message })
    throw new LegalRenderFailureError({
      kind: 'transport',
      documentId,
      message: `Render request failed: ${message}`,
      retryable: true,
    })
  }

  const raw = await response.text()
  const body = parseJsonSafely(raw)

  if (!response.ok) {
    const failure = classifyRenderFailure(response.status, body, documentId)
    logger.error('Render read failed', {
      documentId,
      status: response.status,
      kind: failure.kind,
    })
    throw new LegalRenderFailureError(failure)
  }

  const parsed = legalRenderResponseSchema.safeParse(body)
  if (!parsed.success) {
    logger.error('Render payload failed validation', {
      documentId,
      issues: parsed.error.issues.slice(0, 3),
    })
    throw new LegalRenderFailureError({
      kind: 'transport',
      documentId,
      status: response.status,
      message: 'Render response did not match the TLDF contract',
      retryable: true,
    })
  }
  return parsed.data.data
}
