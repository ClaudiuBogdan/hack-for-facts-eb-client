import { describe, expect, it } from 'vitest'
import { parseFiguresCsv } from '../api/budget-map'
import { asPrinted, compactParts, formatAmount, formatPercent, joinParts, percentAsPrinted } from './budget-map-format'
import { coverageOf, measureById, measureValues, percentileEdges, percentileScale, positionOnScale, type BudgetFigures } from './budget-map-measures'

const NB = ' '

describe('budget map figures', () => {
  it('write amounts short, in each locale: mii/mil./mld. in Romanian, K/M/B in English, with a real minus', () => {
    expect(formatAmount(-500_400, 'ro')).toBe(`−500,4${NB}mii lei`)
    expect(formatAmount(24_400_000, 'ro')).toBe(`24,4${NB}mil. lei`)
    expect(formatAmount(1_200_000_000, 'ro')).toBe(`1,2${NB}mld. lei`)
    expect(formatAmount(850, 'ro')).toBe('850 lei')
    expect(formatAmount(-500_400, 'en')).toBe('−500.4K lei')
    expect(formatAmount(24_400_000, 'en')).toBe('24.4M lei')
    expect(formatAmount(null, 'ro')).toBe('—')
  })

  it('write percent with a sign and the locale’s decimal mark', () => {
    expect(formatPercent(-8.14, 'ro')).toBe('−8,1%')
    expect(formatPercent(10, 'en')).toBe('+10%')
    expect(formatPercent(0, 'ro')).toBe('0%')
  })

  it('round a bound exactly as it is printed', () => {
    expect(asPrinted(51_001_000)).toBe(51_000_000)
    expect(joinParts(compactParts(asPrinted(51_001_000), 'ro'), 'ro')).toBe(`51${NB}mil.`)
  })

  it('read the grouped-series CSV, an empty cell as no figure', () => {
    const figures = parseFiguresCsv('siruta_code,income,expenses\n54975,2656460197.71,2259241251.68\n1,,5\n')
    expect(figures.get('54975')).toEqual({ income: 2656460197.71, expenses: 2259241251.68 })
    expect(figures.get('1')).toEqual({ income: null, expenses: 5 })
    expect(figures.size).toBe(2)
  })
})

describe('budget map measures', () => {
  const figures = new Map<string, BudgetFigures>([
    ['1', { income: 100, expenses: 130 }],
    ['2', { income: 200, expenses: 180 }],
    ['3', { income: 0, expenses: 10 }],
    ['4', { income: null, expenses: 50 }],
  ])

  it('give the balance in percent of income, and none without an income', () => {
    const values = measureValues(measureById('balance'), ['1', '2', '3', '4', '5'], figures)
    expect(values).toEqual([-30, 10, null, null, null])
    expect(coverageOf(values)).toEqual({ withData: 2, total: 5 })
  })

  it('cut the balance at fixed edges: a class holds its lower bound, not its upper one', () => {
    const scale = measureById('balance').scale([])
    expect(scale.classes.map((c) => [c.from, c.to])).toEqual([
      [null, -20],
      [-20, -10],
      [-10, -3],
      [-3, 3],
      [3, 10],
      [10, 20],
      [20, null],
    ])
    expect(scale.classOf(-10)).toBe(2)
    expect(scale.classOf(-10.06)).toBe(1) // prints „−10,1%"
    expect(measureById('balance').ends).toBeDefined()
    expect(positionOnScale(scale, 0)).toBeCloseTo(3.5 / 7)
  })

  it('cut the totals at percentiles: half in the first class, the top 3% in the last', () => {
    const values = Array.from({ length: 1000 }, (_, i) => (i + 1) * 1_000_000)
    const scale = measureById('expenses').scale(values)
    const sizes = [0, 0, 0, 0, 0]
    for (const value of values) sizes[scale.classOf(value)!]! += 1
    expect(sizes).toEqual([500, 250, 150, 70, 30])
  })

  it('classify the totals on their printed edges, merge equal ones and keep the strongest colours', () => {
    const tight = Array.from({ length: 100 }, (_, i) => (i < 50 ? 1_000_000 + i : 51_001_000 + (i - 50) * 1000))
    const scale = measureById('income').scale(tight)
    expect(scale.classes[0]!.to).toBe(51_000_000)
    expect(scale.classOf(51_000_500)).toBe(1)

    const flat = measureById('income').scale(Array.from({ length: 100 }, () => 5_000_000))
    expect(flat.classes).toHaveLength(2)
    expect(flat.classes[1]!.color).toBe('#0b3d73')
  })

  it('print the legend’s boundaries short: a signed percent, an amount without „lei"', () => {
    expect([-20, -3, 3, 20].map((value) => measureById('balance').tick(value, 'ro'))).toEqual(['−20%', '−3%', '+3%', '+20%'])
    expect(measureById('income').tick(14_000_000, 'ro')).toBe(`14${NB}mil.`)
    expect(measureById('expenses').tick(178_500_000, 'en')).toBe('178.5M')
  })

  it('have no classes without figures', () => {
    expect(measureById('income').scale([null]).classes).toEqual([])
    expect(percentileEdges([], [0.5])).toEqual([])
  })

  it('recompute a scale per call: two maps never share one', () => {
    const a = measureById('income').scale(Array.from({ length: 100 }, (_, i) => (i + 1) * 1e6))
    const b = measureById('income').scale(Array.from({ length: 100 }, (_, i) => (i + 1) * 1e8))
    expect(a.classes[1]!.from).not.toEqual(b.classes[1]!.from)
  })
})

describe('classified as printed', () => {
  it('puts a figure in the class its printed form belongs to, at every edge', () => {
    const balance = measureById('balance').scale([])
    // −3.03 prints „−3%": the class holding −3, not the one below it.
    expect(formatPercent(-3.03, 'ro')).toBe('−3%')
    expect(balance.classOf(-3.03)).toBe(3)
    // 9.985 prints „10%": the class from 10.
    expect(formatPercent(9.985, 'ro')).toBe('+10%')
    expect(balance.classOf(9.985)).toBe(5)

    const income = measureById('income').scale(Array.from({ length: 100 }, (_, i) => (i < 50 ? 1_000_000 : 14_000_000 + i)))
    expect(income.classes[0]!.to).toBe(14_000_000)
    // 13,952,229 prints „14 mil. lei": coloured from 14 mil., not „sub 14 mil.".
    expect(formatAmount(13_952_229, 'ro')).toBe(`14${NB}mil. lei`)
    expect(income.classOf(13_952_229)).toBe(1)
  })
})

describe('a percentile scale in another unit', () => {
  const RAMP = ['#1', '#2', '#3', '#4', '#5']

  it('cuts at the totals\' percentiles on the edges as that unit prints them', () => {
    // Whole lei per inhabitant: 100 values, 1.4 … 100.4.
    const values = Array.from({ length: 100 }, (_, i) => i + 1.4)
    const scale = percentileScale(values, RAMP, Math.round)
    expect(scale.classes.map((item) => item.from)).toEqual([null, 51, 76, 91, 98])
    expect(scale.classes.map((item) => item.color)).toEqual(RAMP)
    // 50.6 prints as 51, so it is coloured with the class that starts at 51.
    expect(scale.classOf(50.6)).toBe(1)
    expect(scale.classOf(50.4)).toBe(0)
    expect(scale.classOf(null)).toBeNull()
  })

  it('is the totals\' own scale when the unit is theirs', () => {
    const values = [1_200_000, 14_000_000, 2_500_000_000, null, 480_000, 96_000_000]
    const own = measureById('income').scale(values)
    const built = percentileScale(values, measureById('income').ramp, asPrinted)
    expect(built.classes).toEqual(own.classes)
    for (const value of values) expect(built.classOf(value)).toBe(own.classOf(value))
  })

  it('has no classes without figures', () => {
    expect(percentileScale([null, null], RAMP, Math.round).classes).toEqual([])
  })
})

describe('a figure half-way between two printed values', () => {
  it('rounds as the printed figure does, though binary division lands just below the half', () => {
    // 0.95 / 0.1 is 9.4999… in binary; Intl prints 0.95 as „+1%".
    const share = ((10_000 - 9_905) / 10_000) * 100
    expect(formatPercent(share, 'ro')).toBe('+1%')
    expect(percentAsPrinted(share)).toBe(1)
    expect(percentAsPrinted(-2.95)).toBeCloseTo(-3, 10)
    expect(formatPercent(-2.95, 'ro')).toBe('−3%')
    expect(asPrinted(14_250_000)).toBe(14_300_000)
    expect(joinParts(compactParts(14_250_000, 'ro'), 'ro')).toBe('14,3\u00a0mil.')
  })

  it('and just below a half-way value, rounds down as the printed figure does', () => {
    // 10,000 lei in, 9,705 out: 2.9499999999999997%, printed „+2,9%" — the class below 3, not the one from 3.
    const share = ((10_000 - 9_705) / 10_000) * 100
    expect(formatPercent(share, 'ro')).toBe('+2,9%')
    expect(percentAsPrinted(share)).toBe(2.9)
    expect(formatAmount(10_049_999_999.99, 'ro')).toBe('10\u00a0mld. lei')
    expect(asPrinted(10_049_999_999.99)).toBe(10_000_000_000)
    expect(asPrinted(-412.36)).toBe(-412.4)
    expect(asPrinted(999.96)).toBe(1000)
  })
})

