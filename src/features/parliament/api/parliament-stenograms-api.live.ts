/**
 * Live adapter for the canonical stenogram surface.
 *
 * Every failure here is CLASSIFIED, never flattened: the caller gets a
 * `ParliamentStenogramFailure` distinguishing not-found from an unavailable
 * transcript from a dead search projection from a dead transport. See
 * `parliament-stenogram-error.ts` for why that distinction is the point.
 */
import type {
  ParliamentSpeechContext,
  ParliamentStenogramSessionsList,
  ParliamentStenogramTranscript,
} from '@/schemas/parliament'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { ParliamentStenogramNotFoundError } from '../lib/parliament-stenogram-error'
import type { ParliamentStenogramSessionsFilterInput } from '../lib/parliament-stenogram-filter'
import {
  PARLIAMENT_SPEECH_CONTEXT_QUERY,
  PARLIAMENT_STENOGRAM_SESSION_QUERY,
  PARLIAMENT_STENOGRAM_SESSIONS_QUERY,
  parliamentSpeechContextResponseSchema,
  parliamentStenogramSessionResponseSchema,
  parliamentStenogramSessionsResponseSchema,
} from './graphql/parliament-stenograms-queries'
import {
  mapSpeechContext,
  mapStenogramSessions,
  mapStenogramTranscript,
} from './graphql/parliament-stenograms-mappers'

const SESSIONS_PAGE_SIZE = 20

/**
 * Blocks per GraphQL transcript SLICE.
 *
 * This root is explicitly a slice, and the reader does NOT use it — the reader
 * takes the complete document from the REST endpoint
 * (`parliament-transcript-api.live.ts`). This stays for callers that genuinely
 * want a bounded peek at a sitting without pulling the whole thing.
 */
export const TRANSCRIPT_SLICE_SIZE = 500

export async function fetchParliamentStenogramSessionsLive(
  after?: string,
  filter?: ParliamentStenogramSessionsFilterInput,
  q?: string,
): Promise<ParliamentStenogramSessionsList> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_STENOGRAM_SESSIONS_QUERY,
    {
      first: SESSIONS_PAGE_SIZE,
      ...(after !== undefined && { after }),
      ...(filter ? { filter } : {}),
      ...(q ? { q } : {}),
    },
    { operationName: 'parliamentStenogramSessions' },
  )
  const parsed = parliamentStenogramSessionsResponseSchema.parse(data)
  if (!parsed.parliamentStenogramSessions) {
    // A null root with NO errors[] would have thrown in the transport already,
    // so reaching here means the server resolved null without saying why.
    throw new Error('parliamentStenogramSessions resolved null')
  }
  return mapStenogramSessions(parsed.parliamentStenogramSessions)
}

export async function fetchParliamentStenogramTranscriptLive(
  sessionKey: string,
  offset = 0,
  limit = TRANSCRIPT_SLICE_SIZE,
): Promise<ParliamentStenogramTranscript> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_STENOGRAM_SESSION_QUERY,
    { sessionKey, offset, limit },
    { operationName: 'parliamentStenogramSession' },
  )
  const parsed = parliamentStenogramSessionResponseSchema.parse(data)
  if (!parsed.parliamentStenogramSession) {
    // NOT_FOUND / TRANSCRIPT_UNAVAILABLE arrive as typed errors[] and are thrown
    // by the transport with their `extensions.code` intact. A null field with no
    // error is the residual case; treat it as "no such sitting" rather than
    // rendering an empty document.
    throw new ParliamentStenogramNotFoundError(
      `parliamentStenogramSession(${sessionKey}) resolved null`,
    )
  }
  return mapStenogramTranscript(parsed.parliamentStenogramSession)
}

/**
 * Canonical context for a contribution. Returns `null` — never throws — when
 * the key is unknown or the canonical lane has not mapped it yet, mirroring the
 * server: "not mapped" is a real, non-error state that the redirect page has to
 * be able to explain.
 */
export async function fetchParliamentSpeechContextLive(
  speechKey: string,
): Promise<ParliamentSpeechContext | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_SPEECH_CONTEXT_QUERY,
    { speechKey },
    { operationName: 'parliamentSpeechContext' },
  )
  const parsed = parliamentSpeechContextResponseSchema.parse(data)
  if (!parsed.parliamentSpeechContext) return null
  return mapSpeechContext(parsed.parliamentSpeechContext)
}

/**
 * SITTING NAVIGATION IS SERVED, NOT DERIVED.
 *
 * This module used to compute previous/next by scanning a ±120-day window of
 * the sittings connection around the current sitting's date. That was wrong in
 * two ways: it cost an extra round trip, and a neighbour on the far side of a
 * parliamentary recess fell outside the window and rendered as "no neighbour" —
 * indistinguishable from genuinely being the last sitting of its chamber.
 *
 * Both the REST transcript endpoint and the GraphQL root now return
 * `navigation.{previous,next}` computed server-side, so `null` on a side is an
 * authoritative statement rather than the edge of our search. Read it off the
 * transcript; do not reintroduce a client-side scan.
 */
