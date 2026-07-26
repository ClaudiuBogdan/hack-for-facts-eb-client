/**
 * GraphQL documents + raw-response Zod schemas for the CANONICAL stenogram
 * surface (`parliamentStenogramSessions` / `parliamentStenogramSession` /
 * `parliamentSpeechContext`).
 *
 * Server contract notes:
 *  - The sittings list needs NO boundedness argument (one row per capture, on
 *    an indexed date) — unlike `parliamentSpeeches`.
 *  - `q` on the sittings list is a FULL-HISTORY search over the canonical
 *    transcript projection. When that projection is unavailable the field
 *    returns `SEARCH_UNAVAILABLE` in `errors[]` and resolves null; it never
 *    silently degrades to a title-only match. The client must NOT paper over
 *    that — see `classifyStenogramError`.
 *  - The transcript read returns typed errors in `errors[]`: `NOT_FOUND` and
 *    `TRANSCRIPT_UNAVAILABLE` (+ `reason`).
 *  - `parliamentSpeechContext` returns null — never an error — for an unknown
 *    or not-yet-mapped key, and accepts LEGACY `cdep:`/`senat:` keys.
 *
 * WHY `member` IS NOT SELECTED ON SEGMENTS. `ParliamentStenogramSegment.member`
 * is a lazy per-block resolver (one `findMember` per block). A sitting is
 * hundreds of blocks, so selecting it would turn one transcript read into
 * hundreds of member lookups. The block already carries `mandateKey` (the link
 * target) and `speakerName` as printed (the label), which is exactly what the
 * reader renders — and `speakerName` is the honest label anyway, since a
 * roster-resolved identity is not what the transcript printed.
 */
import { z } from 'zod'

const SESSION_FIELDS = /* GraphQL */ `
  sessionKey
  chamber
  sessionDate
  sessionDateSource
  title
  sourceSystem
  availability
  sourceUrl
  sourceUrlKind
  sittingKey
  presidingText
  startTimeText
  endTimeText
  segmentCount
  speechCount
  speakerCount
  sourceUpdatedAt
  canonicalDigest
  captureDigest
`

/** A sitting as a navigation target — the server's `ParliamentStenogramSessionRef`. */
const SESSION_REF_FIELDS = /* GraphQL */ `
  sessionKey
  chamber
  sessionDate
  title
  availability
  sourceUrl
  sourceUrlKind
`

const SEGMENT_FIELDS = /* GraphQL */ `
  segmentKey
  sessionKey
  position
  kind
  text
  textChars
  speakerName
  speakerRef
  mandateKey
  speechKey
  agendaRef
  sourceUrl
  sourceUrlKind
`

export const PARLIAMENT_STENOGRAM_SESSIONS_QUERY = /* GraphQL */ `
  query ParliamentStenogramSessions(
    $first: Int
    $after: String
    $filter: ParliamentStenogramSessionsFilter
    $q: String
  ) {
    parliamentStenogramSessions(
      first: $first
      after: $after
      filter: $filter
      q: $q
    ) {
      total
      totalEstimated
      edges {
        cursor
        node { ${SESSION_FIELDS} }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

export const rawStenogramSessionSchema = z.object({
  sessionKey: z.string(),
  chamber: z.string(),
  sessionDate: z.string().nullable(),
  sessionDateSource: z.string(),
  title: z.string().nullable(),
  sourceSystem: z.string(),
  availability: z.enum(['COMPLETE', 'PARTIAL', 'SOURCE_ONLY']),
  sourceUrl: z.string(),
  sourceUrlKind: z.string(),
  sittingKey: z.string().nullable(),
  presidingText: z.string().nullable(),
  startTimeText: z.string().nullable(),
  endTimeText: z.string().nullable(),
  segmentCount: z.number(),
  speechCount: z.number(),
  speakerCount: z.number(),
  sourceUpdatedAt: z.string().nullable(),
  canonicalDigest: z.string().nullable().optional(),
  captureDigest: z.string().nullable().optional(),
})
export type RawStenogramSession = z.infer<typeof rawStenogramSessionSchema>

export const parliamentStenogramSessionsResponseSchema = z.object({
  parliamentStenogramSessions: z
    .object({
      total: z.number(),
      totalEstimated: z.boolean(),
      edges: z.array(
        z.object({ cursor: z.string(), node: rawStenogramSessionSchema }),
      ),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().nullable(),
      }),
    })
    .nullable(),
})

export const rawStenogramSegmentSchema = z.object({
  segmentKey: z.string(),
  sessionKey: z.string(),
  position: z.number(),
  kind: z.enum(['SPEECH', 'AGENDA_HEADING', 'VOTE_RESULT', 'CONTEXT']),
  text: z.string(),
  textChars: z.number(),
  speakerName: z.string().nullable(),
  speakerRef: z.string().nullable(),
  mandateKey: z.string().nullable(),
  /**
   * NOT selected by this client (see the note at the top of the file), but
   * carried through when a caller that DOES resolve it hands us a block — the
   * reader's speaker line reads the mandate from either place, so the mapper
   * must not be the thing that drops it.
   */
  member: z
    .object({
      mandateKey: z.string(),
      fullName: z.string(),
      chamber: z.string().nullable().optional(),
      groupName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  speechKey: z.string().nullable(),
  agendaRef: z.string().nullable(),
  sourceUrl: z.string(),
  sourceUrlKind: z.string(),
})
export type RawStenogramSegment = z.infer<typeof rawStenogramSegmentSchema>

export const PARLIAMENT_STENOGRAM_SESSION_QUERY = /* GraphQL */ `
  query ParliamentStenogramSession(
    $sessionKey: ID!
    $offset: Int
    $limit: Int
  ) {
    parliamentStenogramSession(
      sessionKey: $sessionKey
      offset: $offset
      limit: $limit
    ) {
      totalSegments
      session { ${SESSION_FIELDS} }
      segments { ${SEGMENT_FIELDS} }
      navigation {
        previous { ${SESSION_REF_FIELDS} }
        next { ${SESSION_REF_FIELDS} }
      }
    }
  }
`

const rawStenogramSessionRefSchema = z.object({
  sessionKey: z.string(),
  chamber: z.string(),
  sessionDate: z.string().nullable(),
  title: z.string().nullable(),
  availability: z.enum(['COMPLETE', 'PARTIAL', 'SOURCE_ONLY']),
  sourceUrl: z.string(),
  sourceUrlKind: z.string(),
})

const rawSittingNavigationSchema = z.object({
  previous: rawStenogramSessionRefSchema.nullable(),
  next: rawStenogramSessionRefSchema.nullable(),
})

export const parliamentStenogramSessionResponseSchema = z.object({
  parliamentStenogramSession: z
    .object({
      totalSegments: z.number(),
      session: rawStenogramSessionSchema,
      segments: z.array(rawStenogramSegmentSchema),
      navigation: rawSittingNavigationSchema,
    })
    .nullable(),
})

export const PARLIAMENT_SPEECH_CONTEXT_QUERY = /* GraphQL */ `
  query ParliamentSpeechContext($speechKey: ID!) {
    parliamentSpeechContext(speechKey: $speechKey) {
      speechKey
      session { ${SESSION_FIELDS} }
      segment { ${SEGMENT_FIELDS} }
      previousContribution { ${SEGMENT_FIELDS} }
      nextContribution { ${SEGMENT_FIELDS} }
      redirect {
        legacySpeechKey
        sessionKey
        canonicalSpeechKey
        canonicalSegmentKey
        canonicalPosition
        mappingKind
        matchMethod
      }
    }
  }
`

export const rawSpeechRedirectSchema = z.object({
  legacySpeechKey: z.string(),
  sessionKey: z.string(),
  canonicalSpeechKey: z.string().nullable(),
  canonicalSegmentKey: z.string().nullable(),
  canonicalPosition: z.number().nullable(),
  mappingKind: z.string(),
  matchMethod: z.string(),
})
export type RawSpeechRedirect = z.infer<typeof rawSpeechRedirectSchema>

export const rawSpeechContextSchema = z.object({
  speechKey: z.string(),
  session: rawStenogramSessionSchema,
  segment: rawStenogramSegmentSchema.nullable(),
  previousContribution: rawStenogramSegmentSchema.nullable(),
  nextContribution: rawStenogramSegmentSchema.nullable(),
  redirect: rawSpeechRedirectSchema.nullable(),
})
export type RawSpeechContext = z.infer<typeof rawSpeechContextSchema>

export const parliamentSpeechContextResponseSchema = z.object({
  parliamentSpeechContext: rawSpeechContextSchema.nullable(),
})
