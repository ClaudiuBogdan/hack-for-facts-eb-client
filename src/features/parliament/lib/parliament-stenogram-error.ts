/**
 * The four failure states a stenogram read can be in, kept DISTINCT.
 *
 * Collapsing them is the expensive mistake on this surface: "this sitting does
 * not exist", "this sitting exists but yields no reading", "the search index is
 * down" and "we could not reach the API" are four different facts, and three of
 * them leave the record's existence an open question. Telling a reader that a
 * real plenary sitting does not exist because a proxy hiccuped is the worst
 * answer a public-accountability surface can give — and it also hides the
 * outage from us.
 *
 * The vocabulary is the server's own: the parliament module maps its typed
 * errors to `extensions.code` (`NOT_FOUND`, `TRANSCRIPT_UNAVAILABLE` +
 * `reason`, `SEARCH_UNAVAILABLE`) identically on GraphQL, REST and MCP, so this
 * classifier reads codes rather than pattern-matching messages.
 */
import {
  ParliamentStenogramSessionRefSchema,
  type ParliamentStenogramSessionRef,
} from '@/schemas/parliament'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'

/** Why a real sitting yields no reading — the server's `reason` taxonomy. */
export type ParliamentTranscriptUnavailableReason =
  | 'source_only'
  | 'no_public_segments'
  | 'projection_unavailable'

export type ParliamentStenogramFailureKind =
  /** No such sitting/contribution — or it is not public. Terminal. */
  | 'not_found'
  /** The sitting is REAL; the reading is not served. `reason` says whether that is permanent. */
  | 'transcript_unavailable'
  /** The full-history search projection is unavailable. Never silently narrowed. */
  | 'search_unavailable'
  /** The API answered, and answered with an error. */
  | 'graphql'
  /** We never got a usable answer: network, proxy, non-JSON, upstream 5xx. */
  | 'transport'

export interface ParliamentStenogramFailure {
  readonly kind: ParliamentStenogramFailureKind
  /** Present only on `transcript_unavailable`. */
  readonly reason?: ParliamentTranscriptUnavailableReason
  readonly sessionKey?: string
  /**
   * The sitting itself, when the server holds it. Served alongside
   * `TRANSCRIPT_UNAVAILABLE` — and it is what makes that state ACTIONABLE:
   * the reader renders the real title, chamber, date and official link for a
   * SOURCE_ONLY capture instead of a bare apology, and without a second
   * request that would only fail the same way.
   */
  readonly session?: ParliamentStenogramSessionRef
  /** HTTP status when the failure happened at the transport layer. */
  readonly status?: number
  /** Raw message — for logs and the technical detail line, never the headline. */
  readonly message: string
  /**
   * Is a retry meaningful? A SOURCE_ONLY capture will never grow a transcript,
   * so offering "try again" there is a lie; a missing projection or a dead
   * proxy is an operational gap that may well be gone in ten seconds.
   */
  readonly retryable: boolean
}

const TRANSCRIPT_REASONS = new Set<ParliamentTranscriptUnavailableReason>([
  'source_only',
  'no_public_segments',
  'projection_unavailable',
])

function readReason(
  extensions: Record<string, unknown> | undefined,
): ParliamentTranscriptUnavailableReason | undefined {
  const raw = extensions?.['reason']
  return typeof raw === 'string' &&
    TRANSCRIPT_REASONS.has(raw as ParliamentTranscriptUnavailableReason)
    ? (raw as ParliamentTranscriptUnavailableReason)
    : undefined
}

function readSessionKey(
  extensions: Record<string, unknown> | undefined,
): string | undefined {
  const raw = extensions?.['sessionKey']
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined
}

/**
 * The sitting ref that rides along with a `TRANSCRIPT_UNAVAILABLE`. Parsed
 * leniently: a malformed ref must degrade to "no ref" (the generic message),
 * never take down the error path that is already reporting a problem.
 */
function readSessionRef(
  value: unknown,
): ParliamentStenogramSessionRef | undefined {
  if (value === null || value === undefined) return undefined
  const parsed = ParliamentStenogramSessionRefSchema.safeParse(
    normalizeRefNulls(value),
  )
  return parsed.success ? parsed.data : undefined
}

/** The wire form uses `null` for absent optionals; the domain shape omits them. */
function normalizeRefNulls(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([, entry]) => entry !== null,
    ),
  )
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : 'Unknown error'
}

/**
 * Map a thrown transport/GraphQL error onto the four states above.
 *
 * Ordering matters: a typed module code wins over the HTTP status, because the
 * server deliberately answers `TRANSCRIPT_UNAVAILABLE` with a 409/503 and we
 * must report the FACT (a SOURCE_ONLY capture), not the envelope.
 */
export function classifyStenogramError(
  error: unknown,
): ParliamentStenogramFailure {
  const message = messageOf(error)

  if (error instanceof GraphQLRequestError) {
    for (const entry of error.graphQLErrors) {
      const code = entry?.extensions?.['code']
      if (code === 'NOT_FOUND') {
        return { kind: 'not_found', message: entry.message, retryable: false }
      }
      if (code === 'TRANSCRIPT_UNAVAILABLE') {
        const reason = readReason(entry.extensions)
        const session = readSessionRef(entry.extensions?.['session'])
        return {
          kind: 'transcript_unavailable',
          ...(reason && { reason }),
          ...(readSessionKey(entry.extensions) && {
            sessionKey: readSessionKey(entry.extensions),
          }),
          ...(session && { session }),
          message: entry.message,
          // A blank capture and a sitting with no public blocks are permanent
          // facts about the source; only a missing projection is operational.
          retryable: reason === 'projection_unavailable',
        }
      }
      if (code === 'SEARCH_UNAVAILABLE') {
        return {
          kind: 'search_unavailable',
          message: entry.message,
          retryable: true,
        }
      }
      // Codes minted by our own SSR proxy when it could not reach the API at
      // all (see `routes/api/v1/graphql.ts`). They arrive in GraphQL clothing
      // so the transport can parse them, but they are TRANSPORT facts — the
      // API never answered, so nothing is known about the record.
      if (code === 'UPSTREAM_UNAVAILABLE' || code === 'PROXY_MISCONFIGURED') {
        return {
          kind: 'transport',
          ...(error.status !== undefined && { status: error.status }),
          message: entry.message,
          retryable: true,
        }
      }
    }

    // An `errors[]` we do not have a state for: the API answered and refused.
    // Distinct from transport — retrying an INVALID_INPUT changes nothing, but
    // we cannot prove that in general, so it stays retryable-with-a-caveat.
    if (error.graphQLErrors.length > 0) {
      return {
        kind: 'graphql',
        ...(error.status !== undefined && { status: error.status }),
        message,
        retryable: true,
      }
    }

    return {
      kind: 'transport',
      ...(error.status !== undefined && { status: error.status }),
      message,
      retryable: true,
    }
  }

  return { kind: 'transport', message, retryable: true }
}

/**
 * A `not_found` raised as a THROWN error, so a null-returning fetcher and an
 * error-returning one land on the same UI branch.
 */
export class ParliamentStenogramNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParliamentStenogramNotFoundError'
  }
}

/**
 * A failure already classified at the boundary that produced it — the REST
 * transcript client throws these so the React layer never re-derives a state
 * that the envelope already stated plainly.
 */
export class ParliamentStenogramFailureError extends Error {
  constructor(readonly failure: ParliamentStenogramFailure) {
    super(failure.message)
    this.name = 'ParliamentStenogramFailureError'
  }
}

export function classifyStenogramFailure(
  error: unknown,
): ParliamentStenogramFailure {
  if (error instanceof ParliamentStenogramFailureError) return error.failure
  if (error instanceof ParliamentStenogramNotFoundError) {
    return { kind: 'not_found', message: error.message, retryable: false }
  }
  return classifyStenogramError(error)
}

/**
 * Classify the REST transcript endpoint's TYPED ERROR ENVELOPE.
 *
 * The REST surface reports the same fact with the same name as GraphQL and MCP
 * (`error` here is the vocabulary GraphQL puts in `extensions.code`), so this
 * reads the code and not the HTTP status: the server deliberately answers
 * `TRANSCRIPT_UNAVAILABLE` with a 409 or a 503 depending on `reason`, and the
 * FACT — a blank capture — is what the reader must be told, not the envelope.
 *
 * The status is only consulted when the body carries no usable code at all, in
 * which case something between us and the API answered instead of the API.
 */
export function classifyTranscriptEnvelope(
  status: number,
  body: unknown,
): ParliamentStenogramFailure {
  const envelope =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)
      : {}
  const code = envelope['error']
  const message =
    typeof envelope['message'] === 'string' && envelope['message'].length > 0
      ? envelope['message']
      : `Transcript request failed with status ${String(status)}`

  if (code === 'NOT_FOUND') {
    return { kind: 'not_found', message, retryable: false }
  }

  if (code === 'TRANSCRIPT_UNAVAILABLE') {
    const rawReason = envelope['reason']
    const reason =
      typeof rawReason === 'string' &&
      TRANSCRIPT_REASONS.has(rawReason as ParliamentTranscriptUnavailableReason)
        ? (rawReason as ParliamentTranscriptUnavailableReason)
        : undefined
    const session = readSessionRef(envelope['session'])
    const sessionKey = envelope['sessionKey']
    return {
      kind: 'transcript_unavailable',
      ...(reason && { reason }),
      ...(typeof sessionKey === 'string' && sessionKey.length > 0 && {
        sessionKey,
      }),
      ...(session && { session }),
      message,
      retryable: reason === 'projection_unavailable',
    }
  }

  if (code === 'SEARCH_UNAVAILABLE') {
    return { kind: 'search_unavailable', message, retryable: true }
  }

  // A recognised module code we have no dedicated state for (INVALID_INPUT,
  // INTERNAL_SERVER_ERROR, …): the API answered and refused.
  if (typeof code === 'string' && code.length > 0) {
    return { kind: 'graphql', status, message, retryable: status >= 500 }
  }

  // No envelope at all — an HTML error page, a proxy, a gateway. We never
  // reached the API, so nothing is known about the sitting.
  return { kind: 'transport', status, message, retryable: true }
}
