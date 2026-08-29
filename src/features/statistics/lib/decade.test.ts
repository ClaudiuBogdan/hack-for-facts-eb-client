import { describe, expect, it } from 'vitest'
import type { StatisticsDecadeObservation } from '@/schemas/statistics'
import { buildDecadeStory } from './decade'

const row = (
  countyCode: string,
  year: number,
  value: string | null,
  countyName = countyCode,
): StatisticsDecadeObservation => ({
  countyCode,
  countyName,
  year,
  value,
  unitNameRo: 'Numar persoane',
})

describe('buildDecadeStory', () => {
  it('ranks declines and gains by percent change', () => {
    const story = buildDecadeStory({
      rows: [
        row('CJ', 2016, '691106'),
        row('CJ', 2025, '736302'),
        row('TR', 2016, '360178'),
        row('TR', 2025, '297372'),
        row('IF', 2016, '388738'),
        row('IF', 2025, '542686'),
      ],
      startYear: 2016,
      endYear: 2025,
    })

    expect(story.gains.map((c) => c.countyCode)).toEqual(['IF', 'CJ'])
    expect(story.declines.map((c) => c.countyCode)).toEqual(['TR'])
    expect(story.gains[0]?.pctChange).toBeCloseTo(39.6, 1)
    expect(story.declines[0]?.pctChange).toBeCloseTo(-17.4, 1)
    expect(story.rankedCount).toBe(3)
    // 42 − ranked: counties absent from the payload count as excluded too.
    expect(story.excludedCount).toBe(39)
    expect(story.maxAbsChange).toBeCloseTo(39.6, 1)
  })

  it('EXCLUDES counties missing an endpoint year — never zero-fills', () => {
    const story = buildDecadeStory({
      rows: [
        row('CJ', 2016, '100'),
        row('CJ', 2025, '110'),
        row('XX', 2025, '5000'),
        row('YY', 2016, null),
        row('YY', 2025, '5000'),
      ],
      startYear: 2016,
      endYear: 2025,
    })

    expect(story.rankedCount).toBe(1)
    expect(story.excludedCount).toBe(41)
    expect(story.gains.map((c) => c.countyCode)).toEqual(['CJ'])
    expect(story.declines).toEqual([])
  })

  it('caps each list at five entries', () => {
    const rows: StatisticsDecadeObservation[] = []
    for (let index = 0; index < 8; index += 1) {
      rows.push(row(`G${index}`, 2016, '100'))
      rows.push(row(`G${index}`, 2025, String(110 + index)))
      rows.push(row(`D${index}`, 2016, '100'))
      rows.push(row(`D${index}`, 2025, String(90 - index)))
    }

    const story = buildDecadeStory({ rows, startYear: 2016, endYear: 2025 })

    expect(story.gains).toHaveLength(5)
    expect(story.declines).toHaveLength(5)
    // Most extreme first on both sides.
    expect(story.gains[0]?.countyCode).toBe('G7')
    expect(story.declines[0]?.countyCode).toBe('D7')
  })

  it('ignores rows from non-endpoint years', () => {
    const story = buildDecadeStory({
      rows: [
        row('CJ', 2016, '100'),
        row('CJ', 2020, '9999'),
        row('CJ', 2025, '110'),
      ],
      startYear: 2016,
      endYear: 2025,
    })

    expect(story.gains[0]?.startValue).toBe(100)
    expect(story.gains[0]?.endValue).toBe(110)
  })
})
