/**
 * The failure states a TLDF render read can be in, kept DISTINCT — the
 * stenogram reader's discipline applied to law text.
 *
 * "This document does not exist", "we hold this act but no servable text",
 * "the text is restricted", "the stored artifact is inconsistent" and "we
 * never got a usable answer" are five different facts. Three of them are
 * content the reader must render honestly (with the portal link as the
 * escape hatch), and only the transport one may offer a retry.
 *
 * The vocabulary is the server's own error envelope
 * (`NOT_FOUND` / `RENDER_RESTRICTED` / `RENDER_UNAVAILABLE` + renderStatus /
 * `RENDER_INCONSISTENT`), so this classifier reads codes, never messages.
 */

import { legalRenderErrorEnvelopeSchema } from './tldf/schemas'

export type LegalRenderFailureKind =
  /** No generation for this document id (or no such chunk). Terminal. */
  | 'not_found'
  /** The act is real; its text is restricted. Metadata stays public. Terminal. */
  | 'restricted'
  /** The act is real; no servable text (`renderStatus` says which state). */
  | 'unavailable'
  /** Stored rows violate the layout invariants; the server refused a partial reading. */
  | 'inconsistent'
  /** Network, proxy, non-JSON, unexpected 5xx — the record's existence is an OPEN question. */
  | 'transport'

export interface LegalRenderFailure {
  readonly kind: LegalRenderFailureKind
  /** On `unavailable`: 'content_unavailable' | 'superseded_pending'. */
  readonly renderStatus?: string
  readonly documentId?: string
  readonly status?: number
  /** For logs and the technical detail line, never the headline. */
  readonly message: string
  /**
   * A dead proxy may be gone in ten seconds; a content_unavailable document
   * will not grow a text on retry — offering "încearcă din nou" there is a lie.
   */
  readonly retryable: boolean
}

export class LegalRenderFailureError extends Error {
  readonly failure: LegalRenderFailure

  constructor(failure: LegalRenderFailure) {
    super(failure.message)
    this.name = 'LegalRenderFailureError'
    this.failure = failure
  }
}

/** Classify a non-2xx render response from its module error envelope. */
export function classifyRenderFailure(
  status: number,
  body: unknown,
  documentId: string,
): LegalRenderFailure {
  const parsed = legalRenderErrorEnvelopeSchema.safeParse(body)
  const code = parsed.success ? parsed.data.error : undefined
  const message = parsed.success ? parsed.data.message : `render request failed (${status})`

  if (status === 404 && code === 'NOT_FOUND') {
    return { kind: 'not_found', documentId, status, message, retryable: false }
  }
  if (status === 403 && code === 'RENDER_RESTRICTED') {
    return { kind: 'restricted', documentId, status, message, retryable: false }
  }
  if (status === 409 && code === 'RENDER_UNAVAILABLE') {
    return {
      kind: 'unavailable',
      documentId,
      status,
      message,
      retryable: false,
      ...(parsed.success && parsed.data.renderStatus !== undefined && {
        renderStatus: parsed.data.renderStatus,
      }),
    }
  }
  if (status === 409 && code === 'RENDER_INCONSISTENT') {
    // An inconsistency is a lane defect being repaired, not a permanent fact
    // about the act — a later generation may serve cleanly.
    return { kind: 'inconsistent', documentId, status, message, retryable: true }
  }
  // Anything else — 5xx, an unknown code, a proxy page — is transport: the
  // document's existence is an open question and must never read as absence.
  return { kind: 'transport', documentId, status, message, retryable: true }
}
