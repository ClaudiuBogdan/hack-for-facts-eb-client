import { describe, expect, it } from 'vitest'
import { legalChangesSearchSchema } from '@/schemas/legal-search'
import { changesSearchOf, changesSearchOfOld, changesStateOf, type ChangesState } from './legal-changes-address'

const parse = (search: Record<string, unknown>) => legalChangesSearchSchema.parse(search)

describe('the Modificări address', () => {
  it('reads fila, fel, de, pana', () => {
    expect(changesStateOf(parse({ fila: 'legi-noi', fel: 'promulgare,aprobare-oug', de: '2026-01-01', pana: '2026-06-30' }))).toEqual({
      tab: 'legi-noi',
      kinds: ['promulgare', 'aprobare-oug'],
      since: '2026-01-01',
      until: '2026-06-30',
    })
    expect(changesStateOf(parse({}))).toEqual({ tab: 'schimbari', kinds: [], since: null, until: null })
  })

  it('drops unknown kinds and bad dates', () => {
    expect(changesStateOf(parse({ fila: 'altceva', fel: 'modificare,nimic,modificare', de: '2026-02-31', pana: 'ieri' }))).toEqual({
      tab: 'schimbari',
      kinds: ['modificare'],
      since: null,
      until: null,
    })
  })

  it('has no period under „Fără dată"', () => {
    expect(changesStateOf(parse({ fila: 'fara-data', de: '2026-01-01' }))).toMatchObject({ tab: 'fara-data', since: null, until: null })
  })

  it.each<ChangesState>([
    { tab: 'schimbari', kinds: [], since: null, until: null },
    { tab: 'schimbari', kinds: ['modificare', 'completare'], since: '2026-01-01', until: null },
    { tab: 'legi-noi', kinds: ['promulgare'], since: null, until: '2026-06-30' },
    { tab: 'fara-data', kinds: ['abrogare-totala'], since: null, until: null },
  ])('round-trips %o', (state) => {
    expect(changesStateOf(parse(changesSearchOf(state)))).toEqual(state)
  })

  it('writes nothing for the default state, and names every key so none is merged over', () => {
    const search = changesSearchOf({ tab: 'schimbari', kinds: [], since: null, until: null })
    expect(Object.values(search).every((value) => value === undefined)).toBe(true)
    expect(Object.keys(search).sort()).toEqual(['de', 'fel', 'fila', 'kind', 'pana', 'since', 'source', 'until', 'view'])
  })
})

describe('old Modificări links', () => {
  it('leaves a link with no old key alone', () => {
    expect(changesSearchOfOld({ fila: 'legi-noi', lang: 'en' })).toBeNull()
  })

  it('forwards an undated view without its window', () => {
    expect(changesSearchOfOld({ view: 'nedatate', since: '2026-01-01', until: '2026-06-30' })).toEqual({ fila: 'fara-data' })
    expect(changesSearchOfOld({ view: 'nedatate', kind: 'abrogare-totala' })).toEqual({ fila: 'fara-data', fel: 'abrogare-totala' })
  })

  it('forwards kind=promulgare to the new-laws tab', () => {
    expect(changesSearchOfOld({ kind: 'promulgare' })).toEqual({ fila: 'legi-noi', fel: 'promulgare' })
    // A new-law kind wins over the undated view: no new law is undated, and the undated tab would widen to every kind.
    expect(changesSearchOfOld({ view: 'nedatate', kind: 'promulgare' })).toEqual({ fila: 'legi-noi', fel: 'promulgare' })
    expect(changesSearchOfOld({ kind: 'modificare', since: '2026-01-01', until: '2026-06-30' })).toEqual({ fel: 'modificare', de: '2026-01-01', pana: '2026-06-30' })
  })

  it('drops source and the upcoming or whole views', () => {
    expect(changesSearchOfOld({ view: 'viitoare' })).toEqual({})
    expect(changesSearchOfOld({ view: 'toate', source: 'portal' })).toEqual({})
    expect(changesSearchOfOld({ kind: 'nimic', since: '2026-02-31' })).toEqual({})
  })

  it('keeps lang', () => {
    expect(changesSearchOfOld({ view: 'nedatate', lang: 'en' })).toEqual({ fila: 'fara-data', lang: 'en' })
  })
})
