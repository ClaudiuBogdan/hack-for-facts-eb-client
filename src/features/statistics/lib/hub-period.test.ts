import { describe, expect, it } from 'vitest'
import type { InsTimePeriod } from '@/schemas/ins'
import type {
  StatisticsIndicatorTile,
  StatisticsTerritoryHubResult,
} from '@/schemas/statistics'
import { applyHubPeriod, collectHubPeriodOptions } from './hub-period'

function period(
  iso: string,
  year: number,
  quarter: number | null = null,
  month: number | null = null,
): InsTimePeriod {
  return {
    iso_period: iso,
    year,
    quarter,
    month,
    periodicity: month ? 'MONTHLY' : quarter ? 'QUARTERLY' : 'ANNUAL',
  }
}

function tile(
  overrides: Partial<StatisticsIndicatorTile> = {},
): StatisticsIndicatorTile {
  return {
    datasetCode: 'POP107D',
    datasetNameRo: 'Populația',
    datasetNameEn: null,
    periodicity: ['ANNUAL'],
    dataStatus: 'available',
    tileState: 'available',
    value: '324576',
    valueStatus: 'e',
    unitSymbol: 'pers.',
    unitNameRo: 'persoane',
    latestPeriod: '2024',
    latestYear: 2024,
    sparkline: [
      [period('2022', 2022), '320000'],
      [period('2023', 2023), null],
      [period('2024', 2024), '324576'],
    ],
    ...overrides,
  }
}

function hub(tiles: StatisticsIndicatorTile[]): StatisticsTerritoryHubResult {
  return {
    identity: {
      siruta: '54975',
      name: 'Municipiul Cluj-Napoca',
      level: 'LAU',
      countyName: 'Cluj',
      countyCode: 'CJ',
      enrichedFallback: false,
    },
    tiles,
    availableDatasetCodes: ['POP107D'],
    coverage: {
      availableDatasetCount: 27,
      totalDatasetCount: 1898,
      catalogOnlyDatasetCount: 1871,
      partial: false,
    },
    relatedLinks: [],
    latestDataPeriod: '2024',
    partial: false,
    benchmarks: {},
  }
}

describe('collectHubPeriodOptions', () => {
  it('returns every period across tiles, most recent first', () => {
    const options = collectHubPeriodOptions(hub([tile()]))
    expect(options.map((p) => p.iso_period)).toEqual(['2024', '2023', '2022'])
  })

  it('is not capped at five periods', () => {
    const sparkline = Array.from({ length: 8 }, (_, index) => {
      const year = 2017 + index
      return [period(String(year), year), '1'] as const
    })
    const options = collectHubPeriodOptions(hub([tile({ sparkline })]))
    expect(options).toHaveLength(8)
  })

  it('orders periods by their structured fields, so annual sorts under sub-annual of the same year', () => {
    const sparkline = [
      [period('2024', 2024), '1'],
      [period('2024-Q1', 2024, 1), '2'],
      [period('2024-Q2', 2024, 2), '3'],
      [period('2023-12', 2023, null, 12), '4'],
    ] as const
    const options = collectHubPeriodOptions(hub([tile({ sparkline })]))
    expect(options.map((p) => p.iso_period)).toEqual([
      '2024-Q2',
      '2024-Q1',
      '2024',
      '2023-12',
    ])
  })

  it('deduplicates periods shared by several tiles', () => {
    const options = collectHubPeriodOptions(hub([tile(), tile({ datasetCode: 'FOM104D' })]))
    expect(options).toHaveLength(3)
  })

  it('handles a missing hub', () => {
    expect(collectHubPeriodOptions(null)).toEqual([])
  })
})

describe('applyHubPeriod', () => {
  it('is the identity when no period is selected', () => {
    const source = hub([tile()])
    expect(applyHubPeriod(source, null)).toBe(source)
  })

  it('re-anchors the headline value to the selected period', () => {
    const [result] = applyHubPeriod(hub([tile()]), '2022').tiles
    expect(result.value).toBe('320000')
    expect(result.latestPeriod).toBe('2022')
    expect(result.latestYear).toBe(2022)
    expect(result.tileState).toBe('available')
  })

  it('reports no-data rather than falling back to another period', () => {
    const [result] = applyHubPeriod(hub([tile()]), '2023').tiles
    expect(result.value).toBeNull()
    expect(result.tileState).toBe('no-data')
  })

  it('reports no-data for a period the tile never covered', () => {
    const [result] = applyHubPeriod(hub([tile()]), '1999').tiles
    expect(result.value).toBeNull()
    expect(result.tileState).toBe('no-data')
  })

  it('does not carry value_status onto a different period', () => {
    const [result] = applyHubPeriod(hub([tile()]), '2022').tiles
    expect(result.valueStatus).toBeNull()
  })

  it('keeps value_status on the tile latest period', () => {
    const [result] = applyHubPeriod(hub([tile()]), '2024').tiles
    expect(result.valueStatus).toBe('e')
  })

  it('leaves catalog-only tiles untouched', () => {
    const catalogTile = tile({ dataStatus: 'catalog-only', tileState: 'catalog-only' })
    const [result] = applyHubPeriod(hub([catalogTile]), '2022').tiles
    expect(result).toBe(catalogTile)
  })

  it('keeps latestDataPeriod as provenance, not as the selection', () => {
    expect(applyHubPeriod(hub([tile()]), '2022').latestDataPeriod).toBe('2024')
  })
})
