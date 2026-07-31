import { describe, expect, it } from 'vitest'

import regionGeoJson from '../../public/geojson/region-2026-07-25.json'

const EXPECTED_REGION_NAMES = [
  'Nord-Est',
  'Sud-Est',
  'Sud',
  'Sud-Vest',
  'Vest',
  'Nord-Vest',
  'Centru',
  'București-Ilfov',
] as const

const EXPECTED_ANALYTICS_KEYS = [
  'Nord-Est',
  'Sud-Est',
  'Sud-Muntenia',
  'Sud-Vest Oltenia',
  'Vest',
  'Nord-Vest',
  'Centru',
  'Bucuresti-Ilfov',
] as const

describe('development-region GeoJSON', () => {
  it('contains the eight named polygons keyed for the map renderer', () => {
    expect(regionGeoJson.type).toBe('FeatureCollection')
    expect(regionGeoJson.features.map((feature) => feature.properties.name)).toEqual(
      EXPECTED_REGION_NAMES,
    )
    expect(
      regionGeoJson.features.map((feature) => feature.properties.mnemonic),
    ).toEqual(EXPECTED_ANALYTICS_KEYS)
    expect(
      regionGeoJson.features.every(
        (feature) => feature.geometry.type === 'Polygon',
      ),
    ).toBe(true)
  })

  it('keeps the web asset within the simplification budget', () => {
    const coordinateCount = regionGeoJson.features.reduce(
      (featureTotal, feature) =>
        featureTotal +
        feature.geometry.coordinates.reduce(
          (ringTotal, ring) => ringTotal + ring.length,
          0,
        ),
      0,
    )

    expect(regionGeoJson.simplificationToleranceDegrees).toBe(0.005)
    expect(coordinateCount).toBeLessThan(4_000)
  })
})
