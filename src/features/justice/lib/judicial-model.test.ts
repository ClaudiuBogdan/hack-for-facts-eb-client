import { describe, expect, it } from 'vitest'
import { mergedMatters, stageKeyOf, yearBars, yearOf } from './judicial-model'

describe('mergedMatters', () => {
  it('reads the ÎCCJ label and the Portal code of a matter as one row, largest first', () => {
    const matters = mergedMatters([
      { key: 'Civil', count: 10 },
      { key: 'Contenciosadministrativsifiscal', count: 6 },
      { key: 'Contencios administrativ şi fiscal', count: 4 },
      { key: 'Penal', count: 0 },
    ])
    expect(matters.map((matter) => [matter.key, matter.count])).toEqual([
      ['civil', 10],
      ['contenciosadministrativsifiscal', 10],
    ])
    expect(matters.reduce((sum, matter) => sum + matter.share, 0)).toBeCloseTo(1)
  })

  it('gives no share to groups that total nothing', () => {
    expect(mergedMatters([])).toEqual([])
  })
})

describe('stageKeyOf', () => {
  it('names the four counted stages and gathers the rest as extraordinary remedies', () => {
    expect(stageKeyOf('Fond')).toBe('fond')
    expect(stageKeyOf('ContestaţieNCPP')).toBe('contestatie')
    expect(stageKeyOf('RevizuireApel')).toBe('extraordinare')
  })
})

describe('yearBars', () => {
  it('draws only real years in the window, partial before the capture went whole, the last one running', () => {
    const bars = yearBars(
      [
        { key: '2025', count: 5 },
        { key: '(none)', count: 3 },
        { key: 'infinity', count: 1 },
        { key: '2018', count: 2 },
        { key: '2022', count: 4 },
        { key: '2026', count: 1 },
        { key: '2027', count: 1 },
      ],
      { from: 2019, lastYear: 2026, firstWholeYear: 2023 },
    )
    expect(bars.map((bar) => [bar.year, bar.partial, bar.running])).toEqual([
      [2022, true, false],
      [2025, false, false],
      [2026, false, true],
    ])
  })
})

describe('yearOf', () => {
  it('reads the year of a plain date or timestamp, and nothing else', () => {
    expect(yearOf('2026-06-22T15:37:22.000Z')).toBe(2026)
    expect(yearOf('infinity')).toBeNull()
    expect(yearOf(null)).toBeNull()
  })
})
