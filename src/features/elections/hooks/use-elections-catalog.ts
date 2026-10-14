import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import type {
  ElectionContest,
  ElectionContestPage,
  ElectionContestsSearch,
  ElectionEdition,
  ElectionEditionPage,
  ElectionsCatalogSearch,
} from '@/schemas/elections-catalog'
import {
  fetchElectionCatalog,
  fetchElectionContest,
  fetchElectionContests,
  fetchElectionEdition,
} from '../api/elections-catalog-api'
import { electionsCatalogKeys } from '../lib/elections-catalog-keys'

/** The catalog moves only with a data load; ten minutes keeps a return visit from reading again. */
const STALE_TIME = 10 * 60 * 1000

export function electionCatalogQueryOptions(search: ElectionsCatalogSearch) {
  return queryOptions({
    queryKey: electionsCatalogKeys.catalog(search),
    queryFn: ({ signal }) => fetchElectionCatalog(search, signal),
    // A refine keeps the rows it has, dimmed, until the next page lands.
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
  })
}

/** A page of source editions for the address's filters, seeded from the server's read when it was for this address. */
export function useElectionCatalog(search: ElectionsCatalogSearch, initialData?: ElectionEditionPage) {
  return useQuery({ ...electionCatalogQueryOptions(search), ...(initialData ? { initialData } : {}) })
}

export function electionEditionQueryOptions(electionKey: string) {
  return queryOptions({
    queryKey: electionsCatalogKeys.edition(electionKey),
    queryFn: ({ signal }) => fetchElectionEdition(electionKey, signal),
    staleTime: STALE_TIME,
  })
}

/** One edition: `null` when the API has none under this key. */
export function useElectionEdition(electionKey: string, initialData?: ElectionEdition) {
  return useQuery({ ...electionEditionQueryOptions(electionKey), ...(initialData ? { initialData } : {}) })
}

export function electionContestsQueryOptions(electionKey: string, search: ElectionContestsSearch) {
  const queryKey = electionsCatalogKeys.contests(electionKey, search)
  return queryOptions({
    queryKey,
    queryFn: ({ signal }) => fetchElectionContests(electionKey, search, signal),
    // A refine within the edition keeps its rows until the next page lands;
    // another edition's rows are never shown as this one's.
    placeholderData: (previous: ElectionContestPage | undefined, previousQuery) =>
      previousQuery?.queryKey[2] === electionKey ? previous : undefined,
    staleTime: STALE_TIME,
  })
}

/** A page of one edition's contests for the address's filters, seeded from the server's read when it was for this address. */
export function useElectionContests(electionKey: string, search: ElectionContestsSearch, initialData?: ElectionContestPage) {
  return useQuery({ ...electionContestsQueryOptions(electionKey, search), ...(initialData ? { initialData } : {}) })
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
