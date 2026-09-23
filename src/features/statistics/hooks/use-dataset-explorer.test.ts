import { describe, expect, it } from 'vitest'
import { datasetExplorerQueryOptions, explorerPageKey } from './use-dataset-explorer'

describe('explorerPageKey', () => {
  it('names one catalog page per address, whatever order or leftovers the URL carries', () => {
    const key = explorerPageKey({ q: 'somaj', frecventa: ['MONTHLY', 'ANNUAL'], pagina: 2 })
    expect(explorerPageKey({ pagina: 2, frecventa: ['ANNUAL', 'MONTHLY'], q: 'somaj' })).toBe(key)
    // A chip removed leaves `undefined` behind; the first page is page 1 either way.
    expect(explorerPageKey({ q: 'somaj', context: undefined })).toBe(explorerPageKey({ q: 'somaj', pagina: 1 }))
  })

  it('tells apart addresses that ask for different pages', () => {
    expect(explorerPageKey({ q: 'somaj' })).not.toBe(explorerPageKey({ q: 'salarii' }))
    // Two searches a 32-bit hash of the address sent to one cache entry.
    expect(explorerPageKey({ q: 'populatie' })).not.toBe(explorerPageKey({ q: '5dRbIa' }))
    expect(explorerPageKey({ judet: true })).not.toBe(explorerPageKey({ uat: true }))
    expect(explorerPageKey({ pagina: 1 })).not.toBe(explorerPageKey({ pagina: 2 }))
  })

  it('is the key the page’s query is cached under, so the loader and the page agree', () => {
    const search = { context: '1508', pagina: 3 }
    expect(datasetExplorerQueryOptions(search).queryKey).toEqual(['statistics', 'explorer-v1', 'page', explorerPageKey(search)])
  })
})
