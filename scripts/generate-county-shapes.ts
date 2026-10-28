#!/usr/bin/env node
/**
 * Regenerates the county maps' shapes, `src/features/statistics/data/county-shapes.json`:
 * the county GeoJSON projected and labelled once, here, by the maps' own
 * projection (`countyShapes` in `src/features/statistics/lib/county-map.ts`),
 * instead of in every reader's browser.
 *
 *   node --import tsx --import ./scripts/lib/lingui-macro-stubs.mjs scripts/generate-county-shapes.ts
 *
 * Run it when the county boundaries change (a new dated GeoJSON under
 * `public/geojson/`, named in `src/hooks/useGeoJson.ts`) or when the
 * projection does; `county-shapes.test.ts` fails until the file matches both.
 *
 * Options:
 *   --source   the county GeoJSON, from the repository root (default: the one the app serves)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import type { CountyFeature } from '../src/features/statistics/lib/county-map'
import { buildCountyShapesFile } from '../src/features/statistics/lib/county-shapes'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'src/features/statistics/data/county-shapes.json')

const { values: args } = parseArgs({
  options: { source: { type: 'string', default: 'public/geojson/judete-2026-10-28.json' } },
})

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`
function sizes(label: string, text: string) {
  const raw = Buffer.byteLength(text)
  console.log(`${label.padEnd(16)} raw ${kb(raw).padStart(9)}  gzip ${kb(gzipSync(text, { level: 9 }).length).padStart(8)}  brotli ${kb(brotliCompressSync(text).length).padStart(8)}`)
}

const source = args.source!
const geojson = readFileSync(resolve(ROOT, source), 'utf8')
const started = performance.now()
const file = buildCountyShapesFile((JSON.parse(geojson) as { readonly features: readonly CountyFeature[] }).features, source)
const text = JSON.stringify(file)
writeFileSync(OUT, `${text}\n`)
console.log(`${file.counties.length} counties, ${file.width}×${file.height}, ${(performance.now() - started).toFixed(0)} ms`)
sizes('source GeoJSON', geojson)
sizes('county shapes', text)
