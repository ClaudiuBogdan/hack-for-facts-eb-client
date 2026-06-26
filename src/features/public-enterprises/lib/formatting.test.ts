import { describe, expect, it } from 'vitest'
import type { IndicatorValueRow } from '@/schemas/public-enterprise'
import {
  collectNumericChartPoints,
  formatKpiValue,
  formatPublicEnterpriseNumber,
  groupNumericRowsByUnit,
  isIndicatorRowChartable,
} from './formatting'

const baseNumberRow = {
  cui: '10020943',
  indicator: 'Cota de piață',
  indicatorLabel: 'Market share',
  kpiCode: 'MS',
  sourceSheet: 'calculated' as const,
  warnings: [],
}

function numberRow(overrides: Partial<IndicatorValueRow>): IndicatorValueRow {
  return {
    ...baseNumberRow,
    valueKind: 'number',
    numericValue: 0.0425,
    booleanValue: null,
    rawValue: null,
    measureUnit: '%',
    year: '2019',
    ...overrides,
  } as IndicatorValueRow
}

function booleanRow(overrides: Partial<IndicatorValueRow>): IndicatorValueRow {
  return {
    ...baseNumberRow,
    valueKind: 'boolean',
    numericValue: null,
    booleanValue: true,
    rawValue: null,
    measureUnit: null,
    year: '2019',
    ...overrides,
  } as IndicatorValueRow
}

function textRow(overrides: Partial<IndicatorValueRow>): IndicatorValueRow {
  return {
    ...baseNumberRow,
    valueKind: 'text',
    numericValue: null,
    booleanValue: null,
    rawValue: 'București',
    measureUnit: null,
    year: '2019',
    ...overrides,
  } as IndicatorValueRow
}

function emptyRow(overrides: Partial<IndicatorValueRow>): IndicatorValueRow {
  return {
    ...baseNumberRow,
    valueKind: 'empty',
    numericValue: null,
    booleanValue: null,
    rawValue: null,
    measureUnit: null,
    year: '2019',
    ...overrides,
  } as IndicatorValueRow
}

describe('formatPublicEnterpriseNumber', () => {
  it('does not scale percent values (no-transform guarantee)', () => {
    // 0.0425 with % stays 0.0425, never 4.25
    expect(formatPublicEnterpriseNumber(0.0425, 'ro')).toBe('0,0425')
    expect(formatPublicEnterpriseNumber(0.0425, 'en')).toBe('0.0425')
  })

  it('returns the fallback for non-finite values', () => {
    expect(formatPublicEnterpriseNumber(null)).toBe('—')
    expect(formatPublicEnterpriseNumber(NaN)).toBe('—')
    expect(formatPublicEnterpriseNumber(Infinity)).toBe('—')
  })

  it('formats integers without decimals', () => {
    expect(formatPublicEnterpriseNumber(1250, 'ro')).toBe('1.250')
  })
})

describe('formatKpiValue', () => {
  it('appends the measure unit without scaling numbers', () => {
    const result = formatKpiValue(numberRow({}), 'ro')
    expect(result.display).toBe('0,0425 %')
    expect(result.kindLabel).toBe('number')
  })

  it('renders boolean rows as Da/Nu', () => {
    expect(formatKpiValue(booleanRow({ booleanValue: true }), 'ro').display).toBe('Da')
    expect(formatKpiValue(booleanRow({ booleanValue: false }), 'ro').display).toBe('Nu')
  })

  it('renders boolean rows in English when requested', () => {
    expect(formatKpiValue(booleanRow({ booleanValue: true }), 'en').display).toBe('Yes')
    expect(formatKpiValue(booleanRow({ booleanValue: false }), 'en').display).toBe('No')
  })

  it('renders text rows as the raw value', () => {
    expect(formatKpiValue(textRow({ rawValue: 'București' }), 'ro').display).toBe(
      'București',
    )
  })

  it('renders empty rows with the fallback', () => {
    expect(formatKpiValue(emptyRow({}), 'ro').display).toBe('—')
  })
})

describe('isIndicatorRowChartable', () => {
  it('is true only for finite numeric rows', () => {
    expect(isIndicatorRowChartable(numberRow({ numericValue: 0.0425 }))).toBe(true)
    expect(isIndicatorRowChartable(numberRow({ numericValue: NaN }))).toBe(false)
    expect(isIndicatorRowChartable(booleanRow({}))).toBe(false)
    expect(isIndicatorRowChartable(textRow({}))).toBe(false)
    expect(isIndicatorRowChartable(emptyRow({}))).toBe(false)
  })
})

describe('collectNumericChartPoints', () => {
  it('keeps year gaps as missing, sorted ascending', () => {
    const rows = [
      numberRow({ year: '2021', numericValue: 0.05 }),
      numberRow({ year: '2019', numericValue: 0.0425 }),
      emptyRow({ year: '2020', indicator: 'Cota de piață' }),
    ]
    const points = collectNumericChartPoints(rows, 'Cota de piață')
    expect(points.map((p) => p.year)).toEqual(['2019', '2021'])
  })
})

describe('groupNumericRowsByUnit', () => {
  it('groups chartable rows by measure unit', () => {
    const rows = [
      numberRow({ measureUnit: '%', numericValue: 0.04 }),
      numberRow({ measureUnit: 'RON', numericValue: 1000 }),
      numberRow({ measureUnit: '%', numericValue: 0.06 }),
      booleanRow({}),
    ]
    const groups = groupNumericRowsByUnit(rows)
    expect(groups).toHaveLength(2)
    const percent = groups.find((g) => g.measureUnit === '%')
    expect(percent?.rows).toHaveLength(2)
    const ron = groups.find((g) => g.measureUnit === 'RON')
    expect(ron?.rows).toHaveLength(1)
  })
})
