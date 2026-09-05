import { describe, expect, it } from 'vitest'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { applyHubPeriod } from '../lib/hub-period'
import {
  getMockStatisticsLandingCatalog,
  getMockStatisticsTerritoryHub,
  getMockStatisticsUatSnapshot,
} from './statistics-fixtures'

describe('statistics mock fixtures', () => {
  it('returns null for an unknown SIRUTA (404 contract, not throw)', () => {
    expect(getMockStatisticsTerritoryHub('00000000')).toBeNull()
  })

  it('builds a territory hub for SIRUTA 54975 (Cluj-Napoca LAU)', () => {
    const hub = getMockStatisticsTerritoryHub('54975')
    expect(hub).not.toBeNull()
    expect(hub?.identity.siruta).toBe('54975')
    expect(hub?.identity.name).toBe('Municipiul Cluj-Napoca')
    expect(hub?.identity.level).toBe('LAU')
    // POP107D, FOM104D, SOM101F, LOC101B are all available in the fixture.
    expect(hub?.availableDatasetCodes).toContain('POP107D')
    expect(hub?.availableDatasetCodes).toContain('FOM104D')
    expect(hub?.availableDatasetCodes).toContain('SOM101F')
    expect(hub?.availableDatasetCodes).toContain('LOC101B')
  })

  it('exposes catalog-only and no-data indicator tile states', () => {
    const hub = getMockStatisticsTerritoryHub('54975')
    const catalogTile = hub?.tiles.find((tile) => tile.datasetCode === 'TUR101C')
    const noDataTile = hub?.tiles.find((tile) => tile.datasetCode === 'SCL101C')

    expect(catalogTile?.dataStatus).toBe('catalog-only')
    expect(catalogTile?.tileState).toBe('catalog-only')
    expect(noDataTile?.dataStatus).toBe('available')
    expect(noDataTile?.tileState).toBe('no-data')
  })

  it('uses the county metric set for the county-style fixture', () => {
    const hub = getMockStatisticsTerritoryHub('179132')
    const codes = hub?.tiles.map((tile) => tile.datasetCode) ?? []

    expect(hub?.identity.level).toBe('NUTS3')
    expect(hub?.identity.countyCode).toBe('B')
    expect(codes).toContain('SOM103A')
    expect(codes).not.toContain('SOM101F')
  })

  it('exposes a sparkline gap for POP107D (2022 absent)', () => {
    const hub = getMockStatisticsTerritoryHub('54975')
    const popTile = hub?.tiles.find((tile) => tile.datasetCode === 'POP107D')
    expect(popTile).toBeDefined()
    const years = popTile!.sparkline.map(([period]) => period.year)
    expect(years).toEqual([2021, 2023, 2024])
    expect(years).not.toContain(2022)
    expect(years).toContain(2021)
    expect(years).toContain(2023)
    expect(years).toContain(2024)
  })

  it('re-anchors the mock hub to a requested period', () => {
    const hub = applyHubPeriod(getMockStatisticsTerritoryHub('54975')!, '2023')
    const popTile = hub.tiles.find((tile: StatisticsIndicatorTile) => tile.datasetCode === 'POP107D')

    expect(popTile?.latestPeriod).toBe('2023')
    expect(popTile?.tileState).toBe('available')
  })

  it('does not invent freshness for a requested period with no observations', () => {
    const hub = applyHubPeriod(getMockStatisticsTerritoryHub('54975')!, '2020')
    const popTile = hub.tiles.find((tile: StatisticsIndicatorTile) => tile.datasetCode === 'POP107D')

    expect(popTile?.tileState).toBe('no-data')
    expect(popTile?.value).toBeNull()
  })

  it('carries value_status on the FOM104D latest observation', () => {
    const hub = getMockStatisticsTerritoryHub('54975')
    const fomTile = hub?.tiles.find((tile) => tile.datasetCode === 'FOM104D')
    expect(fomTile?.valueStatus).toBe('e')
  })

  it('renders a null-unit observation for SOM101F without throwing', () => {
    const hub = getMockStatisticsTerritoryHub('54975')
    const somTile = hub?.tiles.find((tile) => tile.datasetCode === 'SOM101F')
    expect(somTile).toBeDefined()
    // Latest (2023) has a unit symbol; the 2022 point has a null unit.
    expect(somTile?.unitSymbol).toBe('lei')
  })

  it('answers catalog counts whose theme totals sum to the catalog', () => {
    const catalog = getMockStatisticsLandingCatalog()
    const themeSum = catalog.themes.reduce((sum, theme) => sum + theme.count, 0)
    expect(themeSum).toBe(catalog.catalogCount)
  })

  it('returns a null-territory snapshot for an unknown SIRUTA', () => {
    expect(getMockStatisticsUatSnapshot('00000000').territory).toBeNull()
    expect(getMockStatisticsUatSnapshot('54975').territory?.siruta).toBe('54975')
  })

  it('emits related links only to existing routes (no deferred statistics routes)', () => {
    const hub = getMockStatisticsTerritoryHub('54975')
    const targets = hub?.relatedLinks.map((link) => link.to) ?? []
    expect(targets).toContain('/budget-explorer')
    expect(targets).toContain('/map')
    // Deferred statistics routes must NOT appear.
    expect(targets).not.toContain('/statistici/harti')
    expect(targets).not.toContain('/statistici/comparatii')
  })

  it('keeps county related links enabled when a county code is known', () => {
    const hub = getMockStatisticsTerritoryHub('179132')
    const scopedLinks =
      hub?.relatedLinks.filter((link) => link.to === '/budget-explorer' || link.to === '/map') ??
      []

    expect(scopedLinks).toHaveLength(2)
    expect(scopedLinks.every((link) => link.enabled)).toBe(true)
    expect(scopedLinks.every((link) => link.joinBasis === 'county')).toBe(true)
    expect(scopedLinks.every((link) => link.joinValue === 'B')).toBe(true)
  })
})
