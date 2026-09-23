import { describe, expect, it } from 'vitest'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import {
  countyDirectorySearch,
  countyName,
  hubLayerDecimals,
  missingCounties,
  rankCounties,
  registryCountyName,
} from './hub-counties'

describe('hub counties', () => {
  it('spells a county as the registry does, which is how the directory facet names it', () => {
    // The facet keys the API returned on 23 September 2026.
    expect(registryCountyName('B')).toBe('Bucureşti')
    expect(registryCountyName('TM')).toBe('Timiş')
    expect(registryCountyName('BN')).toBe('Bistriţa-Năsăud')
    expect(registryCountyName('CJ')).toBe('Cluj')
  })

  it('opens the directory on the county’s companies in business', () => {
    expect(countyDirectorySearch('CT')).toEqual({ county: ['Constanţa'], status: ['1048'] })
  })

  it('names a county by its code and leaves an unknown code as itself', () => {
    expect(countyName('IS')).toBe('Iași')
    expect(countyName('XX')).toBe('XX')
  })

  it('ranks highest first without reordering its input', () => {
    const values = [
      { code: 'AB', value: 3 },
      { code: 'AR', value: 9 },
    ]
    expect(rankCounties(values).map((county) => county.code)).toEqual(['AR', 'AB'])
    expect(values[0]?.code).toBe('AB')
  })

  it('gives a rate its decimal and a count none', () => {
    expect(hubLayerDecimals({ unit: 'per-thousand', national: 91.9, values: [{ code: 'B', value: 199.6 }] })).toBe(1)
    expect(hubLayerDecimals({ unit: 'firms', national: 153_618, values: [{ code: 'B', value: 34_169 }] })).toBe(0)
  })

  it('names the counties a layer has no figure for', () => {
    const all = ROMANIA_COUNTIES.map((county) => ({ code: county.code, value: 1 }))
    expect(missingCounties({ unit: 'firms', national: 42, values: all })).toEqual([])
    expect(missingCounties({ unit: 'firms', national: 41, values: all.filter((county) => county.code !== 'VS') })).toEqual(['VS'])
  })
})
