import { describe, expect, it } from 'vitest'
import { parseFiguresCsv } from '../api/budget-map'
import { asPrinted, compactParts, formatAmount, formatPercent, joinParts } from './budget-map-format'
import { coverageOf, measureById, measureValues, percentileEdges, positionOnScale, type BudgetFigures } from './budget-map-measures'

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
