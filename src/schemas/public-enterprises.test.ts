import { describe, expect, it } from 'vitest'
import { parsePublicEnterpriseHubSearch, parsePublicEnterprisePortfolioSearch, resolvePublicEnterpriseHubSearch, resolvePublicEnterprisePortfolioSearch } from './public-enterprises'

describe('parsePublicEnterpriseHubSearch', () => {
  it('reads every choice the hub writes', () => {
    expect(parsePublicEnterpriseHubSearch({ autoritati: 'judete', judete: 'locale', domenii: 'centrale', marime: 'pierdere' })).toEqual({
      autoritati: 'judete',
      judete: 'locale',
      domenii: 'centrale',
      marime: 'pierdere',
    })
  })

  const NONE = { autoritati: undefined, judete: undefined, domenii: undefined, marime: undefined }

  it('keeps a default out of the address', () => {
    expect(parsePublicEnterpriseHubSearch({ autoritati: 'stat', judete: 'toate', domenii: 'toate', marime: 'cifra' })).toEqual(NONE)
  })

  it('opens the default for a value it cannot read, instead of failing the page', () => {
    expect(parsePublicEnterpriseHubSearch({ autoritati: 'primarii', judete: 42, marime: ['cifra'], domenii: 'locale' })).toEqual({ ...NONE, domenii: 'locale' })
  })

  it('names every key the address carried, so a raw value the root route kept cannot survive the merge', () => {
    const parsed = parsePublicEnterpriseHubSearch({ judete: 'nimic', marime: 'cifra' })
    expect(Object.keys(parsed)).toEqual(expect.arrayContaining(['judete', 'marime']))
    const merged: Record<string, unknown> = { ...{ judete: 'nimic', marime: 'cifra', lang: 'en' }, ...parsed }
    expect(merged.judete).toBeUndefined()
    expect(merged.marime).toBeUndefined()
    expect(merged.lang).toBe('en')
  })

  it('leaves the site’s own keys to the root route', () => {
    expect(parsePublicEnterpriseHubSearch({ lang: 'en', q: 'apa' })).toEqual(NONE)
  })

  it('resolves a missing choice to its default', () => {
    expect(resolvePublicEnterpriseHubSearch({ marime: 'pierdere' })).toEqual({ autoritati: 'stat', judete: 'toate', domenii: 'toate', marime: 'pierdere' })
  })
})

describe('the portfolio’s address', () => {
  it('keeps the table’s order and filter, an unknown or default value empty, both keys back', () => {
    expect(parsePublicEnterprisePortfolioSearch({ ordine: 'salariati', lista: 'altele' })).toEqual({ ordine: 'salariati', lista: 'altele' })
    expect(parsePublicEnterprisePortfolioSearch({ ordine: 'pierdere', lista: 'toate' })).toEqual({ ordine: undefined, lista: undefined })
    expect(parsePublicEnterprisePortfolioSearch({ ordine: ['nume'], lista: 7 })).toEqual({ ordine: undefined, lista: undefined })
    expect(resolvePublicEnterprisePortfolioSearch({})).toEqual({ ordine: 'cifra', lista: 'toate' })
    expect(resolvePublicEnterprisePortfolioSearch({ ordine: 'nume' })).toEqual({ ordine: 'nume', lista: 'toate' })
  })
})
