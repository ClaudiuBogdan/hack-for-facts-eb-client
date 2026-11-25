import { describe, expect, it } from 'vitest'
import {
  NO_SEARCH_FILTERS,
  activeFilterCount,
  isSearchFiltered,
  portalNameCase,
  readSearchFilters,
  searchArgs,
  searchHitName,
  searchOfFilters,
  usesSummaries,
  withSearchYears,
} from './search-filters'

describe('readSearchFilters', () => {
  it('reads nothing as no filter', () => {
    expect(readSearchFilters({})).toEqual(NO_SEARCH_FILTERS)
  })

  it('keeps only the vocabularies the engine takes, sorted and once', () => {
    const filters = readSearchFilters({ tip: 'oug,lege,doc,lege', domeniu: 'sanatate,munca,munca-si-protectie-sociala', categorie: 'tratat,nimic' })
    expect(filters.tip).toEqual(['lege', 'oug'])
    expect(filters.domeniu).toEqual(['munca-si-protectie-sociala', 'sanatate'])
    expect(filters.categorie).toEqual(['tratat'])
  })

  it('reads the old „include repealed" link as every act, and a named status over it', () => {
    expect(readSearchFilters({ historical: true }).stare).toBe('toate')
    expect(readSearchFilters({ historical: true, stare: 'abrogat' }).stare).toBe('abrogat')
    expect(readSearchFilters({ stare: 'pierdut' }).stare).toBe('implicit')
  })

  it('reads a year, a range and either open end, numbers or text, in order', () => {
    expect(readSearchFilters({ an: 2015 })).toMatchObject({ from: 2015, to: 2015 })
    expect(readSearchFilters({ an: '2015-2024' })).toMatchObject({ from: 2015, to: 2024 })
    expect(readSearchFilters({ an: '2024-2015' })).toMatchObject({ from: 2015, to: 2024 })
    expect(readSearchFilters({ an: '2015-' })).toMatchObject({ from: 2015, to: null })
    expect(readSearchFilters({ an: '-2010' })).toMatchObject({ from: null, to: 2010 })
    expect(readSearchFilters({ an: '1700' })).toMatchObject({ from: null, to: null })
    expect(readSearchFilters({ an: 'ieri' })).toMatchObject({ from: null, to: null })
  })

  it('takes penalties only as true', () => {
    expect(readSearchFilters({ sanctiuni: true }).sanctiuni).toBe(true)
    expect(readSearchFilters({ sanctiuni: 'da' }).sanctiuni).toBe(false)
  })
})

describe('searchOfFilters', () => {
  it('names every key, undefined when off, so a merged search drops what was removed', () => {
    expect(searchOfFilters(NO_SEARCH_FILTERS)).toEqual({
      historical: undefined,
      stare: undefined,
      tip: undefined,
      an: undefined,
      domeniu: undefined,
      categorie: undefined,
      sanctiuni: undefined,
    })
  })

  it('writes one spelling per state and reads back the same filters', () => {
    const cases = [
      { ...NO_SEARCH_FILTERS, stare: 'toate' as const },
      { ...NO_SEARCH_FILTERS, stare: 'abrogat' as const, tip: ['oug', 'lege'] },
      { ...NO_SEARCH_FILTERS, from: 2015, to: 2015 },
      { ...NO_SEARCH_FILTERS, from: 2015, to: null },
      { ...NO_SEARCH_FILTERS, from: null, to: 2010, domeniu: ['sanatate'], categorie: ['lege'], sanctiuni: true },
    ]
    for (const filters of cases) {
      const written = searchOfFilters(filters)
      const read = readSearchFilters(Object.fromEntries(Object.entries(written).filter(([, v]) => v !== undefined)))
      expect(read).toEqual({ ...filters, tip: [...filters.tip].sort() })
    }
    expect(searchOfFilters({ ...NO_SEARCH_FILTERS, stare: 'toate' })).toMatchObject({ historical: true, stare: undefined })
    expect(searchOfFilters({ ...NO_SEARCH_FILTERS, from: 2015, to: 2024 }).an).toBe('2015-2024')
    expect(searchOfFilters({ ...NO_SEARCH_FILTERS, from: 2015, to: 2015 }).an).toBe('2015')
  })
})

describe('searchArgs', () => {
  it('asks the server default with no filter', () => {
    expect(searchArgs(NO_SEARCH_FILTERS)).toEqual({ filter: {}, historical: false })
  })

  it('searches repealed acts too for „Toate" and for any status by name', () => {
    expect(searchArgs({ ...NO_SEARCH_FILTERS, stare: 'toate' })).toEqual({ filter: {}, historical: true })
    expect(searchArgs({ ...NO_SEARCH_FILTERS, stare: 'in-vigoare' })).toEqual({ filter: { status: ['in-vigoare'] }, historical: true })
  })

  it('passes each filter in the adapter shape', () => {
    expect(
      searchArgs({ tip: ['lege'], stare: 'implicit', from: 2015, to: 2024, domeniu: ['sanatate'], categorie: ['tratat'], sanctiuni: true }).filter,
    ).toEqual({ actType: ['lege'], yearFrom: 2015, yearTo: 2024, domain: ['sanatate'], category: ['tratat'], penaltiesMentioned: true })
  })
})

describe('the filter summary', () => {
  it('counts each choice and knows the summary-based ones', () => {
    const filters = { ...NO_SEARCH_FILTERS, tip: ['lege', 'oug'], stare: 'toate' as const, from: 2015, domeniu: ['sanatate'] }
    expect(activeFilterCount(filters)).toBe(5)
    expect(isSearchFiltered(filters)).toBe(true)
    expect(usesSummaries(filters)).toBe(true)
    expect(usesSummaries({ ...NO_SEARCH_FILTERS, tip: ['lege'] })).toBe(false)
    expect(isSearchFiltered(NO_SEARCH_FILTERS)).toBe(false)
  })

  it('keeps a range in order', () => {
    expect(withSearchYears(NO_SEARCH_FILTERS, 2020, 2010)).toMatchObject({ from: 2020, to: 2020 })
  })
})

describe('the act name', () => {
  it('lowers the Portal name’s head in capitals and keeps the rest as written', () => {
    expect(portalNameCase('AMENDAMENTE din 8 decembrie 2006')).toBe('Amendamente din 8 decembrie 2006')
    expect(portalNameCase('COD DE ETICĂ din 29 septembrie 2009')).toBe('Cod de etică din 29 septembrie 2009')
    expect(portalNameCase('AMENDAMENT 08/12/2006')).toBe('Amendament 08/12/2006')
    expect(portalNameCase('ORDIN nr. 1600 al CNAS')).toBe('Ordin nr. 1600 al CNAS')
    expect(portalNameCase('Amendamente din 2010')).toBe('Amendamente din 2010')
  })

  it('names a bare „Doc nr." act by the Portal name, any other by its citation', () => {
    expect(searchHitName({ act: { displayCitation: 'Doc nr. 96765' }, name: 'AMENDAMENTE din 8 decembrie 2006' })).toBe('Amendamente din 8 decembrie 2006')
    expect(searchHitName({ act: { displayCitation: 'Doc nr. 41627' }, name: null })).toBe('Doc nr. 41627')
    expect(searchHitName({ act: { displayCitation: 'Legea nr. 53/2003' }, name: 'CODUL MUNCII' })).toBe('Legea nr. 53/2003')
  })
})
