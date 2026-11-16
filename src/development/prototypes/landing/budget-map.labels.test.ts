import { describe, expect, it } from 'vitest'
import type { UatMapGeometry } from '@/features/statistics/lib/uat-map-snapshot'
import { asPrinted, classesBetween, formatLei, measureById, measureValues, positionOnScale, primarii, type BudgetFigures } from './budget-map.data'
import { countyAnchors, labelLevel, placeLabels } from './budget-map.labels'
import { buildLayers } from './budget-map.scene'

/** Four UATs in two counties, on a 100 × 50 grid: AB on the left, CD on the right. */
const geometry = {
  source: 'test',
  width: 100,
  height: 50,
  siruta: ['1', '2', '3', '4'],
  name: ['Alba', 'Bistra', 'Cluj', 'Dej'],
  county: ['AB', 'AB', 'CJ', 'CJ'],
  kind: ['comuna', 'comuna', 'municipiu', 'oras'],
  paths: ['M0 0l25 0 0 50-25 0z', 'M25 0l25 0 0 50-25 0z', 'M50 0l25 0 0 50-25 0z', 'M75 0l25 0 0 50-25 0z'],
  // x, y, room
  labels: [12, 25, 10, 37, 25, 10, 62, 25, 10, 87, 25, 10],
  counties: { AB: [0, 0, 50, 50], CJ: [50, 0, 100, 50] },
  countyBorders: 'M50 0l0 50',
  outline: 'M0 0l100 0 0 50-100 0z',
} as unknown as UatMapGeometry

const figures = new Map<string, BudgetFigures>([
  ['1', { income: 100, expenses: 130 }],
  ['2', { income: 200, expenses: 180 }],
  ['3', { income: 1000, expenses: 1000 }],
  ['4', { income: null, expenses: 50 }],
])

const countyName = (code: string) => ({ name: code === 'AB' ? 'Alba' : 'Cluj', short: code })
const full = [0, 0, 100, 50] as const

function labelsAt(pxPerUnit: number, measureId: 'balance' | 'income') {
  const measure = measureById(measureId)
  const values = measureValues(measure, geometry.siruta, figures)
  return placeLabels({
    geometry,
    counties: countyAnchors(geometry),
    box: full,
    pxPerUnit,
    level: labelLevel(geometry.width * pxPerUnit),
    countyName,
    valueText: (i) => (values[i] === null ? null : measure.format(values[i]!)),
  })
}

describe('labelLevel', () => {
  it('names counties, then UATs, then UATs with their figures, as the country widens on screen', () => {
    expect(labelLevel(390)).toBe('county')
    expect(labelLevel(1399)).toBe('county')
    expect(labelLevel(1400)).toBe('uat')
    expect(labelLevel(3600)).toBe('value')
  })
})

describe('countyAnchors', () => {
  it('puts each county on one of its own UATs', () => {
    const anchors = countyAnchors(geometry)
    expect(anchors.map((a) => a.code).sort()).toEqual(['AB', 'CJ'])
    const ab = anchors.find((a) => a.code === 'AB')!
    expect([12, 37]).toContain(ab.x)
  })
})

describe('placeLabels', () => {
  it('names counties at the country level, upper case, falling back to the code where the name does not fit', () => {
    const wide = labelsAt(10, 'balance') // country 1000 px: counties
    expect(wide.map((l) => l.lines[0]!.text).sort()).toEqual(['ALBA', 'CLUJ'])
    const narrow = labelsAt(0.5, 'balance') // a county is 25 px wide: the code
    expect(narrow.map((l) => l.lines[0]!.text).sort()).toEqual(['AB', 'CJ'])
    expect(wide.every((l) => l.uat === null)).toBe(true)
  })

  it('names UATs without figures at the middle level', () => {
    const labels = labelsAt(20, 'balance') // 2000 px
    expect(labels.map((l) => l.lines.map((line) => line.role))).toEqual([['name'], ['name'], ['name'], ['name']])
  })

  it('adds the figure with its unit when closer, and only where there is one', () => {
    const labels = labelsAt(40, 'balance') // 4000 px
    const byName = Object.fromEntries(labels.map((l) => [l.lines[0]!.text, l.lines[1]?.text ?? null]))
    expect(byName).toEqual({ Alba: '−30%', Bistra: '+10%', Cluj: '0%', Dej: null })
  })

  it('switching the map changes the figures and keeps the places', () => {
    const balance = labelsAt(40, 'balance')
    const income = labelsAt(40, 'income')
    expect(income.map((l) => l.key)).toEqual(balance.map((l) => l.key))
    expect(income.find((l) => l.lines[0]!.text === 'Cluj')!.lines[1]!.text).toMatch(/lei$/)
    expect(balance.find((l) => l.lines[0]!.text === 'Cluj')!.lines[1]!.text).toBe('0%')
  })
})

describe('formatLei', () => {
  it('writes thousands as mii, millions and billions in the compact Romanian form', () => {
    expect(formatLei(-500_400)).toBe('−500,4\u00a0mii lei')
    expect(formatLei(24_400_000)).toBe('24,4\u00a0mil. lei')
    expect(formatLei(1_200_000_000)).toBe('1,2\u00a0mld. lei')
    expect(formatLei(850)).toBe('850 lei')
    expect(formatLei(null)).toBe('—')
  })
})

describe('measures', () => {
  it('scales are recomputed per call, never shared between maps', () => {
    const income = measureById('income')
    const a = income.scale(Array.from({ length: 100 }, (_, i) => i + 1))
    const b = income.scale(Array.from({ length: 100 }, (_, i) => (i + 1) * 100))
    expect(a.classes[1]!.label).not.toEqual(b.classes[1]!.label)
    expect(a.classOf(100)).toBe(4)
    expect(b.classOf(100)).toBe(0)
  })

  it('cut the totals at percentiles: half the primării in the first class, the top 3% in the last', () => {
    const values = Array.from({ length: 1000 }, (_, i) => i + 1)
    const scale = measureById('expenses').scale(values)
    const sizes = [0, 0, 0, 0, 0]
    for (const value of values) sizes[scale.classOf(value)!]! += 1
    expect(sizes).toEqual([500, 250, 150, 70, 30])
  })

  it('buildLayers groups UATs by class, no-data first', () => {
    const measure = measureById('balance')
    const values = measureValues(measure, geometry.siruta, figures)
    const layers = buildLayers(geometry, values, measure.scale(values))
    expect(layers[0]!.key).toBe('-1')
    expect(layers.reduce((n, layer) => n + (layer.d.match(/M/g)?.length ?? 0), 0)).toBe(4)
  })
})

describe('legend classes', () => {
  it('name exactly the values each class holds, as the design rule asks', () => {
    const balance = measureById('balance').scale([])
    expect(balance.classes.map((c) => c.label)).toEqual(['sub −20', '−20 – sub −10', '−10 – sub −3', '−3 – sub 3', '3 – sub 10', '10 – sub 20', '20 sau mai mult'])
    // −10 is in the class it starts, not the one below it.
    expect(balance.classOf(-10)).toBe(2)
    expect(balance.classOf(-10.01)).toBe(1)
    expect(balance.ends).toEqual({ below: 'Deficit', above: 'Excedent' })
  })

  it('name a shared suffix once, and keep different ones', () => {
    const parts = (v: number) => (v >= 1e6 ? { number: String(v / 1e6), suffix: 'mil.' } : { number: String(v / 1e3), suffix: 'mii' })
    const labels = classesBetween([500_000, 5_000_000, 8_000_000], ['a', 'b', 'c', 'd'], parts).map((c) => c.label)
    expect(labels).toEqual(['sub 500\u00a0mii', '500\u00a0mii – sub 5\u00a0mil.', '5 – sub 8\u00a0mil.', '8\u00a0mil. sau mai mult'])
  })

  it('place a value along the bar, mid-class at an open end', () => {
    const balance = measureById('balance').scale([])
    expect(positionOnScale(balance, 0)).toBeCloseTo(3.5 / 7)
    expect(positionOnScale(balance, -50)).toBeCloseTo(0.5 / 7)
    expect(positionOnScale(balance, null)).toBeNull()
  })
})

describe('primarii', () => {
  it('puts „de" from twenty up, as Romanian counts', () => {
    expect([1, 6, 19, 20, 101, 120, 3180].map(primarii)).toEqual(['1 primărie', '6 primării', '19 primării', '20 de primării', '101 primării', '120 de primării', '3.180 de primării'])
  })
})

describe('totals scale', () => {
  it('classifies on the edges as printed: a figure under „sub 51 mil." is in that class', () => {
    // 100 values, the 50th percentile at 51,001,000 — printed „51 mil.".
    const values = Array.from({ length: 100 }, (_, i) => (i < 50 ? 1_000_000 + i : 51_001_000 + (i - 50) * 1000))
    const scale = measureById('income').scale(values)
    expect(asPrinted(51_001_000)).toBe(51_000_000)
    expect(scale.classes[0]!.label).toBe('sub 51\u00a0mil.')
    expect(scale.classOf(51_000_500)).toBe(1)
    expect(scale.classOf(50_999_999)).toBe(0)
  })

  it('merges equal edges and keeps the strongest colours', () => {
    const scale = measureById('income').scale(Array.from({ length: 100 }, () => 5_000_000))
    expect(scale.classes).toHaveLength(2)
    expect(scale.classes.map((c) => c.label)).toEqual(['sub 5\u00a0mil.', '5\u00a0mil. sau mai mult'])
    expect(scale.classes[1]!.color).toBe('#0b3d73')
  })

  it('has no classes, and no „NaN" labels, without figures', () => {
    const scale = measureById('expenses').scale([null, null])
    expect(scale.classes).toEqual([])
    expect(scale.classOf(10)).toBeNull()
  })
})
