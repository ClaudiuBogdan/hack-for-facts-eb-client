import { describe, expect, it } from 'vitest'
import { PREDEFINED_ENTITIES } from '@/lib/constants/predefined-entities'
import { localEntityMatches } from './home-refs.search-local'

/**
 * Worth testing despite being a stand-in, for one reason: it is the only path
 * that runs against the *real* fixture rather than against hand-written nodes.
 * `PREDEFINED_ENTITIES` carries genuine diacritics and genuine CUIs, so this is
 * where a folding bug would show up on data nobody wrote to make a test pass.
 */

const names = (term: string) => localEntityMatches(term).map((entity) => entity.name)

describe('localEntityMatches', () => {
  it('finds an accented name from an unaccented query', () => {
    expect(names('iasi')).toEqual(['Mun. Iași'])
    expect(names('timisoara')).toEqual(['Mun. Timișoara'])
    expect(names('sanatatii')).toEqual(['Min. Sănătății'])
  })

  it('finds by partial CUI', () => {
    expect(names('43058')).toEqual(['Mun. Cluj-Napoca'])
  })

  it('returns several, in fixture order', () => {
    // The order is the fixture's, not the query's — there is no relevance
    // ranking here and pretending otherwise would misrepresent the stand-in.
    expect(names('Mun')).toEqual([
      'Mun. Sibiu',
      'Mun. București',
      'Mun. Cluj-Napoca',
      'Mun. Timișoara',
      'Mun. Iași',
    ])
  })

  it('declines rather than guessing when nothing matches', () => {
    // Returning [] is what lets the hook keep the error state, instead of
    // answering an unreachable API with a confidently empty list.
    expect(localEntityMatches('xyzzy')).toEqual([])
  })

  it('declines on an empty or whitespace term', () => {
    expect(localEntityMatches('')).toEqual([])
    expect(localEntityMatches('   ')).toEqual([])
  })

  it('never returns more than the live limit', () => {
    // Every fixture name starts with a letter present in most others; this
    // guards the slice if the fixture grows.
    expect(localEntityMatches('u').length).toBeLessThanOrEqual(8)
  })

  it('returns the fixture nodes themselves, so the rows carry real CUIs', () => {
    const [first] = localEntityMatches('Sibiu')
    expect(PREDEFINED_ENTITIES).toContain(first)
    expect(first.cui).toBe('4270740')
  })
})
