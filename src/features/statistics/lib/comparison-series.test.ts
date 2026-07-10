import { describe, expect, it } from 'vitest'
import type { InsObservation, InsTimePeriod } from '@/schemas/ins'
import {
  buildBarSeries,
  buildComparisonMatrix,
  buildLineSeries,
  buildPeriodOptions,
  getComparisonCell,
  lineSeriesKey,
  parseClassificationPin,
  pickAutoPinnedOption,
  removeClassificationPin,
  resolveEffectiveClassificationPins,
  resolveSelectedPeriod,
  toChartValue,
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
  siruta: string
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
      code: params.siruta,
      siruta_code: params.siruta,
      level: 'LAU',
      name_ro: params.name ?? `Territory ${params.siruta}`,
    },
    unit: params.unitSymbol ? { code: 'NR', symbol: params.unitSymbol } : null,
  }
}

describe('buildPeriodOptions', () => {
  it('dedupes periods and sorts them oldest-first', () => {
    const options = buildPeriodOptions([
      observation({ siruta: '1', period: annual(2024), value: '3' }),
      observation({ siruta: '2', period: annual(2022), value: '1' }),
      observation({ siruta: '1', period: annual(2022), value: '2' }),
      observation({ siruta: '2', period: annual(2023), value: '4' }),
    ])

    expect(options.map((option) => option.isoPeriod)).toEqual([
      '2022',
      '2023',
      '2024',
    ])
  })

  it('orders quarterly periods chronologically across a year boundary', () => {
    const options = buildPeriodOptions([
      observation({ siruta: '1', period: quarterly(2024, 2), value: '3' }),
      observation({ siruta: '1', period: quarterly(2024, 1), value: '2' }),
      observation({ siruta: '1', period: quarterly(2023, 4), value: '1' }),
    ])

    expect(options.map((option) => option.isoPeriod)).toEqual([
      '2023-Q4',
      '2024-Q1',
      '2024-Q2',
    ])
  })

  it('orders monthly periods chronologically across a year boundary', () => {
    const options = buildPeriodOptions([
      observation({ siruta: '1', period: monthly(2024, 3), value: '3' }),
      observation({ siruta: '1', period: monthly(2024, 1), value: '2' }),
      observation({ siruta: '1', period: monthly(2023, 11), value: '1' }),
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
      observation({ siruta: '1', period: quarterly(2024, 4), value: '1' }),
      observation({ siruta: '1', period: annual(2024), value: '2' }),
      observation({ siruta: '1', period: monthly(2025, 1), value: '3' }),
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

describe('resolveSelectedPeriod', () => {
  const periods = buildPeriodOptions([
    observation({ siruta: '1', period: annual(2022), value: '1' }),
    observation({ siruta: '1', period: annual(2024), value: '2' }),
  ])

  it('defaults to the latest period', () => {
    expect(resolveSelectedPeriod(periods, undefined)).toBe('2024')
  })

  it('honours a requested period that exists', () => {
    expect(resolveSelectedPeriod(periods, '2022')).toBe('2022')
  })

  it('degrades a stale deep-linked period to the latest', () => {
    expect(resolveSelectedPeriod(periods, '1999')).toBe('2024')
  })

  it('is null when there is no data', () => {
    expect(resolveSelectedPeriod([], '2024')).toBeNull()
  })
})

describe('buildComparisonMatrix', () => {
  const observations = [
    observation({ siruta: '54975', name: 'Cluj-Napoca', period: annual(2023), value: '286598', unitSymbol: 'Nr' }),
    observation({ siruta: '54975', name: 'Cluj-Napoca', period: annual(2024), value: '288104' }),
    observation({ siruta: '54984', name: 'Turda', period: annual(2023), value: '43302' }),
    // Turda genuinely has no 2024 figure.
    observation({ siruta: '54993', name: 'Dej', period: annual(2023), value: '32118' }),
    observation({ siruta: '54993', name: 'Dej', period: annual(2024), value: '31904' }),
  ]

  it('builds one row per requested territory, in selection order', () => {
    const matrix = buildComparisonMatrix({
      observations,
      sirutaCodes: ['54993', '54975', '54984'],
    })

    expect(matrix.rows.map((row) => row.siruta)).toEqual(['54993', '54975', '54984'])
    expect(matrix.rows.map((row) => row.name)).toEqual(['Dej', 'Cluj-Napoca', 'Turda'])
  })

  it('reads the unit symbol off the observations', () => {
    const matrix = buildComparisonMatrix({ observations, sirutaCodes: ['54975'] })
    expect(matrix.unitSymbol).toBe('Nr')
  })

  it('leaves a missing cell missing instead of borrowing another period', () => {
    const matrix = buildComparisonMatrix({
      observations,
      sirutaCodes: ['54975', '54984'],
    })
    const turda = matrix.rows[1]

    expect(getComparisonCell(turda, '2024')).toBeNull()
    expect(getComparisonCell(turda, '2023')?.value).toBe('43302')
  })

  it('keeps a row for a territory with no observations at all', () => {
    const matrix = buildComparisonMatrix({
      observations,
      sirutaCodes: ['54975', '999999'],
    })

    expect(matrix.rows).toHaveLength(2)
    expect(matrix.rows[1]).toEqual({ siruta: '999999', name: null, cells: {} })
  })

  it('ignores observations for territories that were not requested', () => {
    const matrix = buildComparisonMatrix({ observations, sirutaCodes: ['54975'] })
    expect(matrix.rows).toHaveLength(1)
    expect(Object.keys(matrix.rows[0].cells)).toEqual(['2023', '2024'])
  })

  it('keeps the first of two observations for the same cell rather than summing', () => {
    const matrix = buildComparisonMatrix({
      observations: [
        observation({ siruta: '54975', period: annual(2024), value: '10' }),
        observation({ siruta: '54975', period: annual(2024), value: '20' }),
      ],
      sirutaCodes: ['54975'],
    })

    expect(getComparisonCell(matrix.rows[0], '2024')?.value).toBe('10')
  })

  it('exposes every period present across all territories', () => {
    const matrix = buildComparisonMatrix({
      observations,
      sirutaCodes: ['54975', '54984', '54993'],
    })
    expect(matrix.periods.map((period) => period.isoPeriod)).toEqual(['2023', '2024'])
  })
})

describe('toChartValue', () => {
  it('parses decimal strings', () => {
    expect(toChartValue('286598')).toBe(286598)
    expect(toChartValue('1234.56')).toBe(1234.56)
    expect(toChartValue('-3')).toBe(-3)
  })

  it('maps every non-numeric marker to null, never to zero', () => {
    expect(toChartValue(null)).toBeNull()
    expect(toChartValue(undefined)).toBeNull()
    expect(toChartValue('')).toBeNull()
    expect(toChartValue('   ')).toBeNull()
    expect(toChartValue(':')).toBeNull()
    expect(toChartValue('c')).toBeNull()
  })

  it('preserves a real zero', () => {
    expect(toChartValue('0')).toBe(0)
  })
})

describe('buildBarSeries', () => {
  const matrix = buildComparisonMatrix({
    observations: [
      observation({ siruta: '54975', name: 'Cluj-Napoca', period: annual(2024), value: '288104' }),
      observation({ siruta: '54984', name: 'Turda', period: annual(2023), value: '43302' }),
    ],
    sirutaCodes: ['54975', '54984'],
  })

  it('emits null (a gap) for a territory missing the selected period', () => {
    expect(buildBarSeries(matrix, '2024')).toEqual([
      { siruta: '54975', name: 'Cluj-Napoca', value: 288104 },
      { siruta: '54984', name: 'Turda', value: null },
    ])
  })

  it('emits all-null bars when no period is selected', () => {
    expect(buildBarSeries(matrix, null).every((bar) => bar.value === null)).toBe(true)
  })
})

describe('buildLineSeries', () => {
  it('emits explicit nulls for gaps so connectNulls={false} can break the line', () => {
    const matrix = buildComparisonMatrix({
      observations: [
        observation({ siruta: '54975', period: annual(2023), value: '2' }),
        observation({ siruta: '54975', period: annual(2024), value: '3' }),
        observation({ siruta: '54984', period: annual(2023), value: '1' }),
      ],
      sirutaCodes: ['54975', '54984'],
    })

    expect(buildLineSeries(matrix)).toEqual([
      { isoPeriod: '2023', [lineSeriesKey('54975')]: 2, [lineSeriesKey('54984')]: 1 },
      { isoPeriod: '2024', [lineSeriesKey('54975')]: 3, [lineSeriesKey('54984')]: null },
    ])
  })

  it('never collides a SIRUTA key with the axis key', () => {
    expect(lineSeriesKey('isoPeriod')).not.toBe('isoPeriod')
  })

  it('orders points oldest-first across a year boundary', () => {
    const matrix = buildComparisonMatrix({
      observations: [
        observation({ siruta: '1', period: quarterly(2024, 1), value: '2' }),
        observation({ siruta: '1', period: quarterly(2023, 4), value: '1' }),
      ],
      sirutaCodes: ['1'],
    })

    expect(buildLineSeries(matrix).map((point) => point.isoPeriod)).toEqual([
      '2023-Q4',
      '2024-Q1',
    ])
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
    expect(pins).toEqual(['AGE:ALL', 'SEX:M'])
  })

  it('removes every pin for a dimension type', () => {
    expect(removeClassificationPin(['SEX:TOTAL', 'AGE:ALL'], 'SEX')).toEqual(['AGE:ALL'])
  })

  it('auto-pins a Total option case-insensitively', () => {
    expect(
      pickAutoPinnedOption([
        { code: 'M', label: 'Masculin' },
        { code: 'T', label: 'Total' },
      ]),
    ).toEqual({ code: 'T', label: 'Total' })

    expect(
      pickAutoPinnedOption([{ code: 'T', label: 'TOTAL populație' }]),
    ).toEqual({ code: 'T', label: 'TOTAL populație' })
  })

  it('does not invent a pin when no Total option exists', () => {
    expect(pickAutoPinnedOption([{ code: 'M', label: 'Masculin' }])).toBeNull()
  })
})

describe('resolveEffectiveClassificationPins', () => {
  const dimensions = [
    {
      typeCode: 'SEX',
      options: [
        { code: 'T', label: 'Total' },
        { code: 'M', label: 'Masculin' },
      ],
    },
    {
      typeCode: 'AGE',
      options: [
        { code: 'ALL', label: 'Total' },
        { code: '0_14', label: '0-14 ani' },
      ],
    },
  ]

  it('auto-pins Total for every unpinned dimension', () => {
    expect(resolveEffectiveClassificationPins({ dimensions, urlPins: [] })).toEqual([
      { typeCode: 'SEX', valueCode: 'T' },
      { typeCode: 'AGE', valueCode: 'ALL' },
    ])
  })

  it('honours a URL pin and auto-pins only the rest', () => {
    expect(
      resolveEffectiveClassificationPins({ dimensions, urlPins: ['SEX:M'] }),
    ).toEqual([
      { typeCode: 'SEX', valueCode: 'M' },
      { typeCode: 'AGE', valueCode: 'ALL' },
    ])
  })

  it('drops a pin whose value this dataset does not offer, falling back to Total', () => {
    expect(
      resolveEffectiveClassificationPins({ dimensions, urlPins: ['SEX:UNKNOWN'] }),
    ).toEqual([
      { typeCode: 'SEX', valueCode: 'T' },
      { typeCode: 'AGE', valueCode: 'ALL' },
    ])
  })

  it('drops a pin for a dimension this dataset does not have', () => {
    expect(
      resolveEffectiveClassificationPins({
        dimensions: [dimensions[0]],
        urlPins: ['SEX:M', 'CAEN:A'],
      }),
    ).toEqual([{ typeCode: 'SEX', valueCode: 'M' }])
  })

  it('leaves a dimension unpinned when it has no Total option', () => {
    expect(
      resolveEffectiveClassificationPins({
        dimensions: [{ typeCode: 'CAEN', options: [{ code: 'A', label: 'Agricultură' }] }],
        urlPins: [],
      }),
    ).toEqual([])
  })
})
