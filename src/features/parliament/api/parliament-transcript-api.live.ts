/**
 * The document reader's transport: the CACHEABLE full-transcript REST endpoint.
 *
 *   GET /api/v1/parliament/stenograms/:sessionKey/transcript
 *
 * WHY NOT GRAPHQL. This surface used to page `parliamentStenogramSession`
 * (offset/limit) and stitch the pages together in the component. That is the
 * wrong shape for a reading surface, in a way that is worse than slow: the
 * reader offers find-in-document, print and citation, and every one of those
 * silently operates on whatever prefix happened to have arrived. A reader who
 * searches a sitting and gets "no results" has been told something false.
 *
 * The endpoint takes NO pagination by design — it pages the repository
 * internally and ERRORS rather than truncating — so one 200 is one whole
 * sitting, `meta.complete` is a claim it can keep, and the client has no
 * partial state to get wrong. It also brings its own previous/next sitting
 * navigation, replacing the ±120-day client-side window that could miss a
 * neighbour across a recess.
 *
 * `ETag` / `Cache-Control` come for free on this route; the browser HTTP cache
 * handles revalidation, which a POSTed GraphQL query cannot express.
 */
import { getApiBaseUrl } from '@/config/env'
import { API_FETCH_REFERRER_POLICY } from '@/lib/api/fetch-options'
import { createLogger } from '@/lib/logger'
import {
  ParliamentStenogramTranscriptSchema,
  type ParliamentStenogramTranscript,
} from '@/schemas/parliament'
import {
  classifyTranscriptEnvelope,
  ParliamentStenogramFailureError,
} from '../lib/parliament-stenogram-error'
import { mapTranscriptEnvelope } from './graphql/parliament-stenograms-mappers'

const logger = createLogger('parliament-transcript')

export const TRANSCRIPT_ENDPOINT = '/api/v1/parliament/stenograms'

export function transcriptUrl(sessionKey: string): string {
  // The key contains `:` separators and can carry other reserved characters;
  // encode it as a single path segment rather than trusting it to be URL-safe.
  return `${getApiBaseUrl()}${TRANSCRIPT_ENDPOINT}/${encodeURIComponent(
    sessionKey,
  )}/transcript`
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
 * Fetch one complete sitting.
 *
 * Every failure leaves as a `ParliamentStenogramFailureError` carrying an
 * already-classified state, so the reader branches on a fact rather than
 * re-deriving one from a status code. A network failure is a TRANSPORT
 * failure — it must never surface as "this sitting does not exist".
 */
export async function fetchParliamentTranscriptLive(
  sessionKey: string,
  options: { readonly signal?: AbortSignal } = {},
): Promise<ParliamentStenogramTranscript> {
  let response: Response
  try {
    response = await fetch(transcriptUrl(sessionKey), {
      method: 'GET',
      referrerPolicy: API_FETCH_REFERRER_POLICY,
      headers: { Accept: 'application/json' },
      ...(options.signal && { signal: options.signal }),
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    logger.error('Transcript transport error', { sessionKey, message })
    throw new ParliamentStenogramFailureError({
      kind: 'transport',
      message: `Transcript request failed: ${message}`,
      retryable: true,
    })
  }

  const raw = await response.text()
  const body = parseJsonSafely(raw)

  if (!response.ok) {
    const failure = classifyTranscriptEnvelope(response.status, body)
    logger.error('Transcript read failed', {
      sessionKey,
      status: response.status,
      kind: failure.kind,
    })
    throw new ParliamentStenogramFailureError(failure)
  }

  if (typeof body !== 'object' || body === null) {
    throw new ParliamentStenogramFailureError({
      kind: 'transport',
      status: response.status,
      message: 'Transcript response was not valid JSON',
      retryable: true,
    })
  }

  return ParliamentStenogramTranscriptSchema.parse(
    mapTranscriptEnvelope(body as Record<string, unknown>),
  )
}
