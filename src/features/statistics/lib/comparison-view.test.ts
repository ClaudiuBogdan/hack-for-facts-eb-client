import { describe, expect, it } from 'vitest'
import type { NativeInsObservation } from '@/schemas/ins'
import {
  changeLine,
  chartableRun,
  comparisonCountyLayer,
  defaultComparisonView,
  defaultComparisonWindow,
  lineValues,
  rankStandings,
  resolveComparisonView,
  resolveComparisonWindow,
} from './comparison-view'

const PERIODS = ['2020', '2021', '2022', '2023', '2024']

describe('lineValues', () => {
  it('reads each period’s published number, a missing or flagged cell as null and never as zero', () => {
    const cells = {
      '2020': { isoPeriod: '2020', value: '10.5', valueStatus: null },
      '2021': { isoPeriod: '2021', value: '0', valueStatus: null },
      '2022': { isoPeriod: '2022', value: '12', valueStatus: 'c' },
      '2024': { isoPeriod: '2024', value: '14', valueStatus: 'p' },
    }
    expect(lineValues(cells, PERIODS)).toEqual([10.5, 0, null, null, 14])
  })
})

describe('defaultComparisonWindow', () => {
  it('spans the first and last periods every line has a number for', () => {
    expect(
      defaultComparisonWindow([
        [1, 2, 3, 4, null],
        [null, 2, 3, 4, 5],
      ]),
    ).toEqual({ from: 1, to: 3 })
  })

  it('falls back to what any line covers when the lines never share two periods', () => {
    expect(
      defaultComparisonWindow([
        [1, 2, null, null, null],
        [null, null, null, 4, 5],
      ]),
    ).toEqual({ from: 0, to: 4 })
  })

  it('has no window with fewer than two periods to span', () => {
    expect(defaultComparisonWindow([[null, 3, null]])).toBeNull()
    expect(defaultComparisonWindow([])).toBeNull()
  })
})

describe('resolveComparisonWindow', () => {
  const fallback = { from: 1, to: 3 }

  it('takes the URL’s two periods where they are on the axis and in order', () => {
    expect(resolveComparisonWindow(PERIODS, { from: '2020', to: '2024' }, fallback)).toEqual({ from: 0, to: 4 })
  })

  it('keeps an end named alone and pairs it with the default’s other end while that still fits', () => {
    expect(resolveComparisonWindow(PERIODS, { to: '2024' }, fallback)).toEqual({ from: 1, to: 4 })
    expect(resolveComparisonWindow(PERIODS, { to: '2021' }, { from: 2, to: 3 })).toEqual({ from: 0, to: 1 })
    expect(resolveComparisonWindow(PERIODS, { from: '2022' }, fallback)).toEqual({ from: 2, to: 3 })
    expect(resolveComparisonWindow(PERIODS, { from: '2023' }, fallback)).toEqual({ from: 3, to: 4 })
  })

  it('falls back to the default for an end off the axis or two ends out of order', () => {
    expect(resolveComparisonWindow(PERIODS, { from: '1999', to: '2030' }, fallback)).toEqual(fallback)
    expect(resolveComparisonWindow(PERIODS, { from: '2024', to: '2020' }, fallback)).toEqual(fallback)
    expect(resolveComparisonWindow(PERIODS, { from: '2024' }, fallback)).toEqual(fallback)
  })
})

describe('changeLine', () => {
  it('measures a count in percent from the start, a rate in points and a life expectancy in years', () => {
    expect(changeLine([100, 110, null, 90], 100, 'persons')).toEqual([0, 10, null, -10])
    expect(changeLine([5, 6.5], 5, 'percent')).toEqual([0, 1.5])
    expect(changeLine([70, 72], 70, 'years')).toEqual([0, 2])
  })

  it('draws nothing without a start, and no percent from a start of zero', () => {
    expect(changeLine([1, 2], null, 'count')).toEqual([null, null])
    expect(changeLine([0, 2], 0, 'count')).toEqual([null, null])
  })
})

describe('the chart’s view', () => {
  it('opens on change for places of different sizes counted in people or things', () => {
    expect(defaultComparisonView(['LAU', 'NUTS3', 'NATIONAL'], 'persons')).toBe('schimbare')
    expect(defaultComparisonView(['LAU', 'NATIONAL'], 'count')).toBe('schimbare')
  })

  it('opens on values for one level, or for a rate, an average or a life expectancy at any level', () => {
    expect(defaultComparisonView(['LAU', 'LAU'], 'persons')).toBe('valori')
    expect(defaultComparisonView(['NUTS3', 'NATIONAL'], 'percent')).toBe('valori')
    expect(defaultComparisonView(['NUTS3', 'NATIONAL'], 'years')).toBe('valori')
    expect(defaultComparisonView(['NUTS3', 'NATIONAL'], 'other')).toBe('valori')
  })

  it('takes the URL’s view only where it is one', () => {
    expect(resolveComparisonView('schimbare', 'valori')).toBe('schimbare')
    expect(resolveComparisonView('bars', 'valori')).toBe('valori')
    expect(resolveComparisonView(undefined, 'schimbare')).toBe('schimbare')
  })
})

describe('rankStandings', () => {
  const rows = [
    { code: 'A', from: 10, to: 20, change: 100 },
    { code: 'B', from: 50, to: 55, change: 10 },
    { code: 'C', from: null, to: 30, change: null },
    { code: 'D', from: null, to: null, change: null },
  ]

  it('puts the highest end value first, and a row without one last', () => {
    expect(rankStandings(rows, 'valori').map((row) => row.code)).toEqual(['B', 'C', 'A', 'D'])
  })

  it('ranks by the change when the chart shows change, keeping selection order among the rows without one', () => {
    expect(rankStandings(rows, 'schimbare').map((row) => row.code)).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('chartableRun', () => {
  it('is the longest stretch without a gap inside the window, the later of two as long', () => {
    expect(chartableRun([1, 2, null, 4, 5, 6], { from: 0, to: 5 })).toEqual({ from: 3, to: 5 })
    expect(chartableRun([1, 2, null, 4, 5], { from: 0, to: 4 })).toEqual({ from: 3, to: 4 })
  })

  it('stays inside the window', () => {
    expect(chartableRun([1, 2, 3, 4, 5], { from: 1, to: 3 })).toEqual({ from: 1, to: 3 })
  })

  it('has nothing to draw from lone points', () => {
    expect(chartableRun([1, null, 3, null], { from: 0, to: 3 })).toBeNull()
  })
})

function county(code: string, value: string | null, extra: Partial<NativeInsObservation> = {}): NativeInsObservation {
  const level = code === 'RO' ? 'NATIONAL' : 'NUTS3'
  return {
    id: `${code}:${extra.time_period?.iso_period ?? '2024'}`,
    dataset_code: 'TEST',
    value,
    value_status: null,
    unit: { code: '9685', symbol: 'persons', name_ro: 'Numar persoane' },
    time_period: { iso_period: '2024', year: 2024, periodicity: 'ANNUAL' },
    classifications: [],
    territory: { code, level, name_ro: code },
    dimensions: {
      geography: {
        pairs: [],
        resolution: 'EXACT',
        resolvedTerritory: { code, level },
        contextTerritory: null,
        flags: [],
        applicableRules: [],
      },
    },
    ...extra,
  } as NativeInsObservation
}

describe('comparisonCountyLayer', () => {
  const layer = (observations: readonly NativeInsObservation[]) =>
    comparisonCountyLayer({ code: 'TEST', period: '2024', cadence: 'ANNUAL', observations })

  it('reads one value per county, the country as the national reference, and names the rest missing', () => {
    const read = layer([county('RO', '5453155'), county('CJ', '261239'), county('B', '1100000')])
    expect(read.values).toEqual([
      { code: 'CJ', name: 'Cluj', value: 261239 },
      { code: 'B', name: 'București', value: 1100000 },
    ])
    expect(read.national).toBe(5453155)
    expect(read.unit).toBe('persons')
    expect(read.missingCounties).toHaveLength(40)
    expect(read.missingCounties).not.toContain('CJ')
  })

  it('leaves a county with two rows hatched rather than pick one of them', () => {
    const read = layer([county('CJ', '1'), county('CJ', '2', { id: 'CJ:other' }), county('TM', '3')])
    expect(read.values.map((entry) => entry.code)).toEqual(['TM'])
    expect(read.missingCounties).toContain('CJ')
  })

  it('counts no row of another period or frequency, of a qualified geography, or with no publishable number', () => {
    const read = layer([
      county('CJ', '1', { time_period: { iso_period: '2023', year: 2023, periodicity: 'ANNUAL' } }),
      county('TM', '2', { time_period: { iso_period: '2024-05', year: 2024, month: 5, periodicity: 'MONTHLY' } }),
      county('IS', '3', {
        dimensions: {
          geography: { pairs: [], resolution: 'EXACT', resolvedTerritory: { code: 'IS', level: 'NUTS3' }, contextTerritory: null, flags: ['HISTORICAL'], applicableRules: [] },
        },
      } as unknown as Partial<NativeInsObservation>),
      county('BV', '4', { value_status: 'c' }),
      county('RO', null),
    ])
    expect(read.values).toEqual([])
    expect(read.national).toBeNull()
  })
})
