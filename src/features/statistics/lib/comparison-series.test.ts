import { describe, expect, it } from 'vitest'
import type { InsObservation, InsTimePeriod } from '@/schemas/ins'
import { filterExactCell } from './dataset-selection'
import {
  parseComparisonTokens,
  buildComparisonMatrix,
  buildPeriodOptions,
  getComparisonCell,
  parseClassificationPin,
  removeClassificationPin,
  upsertClassificationPin,
} from './comparison-series'

function annual(year: number): InsTimePeriod {
  return { iso_period: String(year), year, periodicity: 'ANNUAL' }
}

function quarterly(year: number, quarter: number): InsTimePeriod {
  return {
    iso_period: `${year}-Q${quarter}`,
    year,
    quarter,
    periodicity: 'QUARTERLY',
  }
}

function monthly(year: number, month: number): InsTimePeriod {
  return {
    iso_period: `${year}-${String(month).padStart(2, '0')}`,
    year,
    month,
    periodicity: 'MONTHLY',
  }
}

function observation(params: {
  code: string
  name?: string
  period: InsTimePeriod
  value: string | null
  unitSymbol?: string
}): InsObservation {
  return {
    dataset_code: 'POP107D',
    value: params.value,
    time_period: params.period,
    territory: {
      code: params.code,
      siruta_code: params.code,
      level: 'LAU',
      name_ro: params.name ?? `Territory ${params.code}`,
    },
    unit: params.unitSymbol ? { code: 'NR', symbol: params.unitSymbol } : null,
  }
}

describe('buildPeriodOptions', () => {
  it('dedupes periods and sorts them oldest-first', () => {
    const options = buildPeriodOptions([
      observation({ code: '1', period: annual(2024), value: '3' }),
      observation({ code: '2', period: annual(2022), value: '1' }),
      observation({ code: '1', period: annual(2022), value: '2' }),
      observation({ code: '2', period: annual(2023), value: '4' }),
    ])

    expect(options.map((option) => option.isoPeriod)).toEqual([
      '2022',
      '2023',
      '2024',
    ])
  })

  it('orders quarterly periods chronologically across a year boundary', () => {
    const options = buildPeriodOptions([
      observation({ code: '1', period: quarterly(2024, 2), value: '3' }),
      observation({ code: '1', period: quarterly(2024, 1), value: '2' }),
      observation({ code: '1', period: quarterly(2023, 4), value: '1' }),
    ])

    expect(options.map((option) => option.isoPeriod)).toEqual([
      '2023-Q4',
      '2024-Q1',
      '2024-Q2',
    ])
  })

  it('orders monthly periods chronologically across a year boundary', () => {
    const options = buildPeriodOptions([
      observation({ code: '1', period: monthly(2024, 3), value: '3' }),
      observation({ code: '1', period: monthly(2024, 1), value: '2' }),
      observation({ code: '1', period: monthly(2023, 11), value: '1' }),
    ])

    expect(options.map((option) => option.isoPeriod)).toEqual([
      '2023-11',
      '2024-01',
      '2024-03',
    ])
  })

  it('sorts by the numeric period key, ascending', () => {
    // A dataset has a single periodicity, so quarterly and monthly periods
    // never coexist in one series; there is no well-defined chronological
    // answer for "2024-Q1 vs 2024-03" and this asserts none. What IS required
    // is that the order follows `periodSortKey` on the structured
    // year/quarter/month fields — the numbers the server actually gave us.
    const options = buildPeriodOptions([
      observation({ code: '1', period: quarterly(2024, 4), value: '1' }),
      observation({ code: '1', period: annual(2024), value: '2' }),
      observation({ code: '1', period: monthly(2025, 1), value: '3' }),
    ])

    const keys = options.map((option) => option.sortKey)
    expect(keys).toEqual([...keys].sort((a, b) => a - b))
    expect(options[0].isoPeriod).toBe('2024')
    expect(options[options.length - 1].isoPeriod).toBe('2025-01')
  })

  it('returns nothing for an empty observation list', () => {
    expect(buildPeriodOptions([])).toEqual([])
  })
})

describe('buildComparisonMatrix', () => {
  const observations = [
    observation({ code: '54975', name: 'Cluj-Napoca', period: annual(2023), value: '286598', unitSymbol: 'Nr' }),
    observation({ code: '54975', name: 'Cluj-Napoca', period: annual(2024), value: '288104' }),
    observation({ code: '54984', name: 'Turda', period: annual(2023), value: '43302' }),
    // Turda genuinely has no 2024 figure.
    observation({ code: '54993', name: 'Dej', period: annual(2023), value: '32118' }),
    observation({ code: '54993', name: 'Dej', period: annual(2024), value: '31904' }),
  ]

  it('builds one row per requested territory, in selection order', () => {
    const matrix = buildComparisonMatrix({
      observations,
      territoryCodes: ['54993', '54975', '54984'],
    })

    expect(matrix.rows.map((row) => row.code)).toEqual(['54993', '54975', '54984'])
    expect(matrix.rows.map((row) => row.name)).toEqual(['Dej', 'Cluj-Napoca', 'Turda'])
  })

  it('reads the unit symbol off the observations', () => {
    const matrix = buildComparisonMatrix({ observations, territoryCodes: ['54975'] })
    expect(matrix.unitSymbol).toBe('Nr')
  })

  it('leaves a missing cell missing instead of borrowing another period', () => {
    const matrix = buildComparisonMatrix({
      observations,
      territoryCodes: ['54975', '54984'],
    })
    const turda = matrix.rows[1]

    expect(getComparisonCell(turda, '2024')).toBeNull()
    expect(getComparisonCell(turda, '2023')?.value).toBe('43302')
  })

  it('keeps a row for a territory with no observations at all', () => {
    const matrix = buildComparisonMatrix({
      observations,
      territoryCodes: ['54975', '999999'],
    })

    expect(matrix.rows).toHaveLength(2)
    expect(matrix.rows[1]).toEqual({ code: '999999', name: null, cells: {} })
  })

  it('ignores observations for territories that were not requested', () => {
    const matrix = buildComparisonMatrix({ observations, territoryCodes: ['54975'] })
    expect(matrix.rows).toHaveLength(1)
    expect(Object.keys(matrix.rows[0].cells)).toEqual(['2023', '2024'])
  })

  it('keeps the first of two observations for the same cell rather than summing', () => {
    const matrix = buildComparisonMatrix({
      observations: [
        observation({ code: '54975', period: annual(2024), value: '10' }),
        observation({ code: '54975', period: annual(2024), value: '20' }),
      ],
      territoryCodes: ['54975'],
    })

    expect(getComparisonCell(matrix.rows[0], '2024')?.value).toBe('10')
  })

  it('exposes every period present across all territories', () => {
    const matrix = buildComparisonMatrix({
      observations,
      territoryCodes: ['54975', '54984', '54993'],
    })
    expect(matrix.periods.map((period) => period.isoPeriod)).toEqual(['2023', '2024'])
  })
})

describe('classification pins', () => {
  it('round-trips a TYPE:VALUE pin', () => {
    expect(parseClassificationPin('SEX:TOTAL')).toEqual({
      typeCode: 'SEX',
      valueCode: 'TOTAL',
    })
  })

  it('rejects malformed pins', () => {
    expect(parseClassificationPin('SEX')).toBeNull()
    expect(parseClassificationPin(':TOTAL')).toBeNull()
    expect(parseClassificationPin('SEX:')).toBeNull()
  })

  it('upserts by dimension type rather than appending a contradiction', () => {
    const pins = upsertClassificationPin(['SEX:TOTAL', 'AGE:ALL'], {
      typeCode: 'SEX',
      valueCode: 'M',
    })
    // The canonical codec upserts IN PLACE: the pin keeps its slot.
    expect(pins).toEqual(['SEX:M', 'AGE:ALL'])
  })

  it('removes every pin for a dimension type', () => {
    expect(removeClassificationPin(['SEX:TOTAL', 'AGE:ALL'], 'SEX')).toEqual(['AGE:ALL'])
  })

})

describe('parseComparisonTokens (mixed-level URL tokens)', () => {
  it('accepts siruta:, cod:, and legacy bare-digit entries', () => {
    const tokens = parseComparisonTokens([
      'siruta:54975',
      'cod:cj',
      'cod:RO',
      '179132',
    ])
    expect(tokens).toEqual([
      { token: 'siruta:54975', code: '54975', level: 'LAU' },
      { token: 'cod:CJ', code: 'CJ', level: 'NUTS3' },
      { token: 'cod:RO', code: 'RO', level: 'NATIONAL' },
      { token: 'siruta:179132', code: '179132', level: 'LAU' },
    ])
  })

  it('drops malformed entries and duplicate codes', () => {
    const tokens = parseComparisonTokens([
      'siruta:54975',
      '54975',
      'garbage entry',
      'cod:',
    ])
    expect(tokens).toEqual([{ token: 'siruta:54975', code: '54975', level: 'LAU' }])
  })
})

describe('exact-cell filtering before the matrix (A5)', () => {
  it('drops the sibling cell the server filter admits', () => {
    const exact = {
      ...observation({ code: '54975', period: annual(2024), value: '10' }),
      classifications: [
        { type_code: 'SEX', code: 'FEMININ' },
        { type_code: 'AGE_GROUP', code: 'TOTAL' },
      ],
    }
    const sibling = {
      ...observation({ code: '54975', period: annual(2024), value: '20' }),
      classifications: [
        { type_code: 'SEX', code: 'TOTAL' },
        { type_code: 'AGE_GROUP', code: 'TOTAL' },
      ],
    }
    const pinMap = new Map([
      ['SEX', 'FEMININ'],
      ['AGE_GROUP', 'TOTAL'],
    ])
    const matrix = buildComparisonMatrix({
      observations: filterExactCell([sibling, exact], pinMap),
      territoryCodes: ['54975'],
    })
    // ONE number per territory×period — the exact cell, not the first write.
    expect(matrix.rows[0]?.cells['2024']?.value).toBe('10')
  })
})
