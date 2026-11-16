#!/usr/bin/env node
/**
 * Label points for the MapLibre UAT map: one point per UAT and per county,
 * inside the shape and as far from its edges as it gets (the pole of
 * inaccessibility of its largest part), written beside the boundary files
 * they come from.
 *
 *   yarn map:label-points
 *
 * Computed here rather than in the browser: 3,186 poles take seconds on a
 * phone. Run it whenever a new dated boundary file lands in `public/geojson/`,
 * and point the map at the new output (it is dated the same way, so it is
 * cached for a year like the boundaries — see `nitro.config.ts`).
 *
 * Shapes are measured in a plane where a degree of longitude is shortened by
 * the cosine of Romania's middle latitude, so "farthest from the edges" means
 * the same east–west as north–south.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { gzipSync } from 'node:zlib'
import type { FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson'
import { poleOfInaccessibility } from '../src/features/statistics/lib/county-map'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { values: args } = parseArgs({ options: { date: { type: 'string', default: '2026-10-28' } } })
const UAT_IN = resolve(ROOT, `public/geojson/uat-${args.date}.json`)
const COUNTY_IN = resolve(ROOT, `public/geojson/judete-${args.date}.json`)
const OUT = resolve(ROOT, `public/geojson/label-points-${args.date}.json`)

const COS_LAT = Math.cos((46 * Math.PI) / 180)
/** ~100 m: finer changes nothing a label can show. */
const PRECISION = 0.001
const round = (value: number, digits: number) => Number(value.toFixed(digits))

type Point = readonly [number, number]

function polygonsOf(geometry: Polygon | MultiPolygon): Position[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
}

function ringArea(ring: readonly Point[]): number {
  let sum = 0
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i]!
    const [x2, y2] = ring[(i + 1) % ring.length]!
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

/** The label point of a (multi)polygon, in lon/lat, and its room in planar degrees. */
function labelPoint(geometry: Polygon | MultiPolygon): { readonly lon: number; readonly lat: number; readonly room: number } {
  let best: { point: Point; distance: number } | null = null
  let bestArea = -1
  for (const polygon of polygonsOf(geometry)) {
    const rings = polygon.map((ring) => ring.map(([lon, lat]) => [lon! * COS_LAT, lat!] as const))
    const area = ringArea(rings[0] ?? [])
    if (area <= bestArea) continue
    bestArea = area
    best = poleOfInaccessibility(rings, PRECISION)
  }
  if (!best) throw new Error('A feature without a polygon.')
  return { lon: round(best.point[0] / COS_LAT, 4), lat: round(best.point[1], 4), room: round(best.distance, 4) }
}

type UatProps = { readonly natcode: string }
type CountyProps = { readonly mnemonic: string }

const uats = JSON.parse(readFileSync(UAT_IN, 'utf8')) as FeatureCollection<Polygon | MultiPolygon, UatProps>
const counties = JSON.parse(readFileSync(COUNTY_IN, 'utf8')) as FeatureCollection<Polygon | MultiPolygon, CountyProps>

function columns<P>(features: FeatureCollection<Polygon | MultiPolygon, P>['features'], id: (props: P) => string) {
  const out = { id: [] as string[], lon: [] as number[], lat: [] as number[], room: [] as number[] }
  for (const feature of features) {
    const point = labelPoint(feature.geometry)
    out.id.push(id(feature.properties))
    out.lon.push(point.lon)
    out.lat.push(point.lat)
    out.room.push(point.room)
  }
  return out
}

const started = Date.now()
const output = {
  source: { uats: `uat-${args.date}.json`, counties: `judete-${args.date}.json` },
  /** Columnar, aligned by index. `id` is the SIRUTA (`natcode`) for a UAT, the mnemonic (`CJ`) for a county. */
  uats: columns(uats.features, (props) => String(props.natcode)),
  counties: columns(counties.features, (props) => String(props.mnemonic)),
}
const json = JSON.stringify(output)
writeFileSync(OUT, json)
console.log(
  `${OUT}: ${output.uats.id.length} UATs, ${output.counties.id.length} counties, ${(json.length / 1024).toFixed(0)} KB (${(gzipSync(json).length / 1024).toFixed(0)} KB gz), ${Date.now() - started} ms`,
)
