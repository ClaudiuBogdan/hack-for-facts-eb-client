import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { describe, expect, it } from 'vitest'
import { foldCountyName } from '../../lib/county-names'
import { binOf, binThresholds, project } from './county-map'

type CountyProperties = { readonly name: string; readonly mnemonic: string }

/**
 * Projected against the boundary file the app actually ships, not a fixture.
 *
 * The map is only honest if every county the API names finds its polygon, and
 * that join runs through `foldCountyName` over two different spellings of the
 * Romanian diacritics. A fixture would let the two drift; this test fails the
 * day a new boundary revision renames a county.
 */
const geo = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/geojson/judete-2026-03-09.json'), 'utf-8'),
) as FeatureCollection<Polygon | MultiPolygon, CountyProperties>

const features = geo.features as Feature<Polygon | MultiPolygon, CountyProperties>[]

describe('project', () => {
  it('projects all 42 counties into one finite box', () => {
    const { projected, height } = project(features)

    expect(projected).toHaveLength(42)
    expect(Number.isFinite(height)).toBe(true)
    // Romania is wider than it is tall, and not by a lot.
    expect(height).toBeGreaterThan(300)
    expect(height).toBeLessThan(640)
  })

  it('gives every county a closed path and a centroid inside the box', () => {
    const { projected, height } = project(features)

    for (const shape of projected) {
      expect(shape.d.startsWith('M')).toBe(true)
      expect(shape.d.endsWith('Z')).toBe(true)
      expect(shape.d).not.toContain('NaN')
      const [x, y] = shape.centroid
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(640)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(height)
    }
  })

  it('keys counties so the registry spelling finds its polygon', () => {
    const keys = new Set(project(features).projected.map((shape) => shape.key))

    expect(keys.size).toBe(42)
    // The cedilla forms are what the company registry sends.
    for (const registrySpelling of ['Bucureşti', 'Timiş', 'Iaşi', 'Constanţa', 'Braşov']) {
      expect(keys.has(foldCountyName(registrySpelling))).toBe(true)
    }
  })
})

/**
 * The legend has to name the boundaries the shading uses. Derived separately
 * they drifted by one step, so the darkest swatch claimed a county the map had
 * shaded a shade lighter.
 */
describe('binThresholds', () => {
  it('names a boundary that really falls in its own bin', () => {
    const sorted = [10, 20, 30, 40, 50]
    binThresholds(sorted).forEach((threshold, bin) => {
      expect(binOf(threshold, sorted)).toBe(bin)
    })
  })

  it('agrees with the shading over a realistic county spread', () => {
    const sorted = Array.from({ length: 42 }, (_, index) => (index + 1) * 1_313).sort((a, b) => a - b)
    binThresholds(sorted).forEach((threshold, bin) => {
      expect(binOf(threshold, sorted)).toBe(bin)
    })
  })

  it('survives a single county and an empty list', () => {
    expect(binThresholds([]).every((value) => value === 0)).toBe(true)
    expect(binThresholds([7]).every((value) => value === 7)).toBe(true)
  })
})

describe('project — keys', () => {
  it('matches every registry spelling to a polygon', () => {
    const keys = new Set(project(features).projected.map((shape) => shape.key))

    expect(keys.size).toBe(42)
    // The cedilla forms are what the company registry sends.
    for (const registrySpelling of ['Bucureşti', 'Timiş', 'Iaşi', 'Constanţa', 'Braşov']) {
      expect(keys.has(foldCountyName(registrySpelling))).toBe(true)
    }
  })
})
