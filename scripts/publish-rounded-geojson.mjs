#!/usr/bin/env node
/**
 * Publish a boundary file under `public/geojson/` as a smaller copy: coordinates
 * rounded to 5 decimals (about 1 m), consecutive duplicate points dropped, the
 * named properties removed, compact JSON.
 *
 *   node scripts/publish-rounded-geojson.mjs <source.json> <target.json> [--drop a,b,c]
 *
 * The target must be a new dated file (`useGeoJson.ts` explains why a dated
 * file is never overwritten); the source stays in place for clients that still
 * hold its URL. Rounding is the same for every vertex, so the borders that
 * neighbouring features share stay shared.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const DECIMALS = 5
const FACTOR = 10 ** DECIMALS

const [source, target, flag, dropList] = process.argv.slice(2)
if (!source || !target || (flag !== undefined && flag !== '--drop')) {
  console.error('usage: publish-rounded-geojson.mjs <source.json> <target.json> [--drop a,b,c]')
  process.exit(2)
}
if (existsSync(target)) {
  console.error(`${target} exists: publish under a new dated name instead`)
  process.exit(1)
}
const drop = new Set((dropList ?? '').split(',').filter(Boolean))

const round = (value) => Math.round(value * FACTOR) / FACTOR

/** A ring rounded, without consecutive repeats; the ring as it was if rounding would collapse it below 4 positions. */
function roundRing(ring) {
  const rounded = ring.map(([x, y]) => [round(x), round(y)])
  const kept = rounded.filter((point, index) => index === 0 || point[0] !== rounded[index - 1][0] || point[1] !== rounded[index - 1][1])
  return kept.length >= 4 ? kept : ring
}

function roundGeometry(geometry) {
  switch (geometry.type) {
    case 'Polygon':
      return { ...geometry, coordinates: geometry.coordinates.map(roundRing) }
    case 'MultiPolygon':
      return { ...geometry, coordinates: geometry.coordinates.map((polygon) => polygon.map(roundRing)) }
    default:
      throw new Error(`unsupported geometry type ${geometry.type}`)
  }
}

const collection = JSON.parse(readFileSync(source, 'utf8'))
if (collection.type !== 'FeatureCollection') throw new Error(`${source} is not a FeatureCollection`)
const features = collection.features.map((feature) => ({
  ...feature,
  geometry: roundGeometry(feature.geometry),
  properties: Object.fromEntries(Object.entries(feature.properties ?? {}).filter(([key]) => !drop.has(key))),
}))
const output = JSON.stringify({ ...collection, features })
writeFileSync(target, output)
console.log(`${source} -> ${target}: ${features.length} features, ${readFileSync(source).length} -> ${output.length} bytes`)
