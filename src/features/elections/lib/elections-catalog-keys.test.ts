import { hashKey } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { event as eventOf, day } from '../test/catalog-fixtures'
import { ballotDaysOf, selectBallotDay } from './election-days'
import { electionsCatalogKeys, seedKeyOf } from './elections-catalog-keys'

vi.mock('../api/elections-catalog-api', () => ({
  fetchElectionEvents: vi.fn(),
  fetchElectionEvent: vi.fn(),
  fetchElectionContest: vi.fn(),
  fetchElectionContests: vi.fn(),
  fetchElectionResult: vi.fn(),
}))

const { electionContestsQueryOptions } = await import('../hooks/use-elections-catalog')

describe('the events key', () => {
  it('carries the page and the page size, one entry however the address spells the first page', () => {
    expect(electionsCatalogKeys.events({ pagina: 2 })).toEqual(['elections-catalog', 'events', { page: 2, pageSize: 20 }])
    expect(hashKey(electionsCatalogKeys.events({ pagina: 1 }))).toBe(hashKey(electionsCatalogKeys.events({})))
  })
})

describe('a day’s contests key', () => {
  it('carries the day’s key, the filters, the page and the page size, and not the date', () => {
    expect(electionsCatalogKeys.contests('ro:local:2024:2024-06-09', { data: '2024-06-09', functie: 'mayor', arie: 'uat', judet: 'CJ', pagina: 3 })).toEqual([
      'elections-catalog',
      'contests',
      'ro:local:2024:2024-06-09',
      { office: 'mayor', placeType: 'uat', county: 'CJ', page: 3, pageSize: 20 },
    ])
    expect(hashKey(electionsCatalogKeys.contests('d', { data: '2024-06-09' }))).toBe(hashKey(electionsCatalogKeys.contests('d', {})))
  })

  it('tells every filter and page apart', () => {
    const keys = [{}, { functie: 'mayor' }, { arie: 'uat' as const }, { judet: 'CJ' }, { pagina: 2 }, { functie: 'mayor', judet: 'CJ' }].map((search) =>
      hashKey(electionsCatalogKeys.contests('d', search)),
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('never lets a colon in a key run two values together', () => {
    const pairs = [
      [electionsCatalogKeys.contests('a:b', {}), electionsCatalogKeys.contests('a', { functie: 'b' })],
      [electionsCatalogKeys.event('contest:x'), electionsCatalogKeys.contest('x')],
    ] as const
    for (const [first, second] of pairs) expect(hashKey(first)).not.toBe(hashKey(second))
  })
})

describe('the seed guard', () => {
  it('matches only the key the read was for', () => {
    const seed = seedKeyOf(electionsCatalogKeys.contests('d', { judet: 'CJ' }))
    expect(seedKeyOf(electionsCatalogKeys.contests('d', { judet: 'CJ', pagina: 1 }))).toBe(seed)
    expect(seedKeyOf(electionsCatalogKeys.contests('d', { judet: 'B' }))).not.toBe(seed)
    expect(seedKeyOf(electionsCatalogKeys.contests('e', { judet: 'CJ' }))).not.toBe(seed)
  })
})

describe('the contests list while the next page loads', () => {
  const placeholderOf = (occurrenceKey: string) =>
    electionContestsQueryOptions(occurrenceKey, {}).placeholderData as unknown as (previous: unknown, previousQuery: { readonly queryKey: readonly unknown[] } | undefined) => unknown
  const previousPage = { items: [], page: 1, pageSize: 20, total: 0, hasMore: false }

  it('keeps the same day’s rows', () => {
    const previousQuery = { queryKey: electionsCatalogKeys.contests('ro:local:2024:2024-06-09', { pagina: 2 }) }
    expect(placeholderOf('ro:local:2024:2024-06-09')(previousPage, previousQuery)).toBe(previousPage)
  })

  it('never shows another day’s rows as this one’s', () => {
    const previousQuery = { queryKey: electionsCatalogKeys.contests('ro:local:2024:2024-06-23', {}) }
    expect(placeholderOf('ro:local:2024:2024-06-09')(previousPage, previousQuery)).toBeUndefined()
  })
})

describe('the ballot days', () => {
  const event = eventOf({ occurrences: [day('2024-07-07', { kind: 'repeat' }), day('2024-06-09'), day('2024-06-23', { kind: 'runoff' })] })

  it('run earliest first, whatever the API’s order', () => {
    expect(ballotDaysOf(event).map((entry) => entry.ballotDate)).toEqual(['2024-06-09', '2024-06-23', '2024-07-07'])
  })

  it('are chosen by date, the first when none is named, and none for a date the event lacks', () => {
    expect(selectBallotDay(event, '2024-06-23')?.kind).toBe('runoff')
    expect(selectBallotDay(event, undefined)?.ballotDate).toBe('2024-06-09')
    expect(selectBallotDay(event, '2024-01-01')).toBeNull()
    expect(selectBallotDay(eventOf({ occurrences: [] }), undefined)).toBeNull()
  })
})
