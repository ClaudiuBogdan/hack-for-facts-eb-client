import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))

const {
  ELECTION_CATALOG_QUERY,
  ELECTION_CONTESTS_QUERY,
  ELECTION_CONTEST_QUERY,
  ELECTION_EDITION_QUERY,
  fetchElectionCatalog,
  fetchElectionContest,
  fetchElectionContests,
  fetchElectionEdition,
} = await import('./elections-catalog-api')

const READINESS = { identity: 'HELD', sourceSelection: 'HELD' }
const EDITION = {
  electionKey: 'bec-local-2024',
  eventKey: 'ro:local:2024',
  reportedName: 'bec-local-2024',
  reportedYear: 2024,
  reportedFamily: 'local',
  reportedRound: 'tur1',
  reportedDate: null,
  reportedAuthority: 'BEC/AEP/ROAEP',
  readiness: READINESS,
}
const CONTEST = {
  contestKey: 'contest:bec-local-2024:mayor:source_constituency:8-19',
  electionKey: 'bec-local-2024',
  reportedOffice: 'mayor',
  chamber: null,
  reportedRound: 'tur1',
  scopeType: 'source_constituency',
  sourceScopeKey: '8:19',
  scopeLabel: 'CINCU',
  constituencyCode: null,
  constituencyName: null,
  readiness: READINESS,
}
const pageOf = (items: readonly unknown[], extra: Record<string, unknown> = {}) => ({ items, page: 1, pageSize: 20, total: items.length, hasMore: false, ...extra })

const variablesOf = (call = 0) => graphqlQuery.mock.calls[call]?.[1] as Record<string, unknown>
const optionsOf = (call = 0) => graphqlQuery.mock.calls[call]?.[2] as Record<string, unknown>

beforeEach(() => {
  graphqlQuery.mockReset()
})

describe('the documents', () => {
  it('ask for metadata only: no results, turnout, candidates, mandates or verified identity', () => {
    for (const query of [ELECTION_CATALOG_QUERY, ELECTION_EDITION_QUERY, ELECTION_CONTESTS_QUERY, ELECTION_CONTEST_QUERY]) {
      expect(query).not.toMatch(/result|turnout|winner|candidate|mandate|verified|issues|sourceOpening/iu)
    }
  })
})

describe('fetchElectionCatalog', () => {
  it('sends no filter for the default view, the first page and the fixed page size', async () => {
    graphqlQuery.mockResolvedValue({ electionCatalog: pageOf([EDITION]) })
    const signal = new AbortController().signal
    await fetchElectionCatalog({}, signal)
    expect(variablesOf()).toEqual({ filter: {}, page: 1, pageSize: 20 })
    expect(optionsOf()).toEqual({ operationName: 'ElectionCatalog', signal, auth: 'none' })
  })

  it('sends the address’s year and family as one exact value each, and its page', async () => {
    graphqlQuery.mockResolvedValue({ electionCatalog: pageOf([]) })
    await fetchElectionCatalog({ an: 2019, tip: ' Parliamentary,local ', pagina: 3 })
    expect(variablesOf()).toEqual({
      filter: { reportedYears: { in: [2019] }, reportedFamilies: { in: [' Parliamentary,local '] } },
      page: 3,
      pageSize: 20,
    })
  })

  it('keeps the API’s order, total and paging', async () => {
    const second = { ...EDITION, electionKey: 'aep-local-2012', reportedName: 'aep-local-2012' }
    graphqlQuery.mockResolvedValue({ electionCatalog: pageOf([EDITION, second], { page: 2, total: 50, hasMore: true }) })
    const page = await fetchElectionCatalog({ pagina: 2 })
    expect(page.items.map((item) => item.electionKey)).toEqual(['bec-local-2024', 'aep-local-2012'])
    expect(page).toMatchObject({ page: 2, pageSize: 20, total: 50, hasMore: true })
  })

  it('fails a failed request as a failure, never as an empty catalog', async () => {
    graphqlQuery.mockRejectedValue(new GraphQLRequestError('GraphQL request failed: 502'))
    await expect(fetchElectionCatalog({})).rejects.toBeInstanceOf(GraphQLRequestError)
  })

  it('fails a malformed answer rather than filling it in', async () => {
    graphqlQuery.mockResolvedValue({ electionCatalog: { items: [EDITION], page: 1, pageSize: 20, hasMore: false } })
    await expect(fetchElectionCatalog({})).rejects.toBeInstanceOf(ZodError)
  })
})

describe('fetchElectionEdition', () => {
  it('looks the key up exactly as given', async () => {
    graphqlQuery.mockResolvedValue({ electionEdition: EDITION })
    await fetchElectionEdition('bec local/2024?x=1')
    expect(variablesOf()).toEqual({ electionKey: 'bec local/2024?x=1' })
    expect(optionsOf()).toMatchObject({ operationName: 'ElectionEdition', auth: 'none' })
  })

  it('answers an edition the API does not have with null', async () => {
    graphqlQuery.mockResolvedValue({ electionEdition: null })
    await expect(fetchElectionEdition('missing')).resolves.toBeNull()
  })

  it('keeps every missing reported value null', async () => {
    graphqlQuery.mockResolvedValue({ electionEdition: { ...EDITION, eventKey: null, reportedYear: null, reportedRound: null } })
    await expect(fetchElectionEdition('bec-local-2024')).resolves.toMatchObject({ eventKey: null, reportedYear: null, reportedRound: null, reportedDate: null })
  })

  it('fails a failed request, never answering it as a missing edition', async () => {
    graphqlQuery.mockRejectedValue(new GraphQLRequestError('GraphQL request failed: 500'))
    await expect(fetchElectionEdition('bec-local-2024')).rejects.toBeInstanceOf(GraphQLRequestError)
  })
})

describe('fetchElectionContests', () => {
  it('sends the edition’s key and the office, scope type and round exactly, with the page', async () => {
    graphqlQuery.mockResolvedValue({ electionContests: pageOf([CONTEST]) })
    await fetchElectionContests('bec-local-2024', { functie: 'local_council', arie: 'county', tur: 'final', pagina: 2 })
    expect(variablesOf()).toEqual({
      electionKey: 'bec-local-2024',
      filter: { reportedOffices: { in: ['local_council'] }, scopeTypes: { in: ['county'] }, reportedRounds: { in: ['final'] } },
      page: 2,
      pageSize: 20,
    })
    expect(optionsOf()).toMatchObject({ operationName: 'ElectionContests', auth: 'none' })
  })

  it('passes an unknown edition’s NOT_FOUND on as an error', async () => {
    graphqlQuery.mockRejectedValue(new GraphQLRequestError('GraphQL errors: Election edition not found.', { graphQLErrors: [{ message: 'Election edition not found.', extensions: { code: 'NOT_FOUND' } }] }))
    await expect(fetchElectionContests('missing', {})).rejects.toBeInstanceOf(GraphQLRequestError)
  })

  it('answers a filter nothing matches with the API’s genuine empty page', async () => {
    graphqlQuery.mockResolvedValue({ electionContests: pageOf([]) })
    await expect(fetchElectionContests('bec-local-2024', { functie: 'president' })).resolves.toEqual(pageOf([]))
  })
})

describe('fetchElectionContest', () => {
  it('looks the key up exactly, colons and all', async () => {
    graphqlQuery.mockResolvedValue({ electionContest: CONTEST })
    const contest = await fetchElectionContest(CONTEST.contestKey)
    expect(variablesOf()).toEqual({ contestKey: CONTEST.contestKey })
    expect(contest).toMatchObject({ sourceScopeKey: '8:19', scopeLabel: 'CINCU', chamber: null })
  })

  it('answers a contest the API does not have with null', async () => {
    graphqlQuery.mockResolvedValue({ electionContest: null })
    await expect(fetchElectionContest('missing')).resolves.toBeNull()
  })
})
