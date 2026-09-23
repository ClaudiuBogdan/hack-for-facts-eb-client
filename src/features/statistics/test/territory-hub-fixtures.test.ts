import { describe, expect, it } from 'vitest'
import { territoryRelatedLinks } from '../lib/territory-links'
import { tileSparklinePoints } from '../lib/territory-sparkline'
import { territoryHubFixture } from './territory-hub-fixtures'

describe('territoryHubFixture', () => {
  it('answers null for an unknown SIRUTA, as the live adapter does, and trims the code', () => {
    expect(territoryHubFixture('00000000')).toBeNull()
    expect(territoryHubFixture(' 54975 ')?.identity.siruta).toBe('54975')
  })

  it('carries the states the page has to draw', () => {
    const hub = territoryHubFixture('54975')
    const state = (code: string) => hub?.tiles.find((tile) => tile.datasetCode === code)?.tileState
    expect(state('TUR101C')).toBe('catalog-only')
    expect(state('SCL101C')).toBe('no-data')
    expect(hub?.tiles.find((tile) => tile.datasetCode === 'FOM104D')?.valueStatus).toBe('e')
    // 2022 is absent from POP107D on purpose: the sparkline has to break there.
    expect(tileSparklinePoints(hub!.tiles.find((tile) => tile.datasetCode === 'POP107D')!).map(([period]) => period.iso_period)).toEqual(['2021', '2023', '2024'])
    // The cells a period filter chooses from, oldest first.
    expect(hub?.tiles.find((tile) => tile.datasetCode === 'POP107D')?.observations.map((row) => row.time_period.year)).toEqual([2021, 2023, 2024])
  })

  it('links a county fixture into the map and budget explorer on the county basis', () => {
    const hub = territoryHubFixture('179132')
    expect(hub?.identity.level).toBe('NUTS3')
    const links = territoryRelatedLinks(hub!.identity)
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.enabled).toBe(true)
      expect(link).toMatchObject({ joinBasis: 'county', joinValue: 'B' })
    }
  })
})
