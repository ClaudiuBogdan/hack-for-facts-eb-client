/**
 * Live adapter for the GLOBAL stenograme surface (root `parliamentSpeeches` /
 * `parliamentSpeechActivity` / `parliamentSpeech`). Kept beside the mock twin
 * (`parliament-speeches-api.mock.ts`) instead of growing the 800-line
 * `parliament-api.live.ts`; same transport + parse + map pipeline.
 *
 * The list root is NULLABLE on the server (H2 guard convention): a guard error
 * (unbounded window, bad cursor) resolves the field to null — surfaced here as
 * a thrown error so TanStack Query shows the standard error state instead of a
 * silent empty list.
 */
import type {
  ParliamentSpeech,
  ParliamentSpeechActivity,
  ParliamentSpeechesList,
} from '@/schemas/parliament'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type { ParliamentSpeechesFilterInput } from '../lib/parliament-speeches-filter'
import {
  PARLIAMENT_SPEECH_ACTIVITY_QUERY,
  PARLIAMENT_SPEECH_QUERY,
  PARLIAMENT_SPEECHES_QUERY,
  parliamentSpeechActivityResponseSchema,
  parliamentSpeechesResponseSchema,
  parliamentSpeechResponseSchema,
} from './graphql/parliament-speeches-queries'
import {
  mapParliamentSpeech,
  mapParliamentSpeeches,
  mapParliamentSpeechActivity,
} from './graphql/parliament-speeches-mappers'

const SPEECHES_PAGE_SIZE = 20

export async function fetchParliamentSpeechesLive(
  after?: string,
  filter?: ParliamentSpeechesFilterInput,
  q?: string,
): Promise<ParliamentSpeechesList> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_SPEECHES_QUERY,
    // Omit `after` on page 1 (a null cursor is malformed); omit `filter`/`q`
    // when unset so the server sees a clean query.
    {
      first: SPEECHES_PAGE_SIZE,
      ...(after !== undefined && { after }),
      ...(filter ? { filter } : {}),
      ...(q ? { q } : {}),
    },
    { operationName: 'parliamentSpeeches' },
  )
  const parsed = parliamentSpeechesResponseSchema.parse(data)
  if (!parsed.parliamentSpeeches) {
    // Null root = a server-side guard refused the query (H2). The filter
    // builder always sends a bounded window, so this indicates a contract bug
    // worth surfacing, not an empty result.
    throw new Error('parliamentSpeeches was refused by the server guard')
  }
  return mapParliamentSpeeches(parsed.parliamentSpeeches)
}

export async function fetchParliamentSpeechActivityLive(
  year: number,
  filter?: ParliamentSpeechesFilterInput,
  q?: string,
): Promise<ParliamentSpeechActivity | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_SPEECH_ACTIVITY_QUERY,
    { year, ...(filter ? { filter } : {}), ...(q ? { q } : {}) },
    { operationName: 'parliamentSpeechActivity' },
  )
  const parsed = parliamentSpeechActivityResponseSchema.parse(data)
  if (!parsed.parliamentSpeechActivity) return null
  return mapParliamentSpeechActivity(parsed.parliamentSpeechActivity)
}

export async function fetchParliamentSpeechDetailLive(
  speechKey: string,
): Promise<ParliamentSpeech | null> {
  const data = await graphqlQuery<unknown>(
    PARLIAMENT_SPEECH_QUERY,
    { speechKey },
    { operationName: 'parliamentSpeech' },
  )
  const parsed = parliamentSpeechResponseSchema.parse(data)
  if (!parsed.parliamentSpeech) return null
  return mapParliamentSpeech(parsed.parliamentSpeech)
}
