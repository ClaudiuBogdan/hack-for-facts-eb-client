import { describe, expect, it } from 'vitest'
import { alignSeriesByPeriod, describeHubChange } from './hub-format'

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

describe('describeHubChange', () => {
  it('reads counts in percent and years in years', () => {
    const counts = describeHubChange([{ period: '1990', value: 200 }, { period: '2024', value: 100 }], 'persons', '1990')
    expect(counts?.text).toMatch(/50/)
    const years = describeHubChange([{ period: '1990', value: 69.5 }, { period: '2025', value: 77.4 }], 'years', '1990')
    expect(years?.text).toMatch(/7,9|7\.9/)
    expect(years?.text).toMatch(/ani/)
  })

  it('returns null when the anchor year is not in the series', () => {
    expect(describeHubChange([{ period: '2024', value: 1 }], 'persons', '2025')).toBeNull()
  })
})
