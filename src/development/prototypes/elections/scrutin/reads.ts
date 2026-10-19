import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { ELECTION_CONTESTS_QUERY } from '@/features/elections/api/elections-catalog-api'
import { electionContestQueryOptions } from '@/features/elections/hooks/use-elections-catalog'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { electionContestPageSchema, type ElectionContest } from '@/schemas/elections-catalog'
import { z } from 'zod'
import type { ScopeType } from '../shared/model'
import { usePlaces, type Place, type PlaceIndex } from '../shared/places'
import { DEFAULT_CONTEST_KEY, identityOf, parseContestKey, placeRows, type PlaceRow, type RowIdentity } from './model'

/**
 * The page's reads: its key from the address, the row from the live API
 * (the client's own adapter and hook), the place index in the browser, and
 * the same office's county and national rows of the edition (one request;
 * the API lists at most 100 and an edition has at most 42 counties and one
 * country).
 */

export function useContestKey(): string {
  const search: Record<string, unknown> = useSearch({ strict: false })
  const raw = search.scrutin
  return typeof raw === 'string' && raw.length > 0 ? raw : DEFAULT_CONTEST_KEY
}

export interface ContestRead {
  readonly key: string
  readonly parsed: ReturnType<typeof parseContestKey>
  /** `undefined` while pending, `null` when the API has no such row. */
  readonly row: ElectionContest | null | undefined
  readonly rowError: boolean
  readonly retry: () => void
  readonly places: PlaceIndex | undefined
  readonly place: Place | null
  /** Every row the index holds at the SIRUTA code (null for a row that is not at one). */
  readonly placeRows: readonly PlaceRow[] | null
  readonly identity: RowIdentity | null
}

export function useContestRead(): ContestRead {
  const key = useContestKey()
  const parsed = useMemo(() => parseContestKey(key), [key])
  const query = useQuery({ ...electionContestQueryOptions(key), enabled: parsed !== null })
  const places = usePlaces(parsed?.scopeType === 'siruta')
  const siruta = parsed?.scopeType === 'siruta' ? parsed.scopeKey : null
  const place = siruta && places.data ? (places.data.places.get(siruta) ?? null) : null
  const rows = useMemo(() => (siruta && places.data ? placeRows(places.data, siruta) : null), [places.data, siruta])
  // A key that cannot be a contest key names no row: said without asking the API.
  const row: ElectionContest | null | undefined = parsed ? query.data : null
  const identity = useMemo(() => (parsed ? identityOf(key, parsed, row, place) : null), [key, parsed, row, place])
  return {
    key,
    parsed,
    row,
    rowError: query.isError,
    retry: () => void query.refetch(),
    places: places.data,
    place,
    placeRows: rows,
    identity,
  }
}

const pageResponse = z.object({ electionContests: electionContestPageSchema })

async function fetchLevelRows(editionKey: string, office: string, scopeType: ScopeType, signal?: AbortSignal) {
  const data = await graphqlQuery<unknown>(
    ELECTION_CONTESTS_QUERY,
    { electionKey: editionKey, filter: { reportedOffices: { in: [office] }, scopeTypes: { in: [scopeType] } }, page: 1, pageSize: 100 },
    { operationName: 'ElectionContests', signal, auth: 'none' },
  )
  return pageResponse.parse(data).electionContests
}

/** The same office's rows at one scope type of the edition, as served (labels as the source spells them). */
export function useLevelRows(editionKey: string | null, office: string | null, scopeType: ScopeType | null) {
  return useQuery({
    queryKey: ['development', 'elections', 'scrutin', 'level', editionKey, office, scopeType],
    queryFn: ({ signal }) => fetchLevelRows(editionKey ?? '', office ?? '', scopeType ?? 'county', signal),
    enabled: editionKey !== null && office !== null && scopeType !== null,
    staleTime: 10 * 60 * 1000,
  })
}
