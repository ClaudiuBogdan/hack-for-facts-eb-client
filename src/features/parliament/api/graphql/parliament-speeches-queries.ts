/**
 * GraphQL documents + raw-response Zod schemas for the GLOBAL stenograme
 * surface (root `parliamentSpeeches` / `parliamentSpeechActivity` /
 * `parliamentSpeech`). Kept out of the 1000-line `parliament-queries.ts` on
 * purpose — all speech-related GraphQL lives here.
 *
 * Server contract notes (see the plan's reconciliation section):
 *  - The list REFUSES an unbounded query: the client always sends a
 *    `mandateKey` bound or a full `spokenAt` window (year window by default).
 *  - `total` is capped at 10 000 (`totalEstimated: true` beyond that).
 *  - `searchDepth` reports what `q` actually searched (TITLE_SUMMARY vs
 *    FULL_TEXT) — the depth notice renders from this, not from a client guess.
 *  - `fullText` is selected inline (measured avg ~591 chars — cheaper than a
 *    per-turn round-trip; same rationale as the member connection).
 */
import { z } from 'zod'

export const PARLIAMENT_SPEECHES_QUERY = /* GraphQL */ `
  query ParliamentSpeeches(
    $first: Int
    $after: String
    $filter: ParliamentSpeechesFilter
    $q: String
  ) {
    parliamentSpeeches(first: $first, after: $after, filter: $filter, q: $q) {
      total
      totalEstimated
      searchDepth
      edges {
        cursor
        node {
          speechKey
          spokenAt
          title
          summary
          chamber
          sourceUrl
          sourceUrlKind
          fullText
          isCanonical
          sessionKey
          position
          speakerName
          member {
            mandateKey
            fullName
            chamber
            groupName
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

const rawSpeechMemberSchema = z.object({
  mandateKey: z.string(),
  fullName: z.string().nullable(),
  chamber: z.string().nullable(),
  groupName: z.string().nullable(),
})
export type RawParliamentSpeechMember = z.infer<typeof rawSpeechMemberSchema>

export const rawParliamentSpeechSchema = z.object({
  speechKey: z.string(),
  spokenAt: z.string().nullable(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  chamber: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  sourceUrlKind: z.string().nullable(),
  fullText: z.string().nullable(),
  /**
   * Canonical pointers. `isCanonical` is non-null on the server but is read
   * defensively here: a database without the canonical stenogram migration
   * serves `false`, and an older deployment may not know the field at all —
   * neither may be allowed to mint a sitting link that resolves to nothing.
   */
  isCanonical: z.boolean().nullable().optional(),
  sessionKey: z.string().nullable().optional(),
  position: z.number().nullable().optional(),
  speakerName: z.string().nullable(),
  /** Null for unmatched speakers (PM, guests) — real data, kept in the list. */
  member: rawSpeechMemberSchema.nullable(),
})
export type RawParliamentSpeech = z.infer<typeof rawParliamentSpeechSchema>

const rawSearchDepthSchema = z.enum(['TITLE_SUMMARY', 'FULL_TEXT'])

export const parliamentSpeechesResponseSchema = z.object({
  parliamentSpeeches: z
    .object({
      total: z.number(),
      totalEstimated: z.boolean(),
      searchDepth: rawSearchDepthSchema.nullable(),
      edges: z.array(
        z.object({ cursor: z.string(), node: rawParliamentSpeechSchema }),
      ),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().nullable(),
      }),
    })
    .nullable(),
})

export const PARLIAMENT_SPEECH_ACTIVITY_QUERY = /* GraphQL */ `
  query ParliamentSpeechActivity(
    $year: Int!
    $filter: ParliamentSpeechesFilter
    $q: String
  ) {
    parliamentSpeechActivity(year: $year, filter: $filter, q: $q) {
      year
      availableYears
      searchDepth
      days {
        date
        total
        proprie
        comun
      }
    }
  }
`

const rawGlobalSpeechActivityDaySchema = z.object({
  date: z.string(),
  total: z.number(),
  proprie: z.number(),
  comun: z.number(),
})

export const rawParliamentSpeechActivitySchema = z.object({
  year: z.number(),
  availableYears: z.array(z.number()),
  searchDepth: rawSearchDepthSchema.nullable(),
  days: z.array(rawGlobalSpeechActivityDaySchema),
})
export type RawParliamentSpeechActivity = z.infer<
  typeof rawParliamentSpeechActivitySchema
>

export const parliamentSpeechActivityResponseSchema = z.object({
  parliamentSpeechActivity: rawParliamentSpeechActivitySchema.nullable(),
})

export const PARLIAMENT_SPEECH_QUERY = /* GraphQL */ `
  query ParliamentSpeech($speechKey: ID!) {
    parliamentSpeech(speechKey: $speechKey) {
      speechKey
      spokenAt
      title
      summary
      chamber
      sourceUrl
      sourceUrlKind
      fullText
      isCanonical
      sessionKey
      position
      speakerName
      member {
        mandateKey
        fullName
        chamber
        groupName
      }
    }
  }
`

export const parliamentSpeechResponseSchema = z.object({
  parliamentSpeech: rawParliamentSpeechSchema.nullable(),
})
