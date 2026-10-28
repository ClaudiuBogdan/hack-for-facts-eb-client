import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'

/**
 * The retired source-edition contract (`electionContests(electionKey)`,
 * `electionContest` with `reportedOffice`, `scopeType`, `sourceScopeKey`…),
 * kept only so the prototypes built on it (alegere, analize, scrutin) still
 * compile and render their own states. The server removed it on 2026-10-21
 * (server `9c438870`), so every read here fails today; the shipped pages read
 * the current contract in `@/features/elections/api/elections-catalog-api`.
 */

export const ELECTIONS_PAGE_SIZE = 20

const MAX_LABEL_LENGTH = 128
const GRAPHQL_MAX_INT = 2_147_483_647
const ELECTIONS_MAX_PAGE = Math.min(GRAPHQL_MAX_INT, Math.floor(Number.MAX_SAFE_INTEGER / ELECTIONS_PAGE_SIZE))

export const ELECTION_SCOPE_TYPES = ['siruta', 'county', 'diaspora', 'national', 'chamber', 'source_constituency'] as const

function isOpaqueText(value: string, maxLength: number): boolean {
  // eslint-disable-next-line no-control-regex -- Rejecting control characters is the point.
  return value.length > 0 && value.length <= maxLength && !/[\u0000-\u001f\u007f]/u.test(value)
}

const evidenceStatusSchema = z.enum(['VERIFIED', 'HELD', 'UNAVAILABLE', 'UNKNOWN'])

export const electionContestSchema = z.object({
  contestKey: z.string(),
  electionKey: z.string(),
  reportedOffice: z.string(),
  chamber: z.string().nullable(),
  reportedRound: z.string().nullable(),
  scopeType: z.enum(ELECTION_SCOPE_TYPES),
  sourceScopeKey: z.string(),
  scopeLabel: z.string().nullable(),
  constituencyCode: z.string().nullable(),
  constituencyName: z.string().nullable(),
  readiness: z.object({ identity: evidenceStatusSchema, sourceSelection: evidenceStatusSchema }),
})
export type ElectionContest = z.infer<typeof electionContestSchema>

export const electionContestPageSchema = z.object({
  items: z.array(electionContestSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
})
export type ElectionContestPage = z.infer<typeof electionContestPageSchema>

const asLabel = (value: unknown) => (typeof value === 'number' || typeof value === 'boolean' ? String(value) : value)
const labelParam = z
  .preprocess(
    asLabel,
    z
      .string()
      .refine((value) => isOpaqueText(value, MAX_LABEL_LENGTH))
      .optional(),
  )
  .catch(undefined)
const pageParam = z.number().int().min(1).max(ELECTIONS_MAX_PAGE).optional().catch(undefined)

export const electionContestsSearchSchema = z
  .object({
    functie: labelParam,
    arie: z.enum(ELECTION_SCOPE_TYPES).optional().catch(undefined),
    tur: labelParam,
    pagina: pageParam,
  })
  .catch({})
export type ElectionContestsSearch = z.infer<typeof electionContestsSearchSchema>

export function parseElectionContestsSearch(search: unknown): ElectionContestsSearch {
  return electionContestsSearchSchema.parse(search ?? {})
}

const READINESS = 'readiness { identity sourceSelection }'
const CONTEST_FIELDS = `
  contestKey electionKey reportedOffice chamber reportedRound scopeType sourceScopeKey scopeLabel
  constituencyCode constituencyName
  ${READINESS}
`

export const ELECTION_CONTESTS_QUERY = /* GraphQL */ `
  query ElectionContests($electionKey: ID!, $filter: ElectionContestsFilter, $page: Int, $pageSize: Int) {
    electionContests(electionKey: $electionKey, filter: $filter, page: $page, pageSize: $pageSize) {
      items { ${CONTEST_FIELDS} }
      page pageSize total hasMore
    }
  }
`

const ELECTION_CONTEST_QUERY = /* GraphQL */ `
  query ElectionContest($contestKey: ID!) {
    electionContest(contestKey: $contestKey) { ${CONTEST_FIELDS} }
  }
`

type InFilter<Value> = { readonly in: readonly Value[] }

function contestsFilterOf(search: ElectionContestsSearch): Record<string, InFilter<string>> {
  return {
    ...(search.functie !== undefined ? { reportedOffices: { in: [search.functie] } } : {}),
    ...(search.arie !== undefined ? { scopeTypes: { in: [search.arie] } } : {}),
    ...(search.tur !== undefined ? { reportedRounds: { in: [search.tur] } } : {}),
  }
}

const contestsResponseSchema = z.object({ electionContests: electionContestPageSchema })
const contestResponseSchema = z.object({ electionContest: electionContestSchema.nullable() })

async function fetchElectionContests(electionKey: string, search: ElectionContestsSearch, signal?: AbortSignal): Promise<ElectionContestPage> {
  const data = await graphqlQuery<unknown>(
    ELECTION_CONTESTS_QUERY,
    { electionKey, filter: contestsFilterOf(search), page: search.pagina ?? 1, pageSize: ELECTIONS_PAGE_SIZE },
    { operationName: 'ElectionContests', signal, auth: 'none' },
  )
  return contestsResponseSchema.parse(data).electionContests
}

async function fetchElectionContest(contestKey: string, signal?: AbortSignal): Promise<ElectionContest | null> {
  const data = await graphqlQuery<unknown>(ELECTION_CONTEST_QUERY, { contestKey }, { operationName: 'ElectionContest', signal, auth: 'none' })
  return contestResponseSchema.parse(data).electionContest
}

const STALE_TIME = 10 * 60 * 1000
const KEY = ['development', 'elections', 'legacy-catalog'] as const

export function electionContestQueryOptions(contestKey: string) {
  return queryOptions({
    queryKey: [...KEY, 'contest', contestKey],
    queryFn: ({ signal }) => fetchElectionContest(contestKey, signal),
    staleTime: STALE_TIME,
  })
}

export function useElectionContests(electionKey: string, search: ElectionContestsSearch) {
  return useQuery({
    queryKey: [...KEY, 'contests', electionKey, search.functie ?? null, search.arie ?? null, search.tur ?? null, search.pagina ?? 1],
    queryFn: ({ signal }) => fetchElectionContests(electionKey, search, signal),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME,
  })
}
