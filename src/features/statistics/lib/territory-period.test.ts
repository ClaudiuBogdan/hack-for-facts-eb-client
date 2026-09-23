import { describe, expect, it } from 'vitest'
import type { InsTimePeriod } from '@/schemas/ins'
import type {
  StatisticsIndicatorTile,
  StatisticsTerritoryHubResult,
  StatisticsTileObservation,
} from '@/schemas/statistics'
import {
  applyTerritoryPeriod,
  collectTerritoryYears,
  territoryPeriodAvailable,
} from './territory-period'

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

const cell = (time_period: InsTimePeriod, value: string | null, valueStatus: string | null = null): StatisticsTileObservation => ({
  time_period,
  value,
  valueStatus,
})

function tile(overrides: Partial<StatisticsIndicatorTile> = {}): StatisticsIndicatorTile {
  return {
    datasetCode: 'POP107D',
    datasetNameRo: 'Populația',
    datasetNameEn: null,
    periodicity: ['ANNUAL'],
    dataStatus: 'available',
    tileState: 'available',
    truncated: false,
    value: '324576',
    valueStatus: 'e',
    unitSymbol: 'pers.',
    unitNameRo: 'persoane',
    unitNameEn: 'persons',
    latestPeriod: '2024',
    latestYear: 2024,
    observations: [
      cell(period('2022', 2022), '320000'),
      cell(period('2023', 2023), null, 'c'),
      cell(period('2024', 2024), '324576', 'e'),
    ],
    sparklineCadence: 'ANNUAL',
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
    latestDataPeriod: '2024',
    benchmarks: {},
    benchmarksUnavailable: false,
  }
}

const monthly = tile({
  datasetCode: 'SOM101F',
  periodicity: ['MONTHLY'],
  latestPeriod: '2023-12',
  latestYear: 2023,
  observations: [
    cell(period('2023-11', 2023, null, 11), '1.9'),
    cell(period('2023-12', 2023, null, 12), '2.1'),
  ],
  sparklineCadence: 'MONTHLY',
})

describe('collectTerritoryYears', () => {
  it('lists the years any tile has a cell for, most recent first, once each', () => {
    expect(collectTerritoryYears(hub([tile(), monthly, tile({ datasetCode: 'FOM104D' })]))).toEqual([2024, 2023, 2022])
  })

  it('handles a missing hub', () => {
    expect(collectTerritoryYears(null)).toEqual([])
  })
})

describe('territoryPeriodAvailable', () => {
  it('answers whether any tile can anchor to the period, a year counting its sub-annual cells', () => {
    const source = hub([tile(), monthly])
    expect(territoryPeriodAvailable(source, '2022')).toBe(true)
    expect(territoryPeriodAvailable(source, '2023-11')).toBe(true)
    expect(territoryPeriodAvailable(source, '1999')).toBe(false)
    expect(territoryPeriodAvailable(hub([monthly]), '2023')).toBe(true)
  })
})

describe('applyTerritoryPeriod', () => {
  it('is the identity when no period is selected', () => {
    const source = hub([tile()])
    expect(applyTerritoryPeriod(source, null)).toBe(source)
  })

  it('re-anchors the headline value to the selected period, with that cell’s own flag', () => {
    const [result] = applyTerritoryPeriod(hub([tile()]), '2022').tiles
    expect(result.value).toBe('320000')
    expect(result.valueStatus).toBeNull()
    expect(result.latestPeriod).toBe('2022')
    expect(result.latestYear).toBe(2022)
    expect(result.tileState).toBe('available')
  })

  it('shows a published cell with no readable value as that cell, never as another period’s', () => {
    const [result] = applyTerritoryPeriod(hub([tile()]), '2023').tiles
    expect(result.tileState).toBe('available')
    expect(result.value).toBeNull()
    expect(result.valueStatus).toBe('c')
    expect(result.latestPeriod).toBe('2023')
  })

  it('says a year the series has no cell for is missing, not that the territory has no data', () => {
    const [result] = applyTerritoryPeriod(hub([tile()]), '1999').tiles
    expect(result.tileState).toBe('period-missing')
    expect(result.value).toBeNull()
    expect(result.latestPeriod).toBeNull()
  })

  it('answers a year over a sub-annual series with the latest cell of that year', () => {
    const [result] = applyTerritoryPeriod(hub([monthly]), '2023').tiles
    expect(result.tileState).toBe('available')
    expect(result.value).toBe('2.1')
    expect(result.latestPeriod).toBe('2023-12')
    expect(result.latestYear).toBe(2023)
  })

  it('prefers the annual cell of a year to its sub-annual ones when both exist', () => {
    const mixed = tile({
      observations: [
        cell(period('2024-06', 2024, null, 6), '5'),
        cell(period('2024', 2024), '4'),
      ],
    })
    const [result] = applyTerritoryPeriod(hub([mixed]), '2024').tiles
    expect(result.value).toBe('4')
    expect(result.latestPeriod).toBe('2024')
  })

  it('reports an ambiguity when two cells share the selected token', () => {
    const collision = tile({
      observations: [cell(period('2024-01-01', 2024), '1'), cell(period('2024-01-01', 2024), '2')],
    })
    const [result] = applyTerritoryPeriod(hub([collision]), '2024-01-01').tiles
    expect(result.tileState).toBe('period-ambiguous')
    expect(result.value).toBeNull()
    expect(result.latestPeriod).toBeNull()
  })

  it('leaves catalog-only, ambiguous and empty tiles untouched', () => {
    const catalogTile = tile({ dataStatus: 'catalog-only', tileState: 'catalog-only' })
    const ambiguousTile = tile({ tileState: 'ambiguous', value: null, latestPeriod: null, sparklineCadence: null })
    const emptyTile = tile({ tileState: 'no-data', value: null, latestPeriod: null, observations: [], sparklineCadence: null })
    const { tiles } = applyTerritoryPeriod(hub([catalogTile, ambiguousTile, emptyTile]), '2022')
    expect(tiles[0]).toBe(catalogTile)
    expect(tiles[1]).toBe(ambiguousTile)
    expect(tiles[2]).toBe(emptyTile)
  })

  it('keeps latestDataPeriod as provenance, not as the selection', () => {
    expect(applyTerritoryPeriod(hub([tile()]), '2022').latestDataPeriod).toBe('2024')
  })

  it('does not claim a missing historical period has no data when history is truncated', () => {
    const [result] = applyTerritoryPeriod(hub([tile({ truncated: true })]), '1999').tiles
    expect(result.tileState).toBe('unavailable')
    expect(result.value).toBeNull()
    expect(result.truncated).toBe(true)
  })

  it('can still display an observed period in truncated history', () => {
    const [result] = applyTerritoryPeriod(hub([tile({ truncated: true })]), '2022').tiles
    expect(result.tileState).toBe('available')
    expect(result.value).toBe('320000')
  })
})
