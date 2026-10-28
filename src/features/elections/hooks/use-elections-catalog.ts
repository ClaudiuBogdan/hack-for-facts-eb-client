import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import type {
  ElectionContest,
  ElectionContestPage,
  ElectionContestsSearch,
  ElectionEvent,
  ElectionEventPage,
  ElectionResult,
  ElectionsCatalogSearch,
} from '@/schemas/elections-catalog'
import {
  fetchElectionContest,
  fetchElectionContests,
  fetchElectionEvent,
  fetchElectionEvents,
  fetchElectionResult,
  type ElectionResultTarget,
} from '../api/elections-catalog-api'
import { electionsCatalogKeys } from '../lib/elections-catalog-keys'

/** The figures move only with a new publication; ten minutes keeps a return visit from reading again. */
const STALE_TIME = 10 * 60 * 1000

export function electionEventsQueryOptions(search: ElectionsCatalogSearch) {
  return queryOptions({
    queryKey: electionsCatalogKeys.events(search),
    queryFn: ({ signal }) => fetchElectionEvents(search, signal),
    // Another page keeps the rows it has, dimmed, until the next page lands.
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
  })
}

/** A page of events, seeded from the server's read when it was for this address. */
export function useElectionEvents(search: ElectionsCatalogSearch, initialData?: ElectionEventPage) {
  return useQuery({ ...electionEventsQueryOptions(search), ...(initialData ? { initialData } : {}) })
}

export function electionEventQueryOptions(eventKey: string) {
  return queryOptions({
    queryKey: electionsCatalogKeys.event(eventKey),
    queryFn: ({ signal }) => fetchElectionEvent(eventKey, signal),
    staleTime: STALE_TIME,
  })
}

/** One event with its ballot days: `null` when the API has none under this key. Idle until the key is known. */
export function useElectionEvent(eventKey: string | null, initialData?: ElectionEvent) {
  return useQuery({ ...electionEventQueryOptions(eventKey ?? ''), enabled: eventKey !== null, ...(initialData ? { initialData } : {}) })
}

export function electionContestsQueryOptions(occurrenceKey: string, search: ElectionContestsSearch) {
  return queryOptions({
    queryKey: electionsCatalogKeys.contests(occurrenceKey, search),
    queryFn: ({ signal }) => fetchElectionContests(occurrenceKey, search, signal),
    // A refine within the day keeps its rows until the next page lands;
    // another day's rows are never shown as this one's.
    placeholderData: (previous: ElectionContestPage | undefined, previousQuery) =>
      previousQuery?.queryKey[2] === occurrenceKey ? previous : undefined,
    staleTime: STALE_TIME,
  })
}

/** A page of one ballot day's contests for the address's filters; idle until the day is known. */
export function useElectionContests(occurrenceKey: string | null, search: ElectionContestsSearch, initialData?: ElectionContestPage) {
  return useQuery({
    ...electionContestsQueryOptions(occurrenceKey ?? '', search),
    enabled: occurrenceKey !== null,
    ...(initialData ? { initialData } : {}),
  })
}

export function electionContestQueryOptions(contestKey: string) {
  return queryOptions({
    queryKey: electionsCatalogKeys.contest(contestKey),
    queryFn: ({ signal }) => fetchElectionContest(contestKey, signal),
    staleTime: STALE_TIME,
  })
}

/** One contest: `null` when the API has none under this key. */
export function useElectionContest(contestKey: string, initialData?: ElectionContest) {
  return useQuery({ ...electionContestQueryOptions(contestKey), ...(initialData ? { initialData } : {}) })
}

const resultKeyOf = (contest: ElectionResultTarget) =>
  electionsCatalogKeys.result({
    contestKey: contest.contestKey,
    occurrenceKey: contest.occurrenceKey,
    office: contest.office,
    placeKey: contest.jurisdiction.placeKey,
  })

export function electionResultQueryOptions(contest: ElectionResultTarget) {
  return queryOptions({
    queryKey: resultKeyOf(contest),
    queryFn: ({ signal }) => fetchElectionResult(contest, signal),
    staleTime: STALE_TIME,
  })
}

/** A contest's own figures, once the contest is known: `null` when its place has none. */
export function useElectionResult(contest: ElectionResultTarget | null | undefined, initialData?: ElectionResult | null) {
  const target = contest ?? { contestKey: '', occurrenceKey: '', office: '', jurisdiction: { placeKey: '' } }
  return useQuery({
    ...electionResultQueryOptions(target),
    enabled: contest != null,
    ...(initialData !== undefined ? { initialData } : {}),
  })
}
