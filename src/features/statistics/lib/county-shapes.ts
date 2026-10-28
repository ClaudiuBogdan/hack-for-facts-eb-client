import type { CountyFeature, ProjectedCounty } from './county-map'
import { COUNTY_MAP_WIDTH, countyShapes } from './county-map'

/**
 * The county maps' shapes, projected once when they are generated rather
 * than in every reader's browser: `scripts/generate-county-shapes.ts` runs
 * the maps' own projection (`countyShapes`) over the county GeoJSON and
 * writes `data/county-shapes.json`, which the maps import lazily
 * (`useCountyShapes`). The paths are the ones the projection draws, to the
 * same 0.1 unit; the label points and their room are rounded to what a
 * 640-unit map can show.
 */

/** The generated file: one row per county, in the maps' order (by name). */
export interface CountyShapesFile {
  /** The GeoJSON the shapes come from, under `public/`. */
  readonly source: string
  /** The `viewBox` width the shapes are projected to (`COUNTY_MAP_WIDTH`). */
  readonly width: number
  readonly height: number
  readonly counties: readonly {
    readonly code: string
    readonly name: string
    readonly d: string
    /** The label point, x and y. */
    readonly label: readonly number[]
    readonly room: number
  }[]
}

/** The shapes as a map draws them. */
export interface CountyShapes {
  readonly counties: readonly ProjectedCounty[]
  readonly height: number
}

const round = (value: number, digits: number) => Number(value.toFixed(digits))

/** The file for a set of county features: what the generator writes and the test checks. */
export function buildCountyShapesFile(features: readonly CountyFeature[], source: string): CountyShapesFile {
  const { counties, height } = countyShapes(features)
  return {
    source,
    width: COUNTY_MAP_WIDTH,
    height: round(height, 2),
    counties: counties.map((county) => ({
      code: county.code,
      name: county.name,
      d: county.d,
      label: [round(county.label[0], 1), round(county.label[1], 1)],
      room: round(county.room, 2),
    })),
  }
}

/** The file as the maps read it; one projected for another width is refused rather than drawn wrong. */
export function readCountyShapesFile(file: CountyShapesFile): CountyShapes {
  if (file.width !== COUNTY_MAP_WIDTH) {
    throw new Error(`The county shapes are projected to ${file.width} units, the maps draw ${COUNTY_MAP_WIDTH}: regenerate them.`)
  }
  return {
    height: file.height,
    counties: file.counties.map((county) => ({
      code: county.code,
      name: county.name,
      d: county.d,
      label: [county.label[0] ?? 0, county.label[1] ?? 0],
      room: county.room,
    })),
  }
}
