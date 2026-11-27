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
  /**
   * The page's search as the router builds it: the root's search is passthrough and this route's result is merged
   * over it, so a key this schema leaves out keeps the raw value from the address. Every key must be named.
   */
  const pageSearch = (address: string) => {
    const raw = parseAppSearch(address)
    return { ...raw, ...legalReaderSearchSchema.parse(raw) }
  }

  it('drops the nod of a doc it cannot read: the nod pointed into that document, not the default text (astra-client-12)', () => {
    expect(pageSearch('?doc=true&nod=r10')).toStrictEqual({ doc: undefined, nod: undefined })
    expect(legalReaderSearchSchema.parse({ doc: '', nod: 'r10' })).toStrictEqual({ doc: undefined, nod: undefined })
    expect(legalReaderSearchSchema.parse({ doc: -3, nod: 'r10' })).toStrictEqual({ doc: undefined, nod: undefined })
  })

  it('drops a nod that is not text and opens the text without a jump, keeping the doc it came with (LEGAL-001)', () => {
    // hand-typed, the router reads these as numbers, a boolean, nothing: none is a path
    for (const address of ['?nod=1', '?nod=0.1', '?nod=1.10', '?nod=1e3', '?nod=true', '?nod=null', '?nod=']) {
      expect(pageSearch(address)).toStrictEqual({ doc: undefined, nod: undefined })
    }
    // what the router does not read as a number is still the text typed
    expect(pageSearch('?nod=01')).toStrictEqual({ doc: undefined, nod: '01' })
    expect(pageSearch('?nod=0.1.1')).toStrictEqual({ doc: undefined, nod: '0.1.1' })
    expect(pageSearch('?doc=f900011&nod=1')).toStrictEqual({ doc: 'f900011', nod: undefined })
    expect(pageSearch('?doc=54260&nod=1')).toStrictEqual({ doc: '54260', nod: undefined })
    // an unreadable doc still takes its nod with it, text or not
    expect(pageSearch('?doc=true&nod=1')).toStrictEqual({ doc: undefined, nod: undefined })
  })

  it.each(['0.1', '1', '1.10', '01', 'true', '0.1.1', 'r10'])('keeps the path „%s" when the app writes the link: it is quoted, and comes back as the text it was', (nod) => {
    const address = stringifyAppSearch({ nod })
    expect(pageSearch(address)).toStrictEqual({ doc: undefined, nod })
    expect(pageSearch(stringifyAppSearch({ doc: 'f900011', nod }))).toStrictEqual({ doc: 'f900011', nod })
  })

  it('keeps a nod on its own, and a nod with a doc it reads', () => {
    expect(pageSearch('?nod=r10')).toStrictEqual({ doc: undefined, nod: 'r10' })
    expect(pageSearch('?doc=54260&nod=r10')).toStrictEqual({ doc: '54260', nod: 'r10' })
    expect(legalReaderSearchSchema.parse({ doc: 'f900012' })).toStrictEqual({ doc: 'f900012', nod: undefined })
  })
})
