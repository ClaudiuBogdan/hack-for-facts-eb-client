import { describe, expect, it } from 'vitest'
import type { StatisticsIndicatorTile } from '@/schemas/statistics'
import { TERRITORY_HEADLINE_CODES, groupTerritoryTiles, tileUnit } from './territory-groups'

function tile(code: string, unit: Partial<Pick<StatisticsIndicatorTile, 'unitSymbol' | 'unitNameRo'>> = {}): StatisticsIndicatorTile {
  return {
    datasetCode: code,
    datasetNameRo: code,
    datasetNameEn: null,
    periodicity: ['ANNUAL'],
    dataStatus: 'available',
    tileState: 'available',
    truncated: false,
    observations: [],
    value: '1',
    valueStatus: null,
    unitSymbol: unit.unitSymbol ?? null,
    unitNameRo: unit.unitNameRo ?? null,
    unitNameEn: null,
    latestPeriod: '2025',
    latestYear: 2025,
    sparklineCadence: 'ANNUAL',
  }
}

describe('groupTerritoryTiles', () => {
  it('leads with the headline four in their order, and does not repeat them in their domain', () => {
    const tiles = ['LOC101B', 'GOS107A', 'SOM101F', 'POP107D', 'FOM104D', 'POP108C'].map((code) => tile(code))
    const { headline, groups } = groupTerritoryTiles(tiles)
    expect(headline.map((entry) => entry.datasetCode)).toEqual([...TERRITORY_HEADLINE_CODES])
    const population = groups.find((group) => group.definition.key === 'populatie')
    expect(population?.tiles.map((entry) => entry.datasetCode)).toEqual(['POP108C'])
    expect(groups.some((group) => group.definition.key === 'munca')).toBe(false)
  })

  it('keeps the domains in their fixed order, skips empty ones and puts the unknown prefixes last', () => {
    const tiles = ['ZZZ999X', 'TUR104E', 'AGR112B', 'SCL101A'].map((code) => tile(code))
    const { headline, groups } = groupTerritoryTiles(tiles)
    expect(headline).toEqual([])
    expect(groups.map((group) => group.definition.key)).toEqual(['educatie', 'turism', 'agricultura', 'altele'])
    expect(groups[3]?.tiles.map((entry) => entry.datasetCode)).toEqual(['ZZZ999X'])
  })

  it('files a matrix by its prefix whatever the letter case', () => {
    const { groups } = groupTerritoryTiles([tile('jus101a')])
    expect(groups.map((group) => group.definition.key)).toEqual(['justitie'])
  })
})

describe('tileUnit', () => {
  it('reads the unit the API resolved, by symbol or by name', () => {
    expect(tileUnit({ unitSymbol: 'persons', unitNameRo: null })).toBe('persons')
    expect(tileUnit({ unitSymbol: null, unitNameRo: 'Numar persoane' })).toBe('persons')
    expect(tileUnit({ unitSymbol: 'percent', unitNameRo: null })).toBe('percent')
    expect(tileUnit({ unitSymbol: null, unitNameRo: 'Procente' })).toBe('percent')
    expect(tileUnit({ unitSymbol: 'count', unitNameRo: null })).toBe('count')
    expect(tileUnit({ unitSymbol: 'other', unitNameRo: 'Numar' })).toBe('count')
    expect(tileUnit({ unitSymbol: 'other', unitNameRo: 'Ani' })).toBe('years')
    expect(tileUnit({ unitSymbol: 'other', unitNameRo: 'Lei RON' })).toBe('other')
    expect(tileUnit({ unitSymbol: null, unitNameRo: null })).toBe('other')
  })
})
