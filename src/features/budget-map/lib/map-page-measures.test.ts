import { describe, expect, it } from 'vitest'
import { i18n } from '@lingui/core'
import { measureById } from '@/features/landing/lib/budget-map-measures'
import { COUNTY_BALANCE_EDGES, amountFormat, formatPerCapita, pageMeasures } from './map-page-measures'

const byId = (year: string, basis: 'total' | 'per_capita', level: 'uat' | 'county') => new Map(pageMeasures(year, basis, level).map((measure) => [measure.id, measure]))

describe('the map page measures', () => {
  it('are the landing\'s maps, in the landing\'s order and colours', () => {
    const measures = pageMeasures('2025', 'total', 'uat')
    expect(measures.map((measure) => measure.id)).toEqual(['balance', 'income', 'expenses'])
    for (const measure of measures) expect(measure.ramp).toEqual(measureById(measure.id).ramp)
  })

  it('colour the primării\'s totals and balance exactly as the landing does', () => {
    const values = [-25, -12, -4, 0, 2, 11, 30, null]
    const amounts = [1_200_000, 14_000_000, 2_500_000_000, null, 480_000, 96_000_000]
    const page = byId('2025', 'total', 'uat')
    expect(page.get('balance')!.scale(values).classes).toEqual(measureById('balance').scale(values).classes)
    for (const id of ['income', 'expenses'] as const) expect(page.get(id)!.scale(amounts).classes).toEqual(measureById(id).scale(amounts).classes)
  })

  it('name the year in the totals\' description', () => {
    const page = byId('2019', 'total', 'uat')
    expect(i18n._(page.get('income')!.description)).toContain('2019')
    expect(i18n._(page.get('expenses')!.description)).toContain('2019')
  })

  it('say whose money a county\'s figure is', () => {
    for (const basis of ['total', 'per_capita'] as const) {
      for (const measure of pageMeasures('2025', basis, 'county')) expect(i18n._(measure.description)).toMatch(/consiliu/)
      for (const measure of pageMeasures('2025', basis, 'uat')) expect(i18n._(measure.description)).not.toMatch(/consiliu/)
    }
  })

  it('cut the county balance finer, on the measured edges, and classify it as printed', () => {
    const scale = byId('2025', 'total', 'county').get('balance')!.scale([])
    expect(COUNTY_BALANCE_EDGES).toEqual([-6, -3, -1, 1, 3, 6])
    expect(scale.classes.map((item) => item.from)).toEqual([null, -6, -3, -1, 1, 3, 6])
    expect(scale.classes.map((item) => item.color)).toEqual(measureById('balance').ramp)
    expect(scale.classOf(0.4)).toBe(3)
    // −0.96 prints as −1,0%: the class from −1, never the one below it.
    expect(scale.classOf(-0.96)).toBe(3)
    expect(scale.classOf(-1.06)).toBe(2)
    expect(scale.classOf(7)).toBe(6)
    expect(scale.classOf(null)).toBeNull()
    // 1,000,000,000 lei in, 990,500,000 out: 0.95%, which prints „+1%" — so it is coloured from 1, not as neutral.
    const share = ((1_000_000_000 - 990_500_000) / 1_000_000_000) * 100
    expect(byId('2025', 'total', 'county').get('balance')!.format(share, 'ro')).toBe('+1%')
    expect(scale.classOf(share)).toBe(4)
    // The primării keep their own edges.
    expect(byId('2025', 'total', 'uat').get('balance')!.scale([]).classes.map((item) => item.from)).toEqual([null, -20, -10, -3, 3, 10, 20])
  })

  it('count per inhabitant in whole lei, with its own titles, and keep the balance as a percent', () => {
    const page = byId('2025', 'per_capita', 'uat')
    expect(i18n._(page.get('income')!.title)).toBe('Venituri pe locuitor')
    expect(i18n._(page.get('expenses')!.title)).toBe('Cheltuieli pe locuitor')
    expect(page.get('balance')!.format(-2.25, 'ro')).toBe(measureById('balance').format(-2.25, 'ro'))
    expect(page.get('income')!.format(9867.26, 'ro')).toBe('9.867 lei/loc.')
    expect(page.get('income')!.tick(9867.5, 'ro')).toBe('9.868')
    const values = Array.from({ length: 100 }, (_, i) => 2000 + i * 100.4)
    expect(page.get('income')!.scale(values).classes.every((item) => item.from === null || Number.isInteger(item.from))).toBe(true)
  })

  it('write amounts per inhabitant with a real minus, in either locale', () => {
    expect(formatPerCapita(-412.4, 'ro')).toBe('−412 lei/loc.')
    expect(formatPerCapita(12345.6, 'en')).toBe('12,346 lei/inh.')
    expect(formatPerCapita(null, 'ro')).toBe('—')
    expect(amountFormat('per_capita')(1000, 'ro')).toBe('1.000 lei/loc.')
    expect(amountFormat('total')(14_000_000, 'ro')).toBe('14 mil. lei')
  })
})
