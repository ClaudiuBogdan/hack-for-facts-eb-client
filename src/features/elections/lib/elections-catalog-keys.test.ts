import { hashKey } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { electionsCatalogKeys, seedKeyOf } from './elections-catalog-keys'

vi.mock('../api/elections-catalog-api', () => ({
  fetchElectionCatalog: vi.fn(),
  fetchElectionContest: vi.fn(),
  fetchElectionContests: vi.fn(),
  fetchElectionEdition: vi.fn(),
}))

const { electionContestsQueryOptions } = await import('../hooks/use-elections-catalog')

describe('the catalog key', () => {
  it('carries the filters, the page and the page size', () => {
    expect(electionsCatalogKeys.catalog({ an: 2024, tip: 'local', pagina: 2 })).toEqual([
      'elections-catalog',
      'catalog',
      { year: 2024, family: 'local', page: 2, pageSize: 20 },
    ])
  })

  it('is one entry for the default view however the address spells it', () => {
    const plain = hashKey(electionsCatalogKeys.catalog({}))
    expect(hashKey(electionsCatalogKeys.catalog({ an: undefined, tip: undefined, pagina: undefined }))).toBe(plain)
    expect(hashKey(electionsCatalogKeys.catalog({ pagina: 1 }))).toBe(plain)
  })

  it('tells every filter and page apart', () => {
    const keys = [{}, { an: 2024 }, { tip: 'local' }, { tip: 'Local' }, { tip: ' local' }, { pagina: 2 }, { an: 2024, tip: 'local' }].map((search) =>
      hashKey(electionsCatalogKeys.catalog(search)),
    )
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('an edition’s contests key', () => {
  it('carries the edition’s key, the filters, the page and the page size', () => {
    expect(electionsCatalogKeys.contests('bec-local-2024', { functie: 'mayor', arie: 'county', tur: 'tur1', pagina: 3 })).toEqual([
      'elections-catalog',
      'contests',
      'bec-local-2024',
      { office: 'mayor', scope: 'county', round: 'tur1', page: 3, pageSize: 20 },
    ])
  })

  it('never lets a comma or a colon in a label or key run two values together', () => {
    const pairs = [
      [electionsCatalogKeys.contests('a', { functie: 'b,c' }), electionsCatalogKeys.contests('a', { functie: 'b', tur: 'c' })],
      [electionsCatalogKeys.contests('a:b', {}), electionsCatalogKeys.contests('a', { functie: 'b' })],
      [electionsCatalogKeys.edition('contest:x'), electionsCatalogKeys.contest('x')],
    ] as const
    for (const [first, second] of pairs) expect(hashKey(first)).not.toBe(hashKey(second))
  })
})

describe('the seed guard', () => {
  it('matches only the key the read was for', () => {
    const seed = seedKeyOf(electionsCatalogKeys.catalog({ an: 2024 }))
    expect(seedKeyOf(electionsCatalogKeys.catalog({ an: 2024, pagina: 1 }))).toBe(seed)
    expect(seedKeyOf(electionsCatalogKeys.catalog({ an: 2020 }))).not.toBe(seed)
  })
})

describe('the contests list while the next page loads', () => {
  const placeholderOf = (electionKey: string) =>
    electionContestsQueryOptions(electionKey, {}).placeholderData as unknown as (previous: unknown, previousQuery: { readonly queryKey: readonly unknown[] } | undefined) => unknown
  const previousPage = { items: [], page: 1, pageSize: 20, total: 0, hasMore: false }

  it('keeps the same edition’s rows', () => {
    const previousQuery = { queryKey: electionsCatalogKeys.contests('bec-local-2024', { pagina: 2 }) }
    expect(placeholderOf('bec-local-2024')(previousPage, previousQuery)).toBe(previousPage)
  })

  it('never shows another edition’s rows as this one’s', () => {
    const previousQuery = { queryKey: electionsCatalogKeys.contests('bec-local-2020', {}) }
    expect(placeholderOf('bec-local-2024')(previousPage, previousQuery)).toBeUndefined()
  })
})
