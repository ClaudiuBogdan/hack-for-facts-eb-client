import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { contest as contestOf, event as eventOf, pageOf, result as resultOf } from '../test/catalog-fixtures'

const { fetchElectionEvents, fetchElectionEvent, fetchElectionContests, fetchElectionContest, fetchElectionResult, loggerError } = vi.hoisted(() => ({
  fetchElectionEvents: vi.fn(),
  fetchElectionEvent: vi.fn(),
  fetchElectionContests: vi.fn(),
  fetchElectionContest: vi.fn(),
  fetchElectionResult: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('./elections-catalog-api', () => ({ fetchElectionEvents, fetchElectionEvent, fetchElectionContests, fetchElectionContest, fetchElectionResult }))
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: loggerError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}))

const { SSR_DEADLINE_MS, readElectionContestForSsr, readElectionEventForSsr, readElectionEventsForSsr } = await import('./elections-catalog-ssr')

const EVENT = eventOf()
const CONTEST = contestOf()
const RESULT = resultOf()
const PAGE = pageOf([CONTEST])
const failure = () => new GraphQLRequestError('GraphQL request failed: 500')
const notFound = () =>
  new GraphQLRequestError('GraphQL errors: Election occurrence not found.', {
    graphQLErrors: [{ message: 'Election occurrence not found.', extensions: { code: 'NOT_FOUND' } }],
  })

beforeEach(() => {
  for (const mock of [fetchElectionEvents, fetchElectionEvent, fetchElectionContests, fetchElectionContest, fetchElectionResult, loggerError]) mock.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the server reads', () => {
  it('read under a deadline of their own, tied to the request', async () => {
    fetchElectionEvents.mockResolvedValue(PAGE)
    const request = new AbortController()
    await expect(readElectionEventsForSsr({ pagina: 2 }, request.signal)).resolves.toBe(PAGE)
    const signal = fetchElectionEvents.mock.calls[0]?.[1] as AbortSignal
    expect(fetchElectionEvents).toHaveBeenCalledWith({ pagina: 2 }, expect.any(AbortSignal))
    expect(signal).not.toBe(request.signal)
    request.abort()
    expect(signal.aborted).toBe(true)
  })

  it('give up on a slow API after a second, so the first byte is not held', async () => {
    vi.useFakeTimers()
    expect(SSR_DEADLINE_MS).toBe(1_000)
    fetchElectionEvents.mockImplementation(
      (_search: unknown, signal: AbortSignal) =>
        new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new GraphQLRequestError('deadline', { timedOut: true })))),
    )
    const read = readElectionEventsForSsr({}, new AbortController().signal)
    await vi.advanceTimersByTimeAsync(SSR_DEADLINE_MS)
    await expect(read).resolves.toBeUndefined()
    // A read past its deadline was logged by the GraphQL client already.
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('leave a failed read to the browser, and report it', async () => {
    fetchElectionEvents.mockRejectedValue(failure())
    await expect(readElectionEventsForSsr({}, new AbortController().signal)).resolves.toBeUndefined()
    expect(loggerError).toHaveBeenCalledTimes(1)
  })

  it('let a superseded request’s abort travel on', async () => {
    const abort = new DOMException('aborted', 'AbortError')
    fetchElectionContest.mockRejectedValue(abort)
    await expect(readElectionContestForSsr('k', new AbortController().signal)).rejects.toBe(abort)
  })
})

describe('an event’s server read', () => {
  it('reads the event, then the contests of the day the address names, under one deadline', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    fetchElectionContests.mockResolvedValue(PAGE)
    const search = { data: '2024-06-23', functie: 'mayor' }
    await expect(readElectionEventForSsr('ro:local:2024', search, new AbortController().signal)).resolves.toEqual({
      event: EVENT,
      contests: { occurrenceKey: 'ro:local:2024:2024-06-23', page: PAGE },
    })
    expect(fetchElectionContests).toHaveBeenCalledWith('ro:local:2024:2024-06-23', search, expect.any(AbortSignal))
    expect(fetchElectionContests.mock.calls[0]?.[2]).toBe(fetchElectionEvent.mock.calls[0]?.[1])
  })

  it('reads the first day when the address names none', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    fetchElectionContests.mockResolvedValue(PAGE)
    await readElectionEventForSsr('ro:local:2024', {}, new AbortController().signal)
    expect(fetchElectionContests).toHaveBeenCalledWith('ro:local:2024:2024-06-09', {}, expect.any(AbortSignal))
  })

  it('reads no contests for a date the event has no day on', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    await expect(readElectionEventForSsr('ro:local:2024', { data: '2024-01-01' }, new AbortController().signal)).resolves.toEqual({ event: EVENT })
    expect(fetchElectionContests).not.toHaveBeenCalled()
  })

  it('keeps the event when its contest list fails', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    fetchElectionContests.mockRejectedValue(failure())
    await expect(readElectionEventForSsr('ro:local:2024', {}, new AbortController().signal)).resolves.toEqual({ event: EVENT })
  })

  it('answers a missing event with null and a failed one with nothing, reading no contests either way', async () => {
    fetchElectionEvent.mockResolvedValueOnce(null)
    await expect(readElectionEventForSsr('ro:local:1999', {}, new AbortController().signal)).resolves.toEqual({ event: null })
    fetchElectionEvent.mockRejectedValueOnce(failure())
    await expect(readElectionEventForSsr('ro:local:2024', {}, new AbortController().signal)).resolves.toEqual({})
    expect(fetchElectionContests).not.toHaveBeenCalled()
  })

  it('does not report a missing day’s NOT_FOUND', async () => {
    fetchElectionEvent.mockResolvedValue(EVENT)
    fetchElectionContests.mockRejectedValue(notFound())
    await readElectionEventForSsr('ro:local:2024', {}, new AbortController().signal)
    expect(loggerError).not.toHaveBeenCalled()
  })
})

describe('a contest’s server read', () => {
  it('reads the contest, then its figures and its event side by side', async () => {
    fetchElectionContest.mockResolvedValue(CONTEST)
    fetchElectionResult.mockResolvedValue(RESULT)
    fetchElectionEvent.mockResolvedValue(EVENT)
    await expect(readElectionContestForSsr(CONTEST.contestKey, new AbortController().signal)).resolves.toEqual({ contest: CONTEST, result: RESULT, event: EVENT })
    expect(fetchElectionResult).toHaveBeenCalledWith(CONTEST, expect.any(AbortSignal))
    expect(fetchElectionEvent).toHaveBeenCalledWith('ro:local:2024', expect.any(AbortSignal))
  })

  it('keeps a place without figures as null, apart from a failed read', async () => {
    fetchElectionContest.mockResolvedValue(CONTEST)
    fetchElectionResult.mockResolvedValue(null)
    fetchElectionEvent.mockRejectedValue(failure())
    await expect(readElectionContestForSsr(CONTEST.contestKey, new AbortController().signal)).resolves.toEqual({ contest: CONTEST, result: null })
  })

  it('answers a missing contest with null and reads nothing more', async () => {
    fetchElectionContest.mockResolvedValue(null)
    await expect(readElectionContestForSsr('missing', new AbortController().signal)).resolves.toEqual({ contest: null })
    expect(fetchElectionResult).not.toHaveBeenCalled()
    expect(fetchElectionEvent).not.toHaveBeenCalled()
  })
})
