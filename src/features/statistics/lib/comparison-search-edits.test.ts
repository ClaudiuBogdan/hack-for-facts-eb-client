import { describe, expect, it } from 'vitest'
import { editComparisonSearch, type ComparisonSearchContext } from './comparison-search-edits'

const cluj = { token: 'siruta:54975', code: '54975', level: 'LAU' as const }
const county = { token: 'cod:CJ', code: 'CJ', level: 'NUTS3' as const }
const country = { token: 'cod:RO', code: 'RO', level: 'NATIONAL' as const }

function context(overrides: Partial<ComparisonSearchContext> = {}): ComparisonSearchContext {
  return {
    search: { cod: 'POP107D', teritorii: ['siruta:54975', 'cod:CJ'] },
    example: null,
    tokens: [cluj, county],
    effectivePins: [{ typeCode: 'D1', valueCode: '105' }],
    unitCode: '9685',
    cadence: 'ANNUAL',
    periods: ['2020', '2021', '2022', '2023'],
    ...overrides,
  }
}

describe('editComparisonSearch', () => {
  it('adds a territory as a history entry and refuses a duplicate or a seventh', () => {
    expect(editComparisonSearch(context(), { kind: 'add-territory', token: 'cod:RO' })).toEqual({
      patch: { teritorii: ['siruta:54975', 'cod:CJ', 'cod:RO'] },
      replace: false,
    })
    expect(editComparisonSearch(context(), { kind: 'add-territory', token: 'cod:CJ' })).toBeNull()
    const six = ['B', 'CJ', 'TM', 'IS', 'CT', 'DJ'].map((code) => ({ token: `cod:${code}`, code, level: 'NUTS3' as const }))
    expect(
      editComparisonSearch(context({ tokens: six, search: { cod: 'POP107D', teritorii: six.map((entry) => entry.token) } }), {
        kind: 'add-territory',
        token: 'cod:RO',
      }),
    ).toBeNull()
  })

  it('removes a territory by its token, keeping a malformed neighbour for the reader to fix', () => {
    const edited = editComparisonSearch(
      context({ search: { cod: 'POP107D', teritorii: ['siruta:54975', 'garbage', 'cod:CJ'] } }),
      { kind: 'remove-territory', token: 'cod:CJ' },
    )
    expect(edited).toEqual({ patch: { teritorii: ['siruta:54975', 'garbage'] }, replace: false })
    // The last one out leaves the parameter out, not an empty list.
    expect(
      editComparisonSearch(context({ tokens: [cluj], search: { cod: 'POP107D', teritorii: ['siruta:54975'] } }), {
        kind: 'remove-territory',
        token: 'siruta:54975',
      }),
    ).toEqual({ patch: { teritorii: undefined }, replace: false })
  })

  it('toggles from the map: out when compared, in otherwise', () => {
    expect(editComparisonSearch(context(), { kind: 'toggle-territory', token: 'cod:CJ' })?.patch.teritorii).toEqual(['siruta:54975'])
    expect(editComparisonSearch(context(), { kind: 'toggle-territory', token: 'cod:RO' })?.patch.teritorii).toEqual([
      'siruta:54975',
      'cod:CJ',
      'cod:RO',
    ])
  })

  it('adopts the example on the first edit, so the change is made to the comparison on screen', () => {
    const example = { cod: 'FOM104D', teritorii: ['siruta:54975', 'siruta:95060'] }
    const edited = editComparisonSearch(context({ search: {}, example, tokens: [cluj, { ...cluj, token: 'siruta:95060', code: '95060' }] }), {
      kind: 'add-territory',
      token: 'cod:RO',
    })
    expect(edited?.patch).toEqual({ cod: 'FOM104D', teritorii: ['siruta:54975', 'siruta:95060', 'cod:RO'] })
    expect(editComparisonSearch(context({ search: {}, example }), { kind: 'view', view: 'schimbare' })?.patch).toEqual({
      cod: 'FOM104D',
      teritorii: ['siruta:54975', 'siruta:95060'],
      vedere: 'schimbare',
    })
  })

  it('starts another dataset clean: no coordinates, window or view of the previous one', () => {
    const edited = editComparisonSearch(
      context({ search: { cod: 'POP107D', teritorii: ['cod:CJ'], clasificari: ['D1:105'], din: '2020', vedere: 'schimbare' } }),
      { kind: 'dataset', code: 'FOM104D' },
    )
    expect(edited).toEqual({
      patch: {
        cod: 'FOM104D',
        clasificari: undefined,
        unitate: undefined,
        frecventa: undefined,
        perioada: undefined,
        din: undefined,
        vedere: undefined,
      },
      replace: false,
    })
  })

  it('materialises the resolved selection before pinning one axis, so the defaults are kept, not re-resolved', () => {
    const edited = editComparisonSearch(context(), { kind: 'pin-classification', typeCode: 'D1', valueCode: '107' })
    expect(edited).toEqual({
      patch: { clasificari: ['D1:107'], unitate: '9685', frecventa: 'ANNUAL' },
      replace: true,
    })
    // An explicit null in the URL survives an edit of another axis.
    const explicitNull = editComparisonSearch(context({ search: { cod: 'POP107D', teritorii: ['cod:CJ'], unitate: null } }), {
      kind: 'pin-cadence',
      cadence: 'MONTHLY',
    })
    expect(explicitNull?.patch).toEqual({
      clasificari: ['D1:105'],
      unitate: null,
      frecventa: 'MONTHLY',
      din: undefined,
      perioada: undefined,
    })
    expect(editComparisonSearch(context(), { kind: 'pin-unit', unitCode: null })?.patch.unitate).toBeUndefined()
  })

  it('writes a window by the periods its ends index, and a reset that keeps what is compared', () => {
    expect(editComparisonSearch(context(), { kind: 'window', window: { from: 1, to: 3 } })).toEqual({
      patch: { din: '2021', perioada: '2023' },
      replace: true,
    })
    const reset = editComparisonSearch(context(), { kind: 'reset-source' })
    expect(reset?.replace).toBe(true)
    expect(reset?.patch).not.toHaveProperty('cod')
    expect(reset?.patch).not.toHaveProperty('teritorii')
    expect(Object.values(reset?.patch ?? {}).every((value) => value === undefined)).toBe(true)
  })

  it('never names a territory with a country token the comparison already holds', () => {
    expect(editComparisonSearch(context({ tokens: [country] }), { kind: 'add-territory', token: 'cod:RO' })).toBeNull()
  })
})
