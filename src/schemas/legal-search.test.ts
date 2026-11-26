import { describe, expect, it } from 'vitest'
import { parseAppSearch, stringifyAppSearch } from '@/lib/router-search-codec'
import { legalFinderSearchSchema, legalReaderSearchSchema } from './legal-search'

/** An address as the hydrated router writes it, then read back as a new page load reads it. */
const roundTrip = (search: Record<string, unknown>) => parseAppSearch(stringifyAppSearch(search))

/**
 * The search pages' addresses through the app's real codec (`router-search-codec.ts`), not a stand-in encoder: a
 * shared link must come back as the values it was written from (review astra-client-11).
 */
describe('the search addresses through the router codec', () => {
  it.each(['227', '1.10', 'true', 'null', 'Legea 98/2016', 'concediu de odihnă', '"citat"'])('keeps the question „%s" as the text typed', (q) => {
    expect(legalFinderSearchSchema.parse(roundTrip({ q, tip: 'lege', an: '2015-' }))).toEqual({ q, tip: 'lege', an: '2015-' })
  })

  it('keeps a question a native form sent bare as the word typed, and the address the server writes for it', () => {
    // the server's canonical redirect re-writes the validated search: `?q=true` must become the text, not vanish
    const read = legalFinderSearchSchema.parse(parseAppSearch('?q=true&tip=lege'))
    expect(read).toEqual({ q: 'true', tip: 'lege' })
    expect(stringifyAppSearch(read)).toBe('?q=%22true%22&tip=lege')
    // a number keeps its value, not its spelling: the codec reads `1.10` as 1.1 before the schema runs
    expect(legalFinderSearchSchema.parse(parseAppSearch('?q=1.10')).q).toBe('1.1')
  })

  it.each([
    ['f900012', 'r10'],
    ['54260', '10'],
    ['f900012', '0.1.1.10'],
  ])('keeps a provision link’s doc %s and nod %s', (doc, nod) => {
    expect(legalReaderSearchSchema.parse(roundTrip({ doc, nod }))).toEqual({ doc, nod })
  })
})

describe('legalReaderSearchSchema', () => {
  it('drops the nod of a doc it cannot read: the nod pointed into that document, not the default text (astra-client-12)', () => {
    expect(legalReaderSearchSchema.parse(parseAppSearch('?doc=true&nod=r10'))).toEqual({})
    expect(legalReaderSearchSchema.parse({ doc: '', nod: 'r10' })).toEqual({})
    expect(legalReaderSearchSchema.parse({ doc: -3, nod: 'r10' })).toEqual({})
  })

  it('keeps a nod on its own, and a nod with a doc it reads', () => {
    expect(legalReaderSearchSchema.parse(parseAppSearch('?nod=r10'))).toEqual({ nod: 'r10' })
    expect(legalReaderSearchSchema.parse(parseAppSearch('?doc=54260&nod=r10'))).toEqual({ doc: '54260', nod: 'r10' })
    expect(legalReaderSearchSchema.parse({ doc: 'f900012' })).toEqual({ doc: 'f900012' })
  })
})
