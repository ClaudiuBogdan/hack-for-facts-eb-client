import { describe, expect, it } from 'vitest'

import { DEFAULTS, TABS, itemOfRand, nextSearch, parseAdvanced, randOfItem } from './analytics-state'

describe('the analysis page address', () => {
  it('reads the bare address as the defaults', () => {
    expect(parseAdvanced({})).toEqual(DEFAULTS)
  })

  it('opens each population on its first tab, and refuses a tab that is not its own', () => {
    expect(parseAdvanced({ tip: 'sold' }).dupa).toBe('timp')
    expect(parseAdvanced({ tip: 'lege', dupa: 'categorii' }).dupa).toBe('fonduri')
    expect(parseAdvanced({ tip: 'ministere', dupa: 'platit' }).dupa).toBe('aprobat')
    expect(TABS.ministere).toEqual(['aprobat'])
  })

  it('reads the values the router parsed as JSON back into the page’s own', () => {
    expect(parseAdvanced({ perioada: 2025, cumulat: false, rand: 2, an: '2024' })).toMatchObject({ perioada: '2025', cumulat: false, rand: '2', an: 2024 })
    expect(parseAdvanced({ cumulat: 'false' }).cumulat).toBe(false)
    expect(parseAdvanced({ cumulat: 0 }).cumulat).toBe(false)
  })

  it('falls back to a default for a value it cannot read, never to an error', () => {
    expect(parseAdvanced({ tip: 'altceva', pas: 'zi', an: 1890, buget: 'nope', fond: 3, perioada: '2026-13' })).toEqual(DEFAULTS)
  })

  it('writes only what differs from the defaults', () => {
    expect(nextSearch({ lang: 'en', tip: 'venituri' }, { tip: 'cheltuieli', pas: 'luna', rand: null })).toEqual({ lang: 'en', pas: 'luna' })
  })

  it('writes a year or a code as a number, a month or a zero-led code as text', () => {
    expect(nextSearch({}, { perioada: '2024' })).toEqual({ perioada: 2024 })
    expect(nextSearch({}, { perioada: '2026-07' })).toEqual({ perioada: '2026-07' })
    expect(nextSearch({}, { rand: '25' })).toEqual({ rand: 25 })
    expect(nextSearch({}, { rand: '0100' })).toEqual({ rand: '0100' })
    expect(nextSearch({}, { rand: 'expenditure.interest' })).toEqual({ rand: 'expenditure.interest' })
    expect(parseAdvanced(nextSearch({}, { rand: '25' })).rand).toBe('25')
  })

  it('drops a value the page couldn’t read at the first change, whatever its type', () => {
    expect(nextSearch({ tip: 'altceva', perioada: 'ieri', lang: 'en' }, { dupa: 'timp' })).toEqual({ lang: 'en', dupa: 'timp' })
    expect(nextSearch({ tip: true, an: { year: 2025 } }, { pas: 'luna' })).toEqual({ pas: 'luna' })
    expect(nextSearch({ tip: 7 }, { perioada: '2024' })).toEqual({ perioada: 2024 })
  })

  it('keeps a tab across populations only where the new one has it', () => {
    expect(nextSearch({ dupa: 'timp' }, { tip: 'venituri' })).toEqual({ tip: 'venituri', dupa: 'timp' })
    expect(nextSearch({ dupa: 'bugete' }, { tip: 'lege' })).toEqual({ tip: 'lege' })
  })

  it('leaves out a tab that is its population’s first', () => {
    expect(nextSearch({ dupa: 'timp' }, { tip: 'sold' })).toEqual({ tip: 'sold' })
    expect(nextSearch({}, { tip: 'lege', dupa: 'capitole' })).toEqual({ tip: 'lege', dupa: 'capitole' })
  })

  it('carries an item in the address without its prefix', () => {
    expect(randOfItem('mfin.bgc.expenditure.interest')).toBe('expenditure.interest')
    expect(itemOfRand('expenditure.interest')).toBe('mfin.bgc.expenditure.interest')
    expect(itemOfRand(null)).toBeNull()
  })
})
