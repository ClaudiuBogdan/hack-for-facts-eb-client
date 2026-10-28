import type {
  ParliamentAgendaList,
  ParliamentBillActivity,
  ParliamentBillList,
  ParliamentBillsSearch,
  ParliamentDataFreshness,
  ParliamentHubData,
  ParliamentSearch,
  ParliamentVoteActivity,
  ParliamentVotesList,
  ParliamentVotesSearch,
} from '@/schemas/parliament'
import {
  fetchParliamentAgendas,
  fetchParliamentBillActivity,
  fetchParliamentBills,
  fetchParliamentFreshness,
  fetchParliamentHub,
  fetchParliamentVoteActivity,
  fetchParliamentVotes,
} from '../api/parliament-api'
import {
  buildVotesFilter,
  type ParliamentVotesFilterInput,
} from '../api/graphql/parliament-filters'
import type { ParliamentAgendaFilterInput } from '../api/parliament-agenda-api.live'
import { rollingWindow } from '../lib/vote-activity-grid'

/**
 * The reads behind the parliament hub's first screen, each defined ONCE: its
 * key and its fetch. The hooks read them in the browser, and the route loader
 * reads the same definitions on the server, so what the server puts in the
 * query cache is found under exactly the key the page asks for.
 */

export const PARLIAMENT_QUERY_KEY = ['parliament'] as const

/** A query's key and fetch, plus the options its hook and its prefetch share. */
export interface ParliamentQuery<T> {
  readonly queryKey: readonly unknown[]
  readonly queryFn: () => Promise<T>
  readonly staleTime?: number
  readonly retry?: boolean
}

/** The hub's two "latest votes" columns. */
export const HUB_CHAMBER_VOTES_PAGE_SIZE = 4
/** The hub's "Proiecte de lege" card. */
export const HUB_BILLS_PAGE_SIZE = 4
export const HUB_BILLS_SEARCH: ParliamentBillsSearch = {
  tab: 'proiecte',
  page: 1,
  pageSize: HUB_BILLS_PAGE_SIZE,
}
/** What a day square opens on the hub: the mixed all-chambers list. */
export const HUB_VOTE_DAY_SEARCH: ParliamentSearch = {
  tab: 'voturi',
  chamber: 'all',
}
/** Both hub heatmaps cover the last 12 months. */
export const HUB_ACTIVITY_MONTHS = 12

export function hubChamberVotesSearch(
  chamber: 'camera' | 'senat',
): ParliamentVotesSearch {
  return { chamber, page: 1, pageSize: HUB_CHAMBER_VOTES_PAGE_SIZE }
}

/**
 * The vote heatmap's filter: the list's own, minus its day bound. `from`/`to`
 * are dropped for two reasons: the server REJECTS a voteDate inside this field
 * (the year argument is the bound), and a chart collapsed to the one day the
 * reader already picked could not show them the year they are picking within.
 */
export function voteActivityFilterFor(
  daySearch: ParliamentSearch,
): ParliamentVotesFilterInput | undefined {
  const { from: _from, to: _to, ...rest } = daySearch
  const filter = buildVotesFilter(rest)
  delete filter.voteDate
  return Object.keys(filter).length > 0 ? filter : undefined
}

export function parliamentHubQuery(): ParliamentQuery<ParliamentHubData> {
  return {
    queryKey: [...PARLIAMENT_QUERY_KEY, 'hub'],
    queryFn: fetchParliamentHub,
  }
}

export function parliamentFreshnessQuery(): ParliamentQuery<ParliamentDataFreshness> {
  return {
    queryKey: [...PARLIAMENT_QUERY_KEY, 'freshness'],
    queryFn: fetchParliamentFreshness,
  }
}

export function parliamentAgendasQuery(
  page: number,
  filter?: ParliamentAgendaFilterInput,
): ParliamentQuery<ParliamentAgendaList> {
  return {
    queryKey: [...PARLIAMENT_QUERY_KEY, 'agendas', page, filter],
    queryFn: () => fetchParliamentAgendas(page, filter),
    staleTime: 5 * 60 * 1000,
  }
}

export function parliamentVotesQuery(
  search: ParliamentVotesSearch,
): ParliamentQuery<ParliamentVotesList> {
  return {
    queryKey: [...PARLIAMENT_QUERY_KEY, 'votes', search],
    queryFn: () => fetchParliamentVotes(search),
  }
}

export function parliamentBillsQuery(
  search: ParliamentBillsSearch,
): ParliamentQuery<ParliamentBillList> {
  return {
    queryKey: [...PARLIAMENT_QUERY_KEY, 'bills', search],
    queryFn: () => fetchParliamentBills(search),
  }
}

/**
 * Vote volume per day for one calendar year. `retry: false` because the
 * failure this query meets is a schema error when the field is not served, and
 * retrying a "Cannot query field" only delays the message the panel shows.
 */
export function parliamentVoteActivityQuery(
  year: number,
  filter?: ParliamentVotesFilterInput,
): ParliamentQuery<ParliamentVoteActivity | null> {
  return {
    queryKey: [...PARLIAMENT_QUERY_KEY, 'vote-activity', year, filter ?? null],
    queryFn: () => fetchParliamentVoteActivity(year, filter),
    retry: false,
  }
}

/** Legislative volume per day for one calendar year; `retry: false` as above. */
export function parliamentBillActivityQuery(
  year: number,
): ParliamentQuery<ParliamentBillActivity | null> {
  return {
    queryKey: [...PARLIAMENT_QUERY_KEY, 'bill-activity', year],
    queryFn: () => fetchParliamentBillActivity(year),
    retry: false,
  }
}

/**
 * Every read the hub tab makes on its first screen, for `today`'s rolling
 * window: the shell's header (hub aggregate, freshness), the agenda card, the
 * two chambers' latest votes, the bills card and both heatmaps.
 */
export function parliamentHubScreenQueries(
  today: Date,
): ReadonlyArray<ParliamentQuery<unknown>> {
  const { years } = rollingWindow({ months: HUB_ACTIVITY_MONTHS, today })
  const voteFilter = voteActivityFilterFor(HUB_VOTE_DAY_SEARCH)
  return [
    parliamentHubQuery(),
    parliamentFreshnessQuery(),
    parliamentAgendasQuery(1),
    parliamentVotesQuery(hubChamberVotesSearch('camera')),
    parliamentVotesQuery(hubChamberVotesSearch('senat')),
    parliamentBillsQuery(HUB_BILLS_SEARCH),
    ...years.map((year) => parliamentVoteActivityQuery(year, voteFilter)),
    ...years.map((year) => parliamentBillActivityQuery(year)),
  ]
}
