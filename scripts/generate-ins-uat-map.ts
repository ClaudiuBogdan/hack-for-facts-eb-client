#!/usr/bin/env node
/**
 * Regenerates the INS hub's UAT map: its shapes and its figures, as two JSON
 * files under `src/features/statistics/data/` that the page imports lazily.
 *
 *   yarn ins:uat-map                     # both
 *   yarn ins:uat-map --only geometry     # the shapes, from the GeoJSON on disk
 *   yarn ins:uat-map --only values       # the figures, from the API
 *
 * Run it when INS publishes a new year of locality data (the figures) or when
 * the UAT boundaries change (a new dated GeoJSON under `public/geojson/`).
 *
 * Options:
 *   --api        GraphQL endpoint (default: dev-chronos-api)
 *   --width      grid width of the shapes, in integer units (default 4000)
 *   --last-year  the newest year asked for (default: next year, as the territory page)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import type { UatMapGeometry } from '../src/features/statistics/lib/uat-map-snapshot'
import { buildUatGeometry } from './ins-uat-map/geometry'
import { buildUatValues } from './ins-uat-map/values'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const GEOJSON = 'public/geojson/uat-2026-03-09.json'
const OUT_DIR = resolve(ROOT, 'src/features/statistics/data')
const GEOMETRY_OUT = resolve(OUT_DIR, 'uat-map-geometry.json')
const VALUES_OUT = resolve(OUT_DIR, 'uat-map-values.json')

const { values: args } = parseArgs({
  options: {
    api: { type: 'string', default: 'https://dev-chronos-api.transparenta.eu/api/v1/graphql' },
    width: { type: 'string', default: '4000' },
    'last-year': { type: 'string', default: String(new Date().getUTCFullYear() + 1) },
    only: { type: 'string' },
  },
})

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`
function sizes(label: string, text: string) {
  const raw = Buffer.byteLength(text)
  console.log(`${label.padEnd(22)} raw ${kb(raw).padStart(10)}  gzip ${kb(gzipSync(text, { level: 9 }).length).padStart(9)}  brotli ${kb(brotliCompressSync(text).length).padStart(9)}`)
}

let geometry: UatMapGeometry
if (args.only !== 'values') {
  const started = performance.now()
  const built = buildUatGeometry(JSON.parse(readFileSync(resolve(ROOT, GEOJSON), 'utf8')), { width: Number(args.width), source: GEOJSON })
  geometry = built.geometry
  const text = JSON.stringify(geometry)
  writeFileSync(GEOMETRY_OUT, `${text}\n`)
  console.log(
    `geometry: ${geometry.siruta.length} UATs, ${built.stats.vertices} ring vertices → ${built.stats.arcs} arcs (${built.stats.arcVertices} vertices), ${built.stats.junctions} junctions, grid ${geometry.width}×${geometry.height}, ${(performance.now() - started).toFixed(0)} ms`,
  )
  sizes('source GeoJSON', readFileSync(resolve(ROOT, GEOJSON), 'utf8'))
  sizes('geometry (paths)', text)
  sizes('  paths only', JSON.stringify(geometry.paths))
  sizes('  arcs, for comparison', built.stats.arcsJson)
  sizes('  county borders', geometry.countyBorders + geometry.outline)
  sizes('  labels', JSON.stringify(geometry.labels))
} else {
  geometry = JSON.parse(readFileSync(GEOMETRY_OUT, 'utf8')) as UatMapGeometry
}

if (args.only !== 'geometry') {
  const started = performance.now()
  const values = await buildUatValues({
    api: args.api!,
    siruta: geometry.siruta,
    lastYear: Number(args['last-year']),
    log: (line) => console.log(`  ${line}`),
  })
  const text = JSON.stringify(values)
  writeFileSync(VALUES_OUT, `${text}\n`)
  for (const series of values.series) {
    const counted = series.total.values.filter((value) => value !== null).length
    const rated = series.rate ? `${series.rate.values.filter((value) => value !== null).length} rated (${series.small.length} small), RO ${series.rate.national}` : 'no rate'
    console.log(
      `  ${series.id.padEnd(15)} ${series.previousYear}→${series.year}  ${counted} counted, ${rated}; change RO ${series.change.national} (${series.change.kind}), ${series.unsteady.length} unsteady`,
    )
  }
  console.log(`values: ${((performance.now() - started) / 1000).toFixed(0)} s`)
  sizes('values', text)
}
