import { describe, expect, it, vi } from 'vitest'
import {
  alignSeriesByPeriod,
  annualInflationRate,
  deathsExceedBirthsSince,
  describeAgainstNational,
  describeHubDelta,
  formatHubSigned,
  formatHubValue,
  hubUnitWord,
  sameMonthLastYear,
  sharedDecimals,
  sourceDecimals,
} from './hub-format'

vi.mock('./format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./format')>()
  return { ...actual, activeNumberLocale: () => 'ro-RO' }
})

describe('alignSeriesByPeriod', () => {
  it('places each point at its period, so a year one series lacks is a gap, not a shift', () => {
    const aligned = alignSeriesByPeriod(
      [
        { period: '2024', value: 1 },
        { period: '2025', value: 2 },
        { period: '2026', value: 3 },
      ],
      [
        { period: '2024', value: 10 },
        { period: '2025', value: 20 },
      ],
    )
    expect(aligned.periods).toEqual(['2024', '2025', '2026'])
    expect(aligned.a).toEqual([1, 2, 3])
    expect(aligned.b).toEqual([10, 20, null])
  })

  it('sorts the union of periods and tolerates a series that starts later', () => {
    const aligned = alignSeriesByPeriod([{ period: '2003', value: 5 }], [{ period: '1990', value: 1 }, { period: '2003', value: 2 }])
    expect(aligned.periods).toEqual(['1990', '2003'])
    expect(aligned.a).toEqual([null, 5])
    expect(aligned.b).toEqual([1, 2])
  })
})

describe('describeHubDelta', () => {
  it('reads counts in percent, years in years and a percent in points, to one decimal', () => {
    expect(describeHubDelta(314746, 145725, 'persons')).toBe('-53,7%')
    expect(describeHubDelta(8006349, 10177161, 'count')).toBe('+27,1%')
    expect(describeHubDelta(69.56, 77.45, 'years')).toBe('+7,9 ani')
    expect(describeHubDelta(3.3, 3.3, 'percent')).toBe('0,0 pp')
  })

  it('signs a count’s change by its direction, whatever the sign of where it starts', () => {
    expect(describeHubDelta(-100, -50, 'count')).toBe('+50,0%')
  })

  it('has no percent change from zero', () => {
    expect(describeHubDelta(0, 10, 'persons')).toBeNull()
    expect(describeHubDelta(0, 10, 'years')).toBe('+10,0 ani')
  })

  it('signs a difference', () => {
    expect(formatHubSigned(-93966)).toBe('-93.966')
    expect(formatHubSigned(67660)).toBe('+67.660')
    expect(formatHubSigned(0)).toBe('0')
  })
})

describe('the headline helpers', () => {
  it('keeps the precision the source published', () => {
    expect(sourceDecimals('110.85')).toBe(2)
    expect(sourceDecimals('3.2')).toBe(1)
    expect(sourceDecimals('5914')).toBe(0)
    expect(sourceDecimals(null)).toBe(0)
  })

  it('states annual inflation as the index less 100, without float noise', () => {
    expect(annualInflationRate(110.85, 2)).toBe(10.85)
    expect(annualInflationRate(99.4, 1)).toBe(-0.6)
    expect(annualInflationRate(100, 0)).toBe(0)
  })

  it('names the base month of a year-on-year index, and nothing for a year', () => {
    expect(sameMonthLastYear('2026-05')).toBe('2025-05')
    expect(sameMonthLastYear('2026-01')).toBe('2025-01')
    expect(sameMonthLastYear('2025')).toBeNull()
  })

  it('says „lei" for the currency INS spells „Lei RON", and keeps any other unit verbatim', () => {
    expect(hubUnitWord('other', 'Lei RON')).toBe('lei')
    expect(hubUnitWord('other', 'Kilometri')).toBe('Kilometri')
  })
})

describe('deathsExceedBirthsSince', () => {
  const points = (values: readonly (readonly [string, number])[]) => values.map(([period, value]) => ({ period, value }))

  it('dates the unbroken run of years with more deaths than births that reaches the latest year', () => {
    const births = points([['1990', 300], ['1991', 280], ['1992', 250], ['1993', 240]])
    const deaths = points([['1990', 250], ['1991', 290], ['1992', 240], ['1993', 260]])
    // 1991 had more deaths, but 1992 broke the run.
    expect(deathsExceedBirthsSince(births, deaths)).toBe('1993')
  })

  it('says nothing when the latest year had more births', () => {
    expect(deathsExceedBirthsSince(points([['2024', 10], ['2025', 12]]), points([['2024', 11], ['2025', 11]]))).toBeNull()
  })

  it('does not bridge a year one series lacks', () => {
    const births = points([['2022', 10], ['2024', 10], ['2025', 10]])
    const deaths = points([['2022', 20], ['2023', 20], ['2024', 20], ['2025', 20]])
    expect(deathsExceedBirthsSince(births, deaths)).toBe('2024')
  })

  it('does not bridge a year both series lack', () => {
    const births = points([['2024', 10], ['2025', 10], ['2027', 10]])
    const deaths = points([['2024', 20], ['2025', 20], ['2027', 20]])
    expect(deathsExceedBirthsSince(births, deaths)).toBe('2027')
  })

  it('ends at the latest year both series have', () => {
    const births = points([['2023', 10], ['2024', 10]])
    const deaths = points([['2023', 20], ['2024', 20], ['2025', 5]])
    expect(deathsExceedBirthsSince(births, deaths)).toBe('2023')
  })
})

describe('a county against the country', () => {
  it('shows every figure of a set with the decimals the set carries', () => {
    expect(sharedDecimals([9.3, 1, 0.5])).toBe(1)
    expect(sharedDecimals([82.01, 79.68, 77.45])).toBe(2)
    expect(sharedDecimals([1053348, 38238])).toBe(0)
    expect(sharedDecimals([1.23456])).toBe(2)
    expect(formatHubValue(1, 'percent', 'Procente', { digits: 1 }).value).toBe('1,0%')
    expect(formatHubValue(79.6, 'years', 'Ani', { digits: 2 })).toEqual({ value: '79,60', unit: 'ani' })
  })

  it('measures a rate or an average in its own unit, a percent in points', () => {
    expect(describeAgainstNational(82.01, 77.45, 'years', 'Ani', 2)).toBe('+4,56 ani față de România')
    expect(describeAgainstNational(75.21, 77.45, 'years', 'Ani', 2)).toBe('-2,24 ani față de România')
    expect(describeAgainstNational(9.3, 3.3, 'percent', 'Procente', 1)).toBe('+6,0 pp față de România')
  })

  it('reads a count as its share of the country’s total, never as a difference from it', () => {
    expect(describeAgainstNational(1053348, 5453155, 'persons', 'Numar persoane', 0)).toBe('19,3% din totalul țării')
    expect(describeAgainstNational(10, 0, 'count', null, 0)).toBeNull()
  })
})
