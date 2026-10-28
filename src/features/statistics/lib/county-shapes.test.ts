import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveGeoJsonAssetUrl } from '@/hooks/useGeoJson'
import shapesJson from '../data/county-shapes.json'
import { countyShapes, type CountyFeature } from './county-map'
import { buildCountyShapesFile, readCountyShapesFile } from './county-shapes'

// The committed file, checked against what it stands for: the boundary file the
// app serves, run through the maps' own projection. A new boundary file or a
// changed projection fails here, not in a reader's map.
// Vitest runs from the repository root, which `source` is relative to.
const features = (JSON.parse(readFileSync(resolve(process.cwd(), shapesJson.source), 'utf8')) as { readonly features: readonly CountyFeature[] }).features

describe('the county shapes file', () => {
  it('is made from the county GeoJSON the app serves', () => {
    expect(shapesJson.source).toBe(`public${resolveGeoJsonAssetUrl('County')}`)
  })

  it('is what `scripts/generate-county-shapes.ts` makes of it today', () => {
    expect(buildCountyShapesFile(features, shapesJson.source)).toEqual(shapesJson)
  })

  it('draws the paths the maps drew from the GeoJSON, with each label where the projection put it', () => {
    const projected = countyShapes(features)
    const shapes = readCountyShapesFile(shapesJson)
    expect(shapes.counties.map((county) => county.code)).toEqual(projected.counties.map((county) => county.code))
    expect(shapes.height).toBeCloseTo(projected.height, 1)
    shapes.counties.forEach((county, index) => {
      const drawn = projected.counties[index]!
      expect(county.d).toBe(drawn.d)
      expect(Math.abs(county.label[0] - drawn.label[0])).toBeLessThanOrEqual(0.05)
      expect(Math.abs(county.label[1] - drawn.label[1])).toBeLessThanOrEqual(0.05)
      expect(Math.abs(county.room - drawn.room)).toBeLessThanOrEqual(0.005)
    })
  })

  it('holds the 42 counties, each once', () => {
    const codes = shapesJson.counties.map((county) => county.code)
    expect(new Set(codes).size).toBe(42)
  })

  it('refuses shapes projected for another width', () => {
    expect(() => readCountyShapesFile({ ...shapesJson, width: 320 })).toThrow(/regenerate/)
  })
})
