import { describe, expect, it } from 'vitest'
import { hubCountyLayer, hubData } from '../test/hub-fixtures'
import { hubInLocale, hubUnitWord } from './units'

describe('hubInLocale', () => {
  const read = hubData({
    counties: [
      {
        ...hubCountyLayer('CON103H', 'other', 'Milioane kilowati-ora', '2023', []),
        unitLabelEn: 'Millions kilowatts-hour',
      },
    ],
  })

  it('names an unusual unit in English, corrected, on an English page, and in Romanian on a Romanian one', () => {
    const english = hubInLocale(read, 'en')
    const romanian = hubInLocale(read, 'ro')
    expect(english.counties?.[0]?.unitLabel).toBe('Million kilowatt-hours')
    expect(romanian.counties?.[0]?.unitLabel).toBe('Milioane kilowati-ora')
    expect(hubUnitWord('other', english.counties?.[0]?.unitLabel ?? null)).toBe('Million kilowatt-hours')
    const salaried = (hub: typeof read) => hub.indicators?.find((indicator) => indicator.code === 'FOM104D')?.unitLabel
    expect(salaried(english)).toBe('Number of persons')
    expect(salaried(romanian)).toBe('Numar persoane')
  })

  it('keeps the Romanian name where INS gives no English one, and a failed section failed', () => {
    const bare = hubData({
      indicators: null,
      counties: [hubCountyLayer('CON103H', 'other', 'Milioane kilowati-ora', '2023', [])],
      failures: ['indicators'],
    })
    const english = hubInLocale(bare, 'en')
    expect(english.counties?.[0]?.unitLabel).toBe('Milioane kilowati-ora')
    expect(english.indicators).toBeNull()
    expect(english.failures).toEqual(['indicators'])
  })

  it('leaves the read itself as it was: the cache serves both languages', () => {
    hubInLocale(read, 'en')
    expect(read.counties?.[0]?.unitLabel).toBe('Milioane kilowati-ora')
  })
})
