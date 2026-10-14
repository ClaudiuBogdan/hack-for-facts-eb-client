import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'

const { fetchElectionCatalog, fetchElectionEdition, fetchElectionContests, fetchElectionContest, loggerError } = vi.hoisted(() => ({
  fetchElectionCatalog: vi.fn(),
  fetchElectionEdition: vi.fn(),
  fetchElectionContests: vi.fn(),
  fetchElectionContest: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('./elections-catalog-api', () => ({ fetchElectionCatalog, fetchElectionEdition, fetchElectionContests, fetchElectionContest }))
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: loggerError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}))

const { readElectionCatalogForSsr, readElectionContestForSsr, readElectionEditionForSsr } = await import('./elections-catalog-ssr')

const EDITION = { electionKey: 'bec-local-2024' }
const PAGE = { items: [], page: 1, pageSize: 20, total: 0, hasMore: false }
const notFound = () =>
  new GraphQLRequestError('GraphQL errors: Election edition not found.', { graphQLErrors: [{ message: 'Election edition not found.', extensions: { code: 'NOT_FOUND' } }] })

beforeEach(() => {
  for (const mock of [fetchElectionCatalog, fetchElectionEdition, fetchElectionContests, fetchElectionContest, loggerError]) mock.mockReset()
})

describe('the server reads', () => {
  it('read under a deadline of their own, tied to the request', async () => {
    fetchElectionCatalog.mockResolvedValue(PAGE)
    const request = new AbortController()
    await expect(readElectionCatalogForSsr({ an: 2024 }, request.signal)).resolves.toBe(PAGE)
    const signal = fetchElectionCatalog.mock.calls[0]?.[1] as AbortSignal
    expect(fetchElectionCatalog).toHaveBeenCalledWith({ an: 2024 }, expect.any(AbortSignal))
    expect(signal).not.toBe(request.signal)
    request.abort()
    expect(signal.aborted).toBe(true)
  })

  it('leave a failed read to the browser, and report it', async () => {
    fetchElectionCatalog.mockRejectedValue(new GraphQLRequestError('GraphQL request failed: 502'))
    await expect(readElectionCatalogForSsr({}, new AbortController().signal)).resolves.toBeUndefined()
    expect(loggerError).toHaveBeenCalledTimes(1)
  })

  it('do not report a read past its deadline twice', async () => {
    fetchElectionContest.mockRejectedValue(new GraphQLRequestError('deadline', { timedOut: true }))
    await expect(readElectionContestForSsr('k', new AbortController().signal)).resolves.toBeUndefined()
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('let a superseded request’s abort travel on', async () => {
    const abort = new DOMException('aborted', 'AbortError')
    fetchElectionContest.mockRejectedValue(abort)
    await expect(readElectionContestForSsr('k', new AbortController().signal)).rejects.toBe(abort)
  })

  it('keep a contest the API does not have as null, apart from a failure', async () => {
    fetchElectionContest.mockResolvedValue(null)
    await expect(readElectionContestForSsr('missing', new AbortController().signal)).resolves.toBeNull()
  })
})

describe('an edition’s server read', () => {
  it('reads the edition and its contests side by side', async () => {
    fetchElectionEdition.mockResolvedValue(EDITION)
    fetchElectionContests.mockResolvedValue(PAGE)
    await expect(readElectionEditionForSsr('bec-local-2024', { functie: 'mayor' }, new AbortController().signal)).resolves.toEqual({ edition: EDITION, contests: PAGE })
    expect(fetchElectionContests).toHaveBeenCalledWith('bec-local-2024', { functie: 'mayor' }, expect.any(AbortSignal))
  })

  it('keeps the edition when its contest list fails', async () => {
    fetchElectionEdition.mockResolvedValue(EDITION)
    fetchElectionContests.mockRejectedValue(new GraphQLRequestError('GraphQL request failed: 500'))
    await expect(readElectionEditionForSsr('bec-local-2024', {}, new AbortController().signal)).resolves.toEqual({ edition: EDITION })
  })

  it('keeps the contests when the edition’s read fails', async () => {
    fetchElectionEdition.mockRejectedValue(new GraphQLRequestError('GraphQL request failed: 500'))
    fetchElectionContests.mockResolvedValue(PAGE)
    await expect(readElectionEditionForSsr('bec-local-2024', {}, new AbortController().signal)).resolves.toEqual({ contests: PAGE })
  })

  it('answers a missing edition with null, its list’s NOT_FOUND neither kept nor reported', async () => {
    fetchElectionEdition.mockResolvedValue(null)
    fetchElectionContests.mockRejectedValue(notFound())
    await expect(readElectionEditionForSsr('missing', {}, new AbortController().signal)).resolves.toEqual({ edition: null })
    expect(loggerError).not.toHaveBeenCalled()
  })
})
