import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { contest as contestOf, event as eventOf, pageOf, result as resultOf } from '../test/catalog-fixtures'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: (...args: unknown[]) => graphqlQuery(...args),
}))

const {
  ELECTION_CONTESTS_QUERY,
  ELECTION_CONTEST_QUERY,
  ELECTION_EVENTS_QUERY,
  ELECTION_EVENT_QUERY,
  ELECTION_RESULT_QUERY,
  fetchElectionContest,
  fetchElectionContests,
  fetchElectionEvent,
  fetchElectionEvents,
  fetchElectionResult,
} = await import('./elections-catalog-api')

const EVENT = eventOf()
const CONTEST = contestOf()
const RESULT = resultOf()

const variablesOf = (call = 0) => graphqlQuery.mock.calls[call]?.[1] as Record<string, unknown>
const optionsOf = (call = 0) => graphqlQuery.mock.calls[call]?.[2] as Record<string, unknown>

beforeEach(() => {
  graphqlQuery.mockReset()
})

describe('the documents', () => {
  const documents = [ELECTION_EVENTS_QUERY, ELECTION_EVENT_QUERY, ELECTION_CONTESTS_QUERY, ELECTION_CONTEST_QUERY, ELECTION_RESULT_QUERY]

  it('ask for the current contract only, none of the retired catalog', () => {
    for (const query of documents) {
      expect(query).not.toMatch(/electionCatalog|ElectionCatalogFilter|electionEdition|electionKey|reported(?:Office|Round|Name)|readiness/u)
    }
  })

  it('never ask for a competitor’s key or reported labels, which name a person for an independent', () => {
    for (const query of documents) expect(query).not.toMatch(/competitorKey|reportedLabel|actorKey/u)
    expect(ELECTION_RESULT_QUERY).toContain('competitor { kind label }')
  })
})

describe('fetchElectionEvents', () => {
  it('sends the first page and the fixed page size by default', async () => {
    graphqlQuery.mockResolvedValue({ electionEvents: pageOf([EVENT]) })
    const signal = new AbortController().signal
    await fetchElectionEvents({}, signal)
    expect(variablesOf()).toEqual({ page: 1, pageSize: 20 })
    expect(optionsOf()).toEqual({ operationName: 'ElectionEvents', signal, auth: 'none' })
  })

  it('keeps the API’s order, total and paging', async () => {
    const second = eventOf({ eventKey: 'ro:parliamentary:2024', family: 'parliamentary' })
    graphqlQuery.mockResolvedValue({ electionEvents: pageOf([EVENT, second], { page: 2, total: 26, hasMore: true }) })
    const page = await fetchElectionEvents({ pagina: 2 })
    expect(variablesOf()).toEqual({ page: 2, pageSize: 20 })
    expect(page.items.map((item) => item.eventKey)).toEqual(['ro:local:2024', 'ro:parliamentary:2024'])
    expect(page).toMatchObject({ page: 2, total: 26, hasMore: true })
  })

  it('fails a failed request as a failure, never as an empty list', async () => {
    graphqlQuery.mockRejectedValue(new GraphQLRequestError('GraphQL request failed: 502'))
    await expect(fetchElectionEvents({})).rejects.toBeInstanceOf(GraphQLRequestError)
  })

  it('fails a malformed answer rather than filling it in', async () => {
    graphqlQuery.mockResolvedValue({ electionEvents: { items: [EVENT], page: 1, pageSize: 20, hasMore: false } })
    await expect(fetchElectionEvents({})).rejects.toBeInstanceOf(ZodError)
  })
})

describe('fetchElectionEvent', () => {
  it('looks the key up exactly as given', async () => {
    graphqlQuery.mockResolvedValue({ electionEvent: EVENT })
    await expect(fetchElectionEvent('ro:local:2024')).resolves.toEqual(EVENT)
    expect(variablesOf()).toEqual({ eventKey: 'ro:local:2024' })
    expect(optionsOf()).toMatchObject({ operationName: 'ElectionEvent', auth: 'none' })
  })

  it('answers an event without published figures with null', async () => {
    graphqlQuery.mockResolvedValue({ electionEvent: null })
    await expect(fetchElectionEvent('ro:local:1999')).resolves.toBeNull()
  })
})

describe('fetchElectionContests', () => {
  it('sends the day’s key and the office, place type and county exactly, with the page', async () => {
    graphqlQuery.mockResolvedValue({ electionContests: pageOf([CONTEST]) })
    await fetchElectionContests('ro:local:2024:2024-06-09', { data: '2024-06-09', functie: 'local_council', arie: 'uat', judet: 'CJ', pagina: 2 })
    expect(variablesOf()).toEqual({
      occurrenceKey: 'ro:local:2024:2024-06-09',
      filter: { offices: { in: ['local_council'] }, jurisdictionTypes: { in: ['uat'] }, countyCodes: { in: ['CJ'] } },
      page: 2,
      pageSize: 20,
    })
    expect(optionsOf()).toMatchObject({ operationName: 'ElectionContests', auth: 'none' })
  })

  it('sends no filter for a day without one: the date picks the day, not a filter', async () => {
    graphqlQuery.mockResolvedValue({ electionContests: pageOf([]) })
    await fetchElectionContests('ro:local:2024:2024-06-23', { data: '2024-06-23' })
    expect(variablesOf()).toMatchObject({ filter: {}, page: 1 })
  })

  it('passes a missing day’s NOT_FOUND on as an error', async () => {
    graphqlQuery.mockRejectedValue(
      new GraphQLRequestError('GraphQL errors: Election occurrence not found.', {
        graphQLErrors: [{ message: 'Election occurrence not found.', path: ['electionContests'], extensions: { code: 'NOT_FOUND' } }],
      }),
    )
    await expect(fetchElectionContests('nope', {})).rejects.toBeInstanceOf(GraphQLRequestError)
  })
})

describe('fetchElectionContest', () => {
  it('looks the key up exactly, colons and all', async () => {
    graphqlQuery.mockResolvedValue({ electionContest: CONTEST })
    await expect(fetchElectionContest(CONTEST.contestKey)).resolves.toEqual(CONTEST)
    expect(variablesOf()).toEqual({ contestKey: CONTEST.contestKey })
  })

  it('answers a contest the API does not have with null', async () => {
    graphqlQuery.mockResolvedValue({ electionContest: null })
    await expect(fetchElectionContest('missing')).resolves.toBeNull()
  })
})

describe('fetchElectionResult', () => {
  it('reads the contest’s own place on its day, for its office', async () => {
    graphqlQuery.mockResolvedValue({ electionResult: RESULT })
    await expect(fetchElectionResult(CONTEST)).resolves.toEqual(RESULT)
    expect(variablesOf()).toEqual({
      occurrenceKey: 'ro:local:2024:2024-06-09',
      office: 'mayor',
      scopeKey: 'uat:100004',
      contestKey: 'ro:local:2024:2024-06-09:mayor:uat:100004',
    })
    expect(optionsOf()).toMatchObject({ operationName: 'ElectionResult', auth: 'none' })
  })

  it('answers a place without figures with null', async () => {
    graphqlQuery.mockResolvedValue({ electionResult: null })
    await expect(fetchElectionResult(CONTEST)).resolves.toBeNull()
  })
})
