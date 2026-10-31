import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  ELECTIONS_PAGE_SIZE,
  electionContestPageSchema,
  electionContestSchema,
  electionEventPageSchema,
  electionEventSchema,
  electionResultSchema,
  type ElectionContest,
  type ElectionContestPage,
  type ElectionContestsSearch,
  type ElectionEvent,
  type ElectionEventPage,
  type ElectionResult,
  type ElectionsCatalogSearch,
} from '@/schemas/elections-catalog'

/**
 * The elections pages' reads (server `elections/shell/graphql/schema.ts`):
 * the events, one event with its ballot days, one day's contests, one
 * contest, and the figures of a contest's own place. Each is one request,
 * parsed before the page sees it. A record the API does not have is `null`;
 * a request that fails throws, and is never read as an absent record or an
 * empty list. Filters reach the API exactly as the address holds them.
 *
 * Competitors are read by kind and label only: the pages need no competitor
 * key or reported label, and an independent's key spells a person's name.
 */

const COMPETITOR = 'competitor { kind label }'
const SHARE = 'share { percent }'
const QUALITY = 'value finality geographicCompleteness includesDiaspora status issues'

const EVENT_FIELDS = `
  eventKey family year publication { activatedAt }
  occurrences { occurrenceKey eventKey ballotDate round kind status offices { office contests } }
`

const RACE_ENTRY = `votes ${SHARE} ${COMPETITOR}`

const CONTEST_FIELDS = `
  contestKey occurrenceKey eventKey office status replacedBy
  jurisdiction { placeKey placeType sirutaCode countyCode name countyName }
  race {
    competitorCount status geographicCompleteness finality issues tied marginVotes marginPoints
    leader { ${RACE_ENTRY} } runnerUp { ${RACE_ENTRY} }
  }
`

export const ELECTION_EVENTS_QUERY = /* GraphQL */ `
  query ElectionEvents($page: Int, $pageSize: Int) {
    electionEvents(page: $page, pageSize: $pageSize) {
      items { ${EVENT_FIELDS} }
      page pageSize total hasMore
    }
  }
`

export const ELECTION_EVENT_QUERY = /* GraphQL */ `
  query ElectionEvent($eventKey: ID!) {
    electionEvent(eventKey: $eventKey) { ${EVENT_FIELDS} }
  }
`

export const ELECTION_CONTESTS_QUERY = /* GraphQL */ `
  query ElectionContests($occurrenceKey: ID!, $filter: ElectionContestsFilter, $page: Int, $pageSize: Int) {
    electionContests(occurrenceKey: $occurrenceKey, filter: $filter, page: $page, pageSize: $pageSize) {
      items { ${CONTEST_FIELDS} }
      page pageSize total hasMore
    }
  }
`

export const ELECTION_CONTEST_QUERY = /* GraphQL */ `
  query ElectionContest($contestKey: ID!) {
    electionContest(contestKey: $contestKey) { ${CONTEST_FIELDS} }
  }
`

export const ELECTION_RESULT_QUERY = /* GraphQL */ `
  query ElectionResult($occurrenceKey: ID!, $office: String!, $scopeKey: ID!, $contestKey: ID) {
    electionResult(occurrenceKey: $occurrenceKey, office: $office, scopeKey: $scopeKey, contestKey: $contestKey) {
      tallies { measure allocationPhase countedPopulation ${SHARE} ${COMPETITOR} ${QUALITY} }
      turnout { measure ${QUALITY} }
      participation { percent }
      race { tied marginVotes marginPoints issues }
      coverage { measure allocationPhase placeSpecific state issues }
    }
  }
`

type InFilter<Value> = { readonly in: readonly Value[] }

/** A day's contest filter: each field only when the address sets it, one exact value. */
export function contestsFilterOf(search: ElectionContestsSearch): Record<string, InFilter<string>> {
  return {
    ...(search.functie !== undefined ? { offices: { in: [search.functie] } } : {}),
    ...(search.arie !== undefined ? { jurisdictionTypes: { in: [search.arie] } } : {}),
    ...(search.judet !== undefined ? { countyCodes: { in: [search.judet] } } : {}),
  }
}

const eventsResponseSchema = z.object({ electionEvents: electionEventPageSchema })
const eventResponseSchema = z.object({ electionEvent: electionEventSchema.nullable() })
const contestsResponseSchema = z.object({ electionContests: electionContestPageSchema })
const contestResponseSchema = z.object({ electionContest: electionContestSchema.nullable() })
const resultResponseSchema = z.object({ electionResult: electionResultSchema.nullable() })

export async function fetchElectionEvents(search: ElectionsCatalogSearch, signal?: AbortSignal): Promise<ElectionEventPage> {
  const data = await graphqlQuery<unknown>(
    ELECTION_EVENTS_QUERY,
    { page: search.pagina ?? 1, pageSize: ELECTIONS_PAGE_SIZE },
    { operationName: 'ElectionEvents', signal, auth: 'none' },
  )
  return eventsResponseSchema.parse(data).electionEvents
}

/** `null`: the API has no event with published figures under this key. */
export async function fetchElectionEvent(eventKey: string, signal?: AbortSignal): Promise<ElectionEvent | null> {
  const data = await graphqlQuery<unknown>(ELECTION_EVENT_QUERY, { eventKey }, { operationName: 'ElectionEvent', signal, auth: 'none' })
  return eventResponseSchema.parse(data).electionEvent
}

/** A ballot day the API does not have answers NOT_FOUND here, as an error: the event's own read says which days exist. */
export async function fetchElectionContests(
  occurrenceKey: string,
  search: ElectionContestsSearch,
  signal?: AbortSignal,
): Promise<ElectionContestPage> {
  const data = await graphqlQuery<unknown>(
    ELECTION_CONTESTS_QUERY,
    { occurrenceKey, filter: contestsFilterOf(search), page: search.pagina ?? 1, pageSize: ELECTIONS_PAGE_SIZE },
    { operationName: 'ElectionContests', signal, auth: 'none' },
  )
  return contestsResponseSchema.parse(data).electionContests
}

/** `null`: the API has no contest under this key. */
export async function fetchElectionContest(contestKey: string, signal?: AbortSignal): Promise<ElectionContest | null> {
  const data = await graphqlQuery<unknown>(ELECTION_CONTEST_QUERY, { contestKey }, { operationName: 'ElectionContest', signal, auth: 'none' })
  return contestResponseSchema.parse(data).electionContest
}

/** The contest a result is read for: its day, office and own place, all from the contest's record. */
export type ElectionResultTarget = Pick<ElectionContest, 'contestKey' | 'occurrenceKey' | 'office'> & {
  readonly jurisdiction: Pick<ElectionContest['jurisdiction'], 'placeKey'>
}

/** `null`: the contest's place has no figures (an annulled contest may have none). */
export async function fetchElectionResult(contest: ElectionResultTarget, signal?: AbortSignal): Promise<ElectionResult | null> {
  const data = await graphqlQuery<unknown>(
    ELECTION_RESULT_QUERY,
    { occurrenceKey: contest.occurrenceKey, office: contest.office, scopeKey: contest.jurisdiction.placeKey, contestKey: contest.contestKey },
    { operationName: 'ElectionResult', signal, auth: 'none' },
  )
  return resultResponseSchema.parse(data).electionResult
}
