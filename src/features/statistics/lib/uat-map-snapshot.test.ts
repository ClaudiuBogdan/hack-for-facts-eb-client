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
    }
  })

  it('knows every county a UAT names', () => {
    expect(new Set(geometry.county)).toEqual(new Set(Object.keys(geometry.counties)))
  })
})
