import { describe, expect, it } from 'vitest'
import { parseAppSearch, stringifyAppSearch } from '@/lib/router-search-codec'
import { legalFinderSearchSchema } from '@/schemas/legal-search'
import { hubSearchMore } from './legislation-hub-search-more'

describe('hubSearchMore — the hub search\'s way on to the advanced search (owner, 27 November 2026)', () => {
  it('takes the words to /legislation/search, a number-like one as text through the router\'s codec', () => {
    const target = hubSearchMore(undefined).link('227')
    expect(target).toEqual({ to: '/legislation/search', search: { q: '227' } })
    // what the route reads back from the address the router writes: the same words, as text
    const read = parseAppSearch(stringifyAppSearch(target.search)) as Record<string, unknown>
    expect(legalFinderSearchSchema.parse(read).q).toBe('227')
  })

  it('carries an explicit language of the address, and nothing else for one it does not know', () => {
    expect(hubSearchMore('en').link('cod civil').search).toEqual({ q: 'cod civil', lang: 'en' })
    expect(hubSearchMore('fr').link('cod civil').search).toEqual({ q: 'cod civil' })
  })
})
