import { GraphQLRequestError, isAbortError, isGraphQLTimeout } from '@/lib/graphql/graphql-client'
import { createLogger } from '@/lib/logger'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import type {
  ElectionContest,
  ElectionContestPage,
  ElectionContestsSearch,
  ElectionEvent,
  ElectionEventPage,
  ElectionResult,
  ElectionsCatalogSearch,
} from '@/schemas/elections-catalog'
import { selectBallotDay } from '../lib/election-days'
import { fetchElectionContest, fetchElectionContests, fetchElectionEvent, fetchElectionEvents, fetchElectionResult } from './elections-catalog-api'

/**
 * The elections pages' server reads, for the route loaders only.
 *
 * TanStack Start sends no HTML until every loader resolves, so a page's reads
 * share one short deadline: a page with two rounds (an event, then its day's
 * contests; a contest, then its figures) spends it on both. A read that fails
 * or runs past it is left out: the page's own query reads it again in the
 * browser and shows its retry, and the render goes out uncached like every
 * elections render. A superseded request's abort travels on to the router.
 * Nothing is kept between requests.
 */

/** Reads answer in 30–250 ms; a slow API costs the first byte at most this. */
export const SSR_DEADLINE_MS = 1_000

const logger = createLogger('elections-catalog-ssr')

const isNotFound = (error: unknown) =>
  error instanceof GraphQLRequestError && error.graphQLErrors.some((entry) => entry.extensions?.code === 'NOT_FOUND')

/** The read's result, or `undefined` when it failed: a failure is never an absent record or an empty list. */
async function settle<T>(what: string, read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read()
  } catch (error) {
    if (isAbortError(error)) throw error
    // A read past its deadline was logged by the GraphQL client already; a missing day's list is no fault.
    if (!isGraphQLTimeout(error) && !isNotFound(error)) logger.error('Elections server read failed', { what, error })
    return undefined
  }
}

const deadline = (signal: AbortSignal) => withDeadline(signal, SSR_DEADLINE_MS) ?? signal

export async function readElectionEventsForSsr(search: ElectionsCatalogSearch, signal: AbortSignal): Promise<ElectionEventPage | undefined> {
  return settle('events', () => fetchElectionEvents(search, deadline(signal)))
}

export interface ElectionEventServerRead {
  /** `null`: the API has no such event. Absent: the read failed. */
  readonly event?: ElectionEvent | null
  /** The day's first contests, read for this day's key. Absent: the read failed, or the address names no day of the event. */
  readonly contests?: { readonly occurrenceKey: string; readonly page: ElectionContestPage }
}

/** The event, then the contests of the day the address names: a failed contest list never takes the event with it. */
export async function readElectionEventForSsr(eventKey: string, search: ElectionContestsSearch, signal: AbortSignal): Promise<ElectionEventServerRead> {
  const budget = deadline(signal)
  const event = await settle('event', () => fetchElectionEvent(eventKey, budget))
  if (!event) return event === null ? { event: null } : {}
  const day = selectBallotDay(event, search.data)
  if (!day) return { event }
  const page = await settle('contests', () => fetchElectionContests(day.occurrenceKey, search, budget))
  return page ? { event, contests: { occurrenceKey: day.occurrenceKey, page } } : { event }
}

export interface ElectionContestServerRead {
  /** `null`: the API has no such contest. Absent: the read failed. */
  readonly contest?: ElectionContest | null
  /** The contest's own figures; `null` when its place has none. Absent: the read failed. */
  readonly result?: ElectionResult | null
  /** The contest's event, for its name and the ballot day. Absent: the read failed. */
  readonly event?: ElectionEvent | null
}

/** The contest, then its figures and its event side by side: neither failure takes the contest with it. */
export async function readElectionContestForSsr(contestKey: string, signal: AbortSignal): Promise<ElectionContestServerRead> {
  const budget = deadline(signal)
  const contest = await settle('contest', () => fetchElectionContest(contestKey, budget))
  if (!contest) return contest === null ? { contest: null } : {}
  const [result, event] = await Promise.all([
    settle('result', () => fetchElectionResult(contest, budget)),
    settle('event', () => fetchElectionEvent(contest.eventKey, budget)),
  ])
  return {
    contest,
    ...(result !== undefined ? { result } : {}),
    ...(event !== undefined ? { event } : {}),
  }
}
