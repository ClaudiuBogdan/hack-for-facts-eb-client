import { describe, expect, it } from 'vitest'
import { parseStatisticsHubSearch } from '@/schemas/statistics'
import geometryJson from '../data/uat-map-geometry.json'
import valuesJson from '../data/uat-map-values.json'
import type { UatMapGeometry, UatMapValues } from './uat-map-snapshot'

// The committed snapshot, checked where a bad regeneration would otherwise
// surface: in a reader's browser, as the band's failure.
const geometry = geometryJson as unknown as UatMapGeometry
const values = valuesJson as unknown as UatMapValues

describe('the UAT map snapshot', () => {
  it('aligns its figures with its shapes, UAT by UAT', () => {
    expect(values.siruta).toEqual(geometry.siruta)
    for (const field of [geometry.name, geometry.county, geometry.kind, geometry.paths]) expect(field).toHaveLength(geometry.siruta.length)
    expect(geometry.labels).toHaveLength(geometry.siruta.length * 3)
  })

  it('holds every series the map offers, each a figure per UAT', () => {
    const offered = ['populatie', 'spor-natural', 'sold-domiciliu', 'salariati', 'locuinte-noi', 'apa']
    expect(values.series.map((series) => series.id)).toEqual(offered)
    for (const series of values.series) {
      expect(parseStatisticsHubSearch({ harta: series.id })).toEqual({ harta: series.id })
      expect(series.total.values).toHaveLength(geometry.siruta.length)
      for (const part of series.parts) expect(part.values).toHaveLength(geometry.siruta.length)
      for (const [index, reason] of Object.entries(series.missing)) {
        expect(['absent', 'negative']).toContain(reason)
        expect(series.total.values[Number(index)]).toBeNull()
      }
    }
  })

  it('knows every county a UAT names', () => {
    expect(new Set(geometry.county)).toEqual(new Set(Object.keys(geometry.counties)))
  })

  it('keeps unreported domestic water missing, including places with reported total distribution', () => {
    const water = values.series.find((series) => series.id === 'apa')!
    expect(water.year).toBe(2025)
    // GOS108A, 2025, read in Chronos on 2026-10-07: these thirteen places
    // report a positive TOTAL distribution (7415) and no domestic-use cell
    // (7416). Their missing domestic-use cells cannot establish absence of a
    // network. (The ten found in the 2024 data were six of these, three that
    // have since published a domestic cell and one with no total for 2025.)
    const counterexamples = ['14753', '155662', '21418', '167035', '23207', '179944', '150258', '35429', '36756', '151521', '108696', '144376', '110571']
    for (const siruta of counterexamples) {
      const index = values.siruta.indexOf(siruta)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(water.total.values[index]).toBeNull()
      expect(water.missing[index]).toBe('absent')
    }
  })

  it('keeps missing completed-housing records distinct from recorded zeroes', () => {
    const housing = values.series.find((series) => series.id === 'locuinte-noi')!
    // LOC104B, ownership Total (7982), 2025: verified in Chronos on 2026-09-26.
    for (const siruta of ['153400', '152314', '151978']) {
      const index = values.siruta.indexOf(siruta)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(housing.total.values[index]).toBeNull()
      expect(housing.missing[index]).toBe('absent')
    }
    for (const siruta of ['81656', '78604', '78828']) {
      const index = values.siruta.indexOf(siruta)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(housing.total.values[index]).toBe(0)
      expect(housing.missing[index]).toBeUndefined()
    }
  })
})
