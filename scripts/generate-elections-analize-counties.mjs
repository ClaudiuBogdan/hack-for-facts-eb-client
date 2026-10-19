#!/usr/bin/env node
/**
 * The elections analysis prototype's county index (design note §12, Guidelines
 * G11): every SIRUTA-scoped contest row counted by edition × reported office ×
 * reported round × the INS county of the reporting place, from the cached
 * contest rows `scripts/generate-elections-catalog-fixture.mjs` keeps.
 *
 *   node scripts/generate-elections-analize-counties.mjs --cache <dir>
 *
 * The join is on the SIRUTA code alone, against today's INS UAT list
 * (`public/assets/geojson/uat.json`): never on a source's county numbering
 * (which differs between editions) and never on names. Rows at any other
 * scope (a source's own numbering, a county roll-up, abroad, the country)
 * have no county here; the page keeps them apart. A SIRUTA code the INS
 * list does not know is counted as unlisted, never dropped.
 *
 * Writes `src/development/prototypes/elections/analize/counties.fixture.json`:
 * - `counties`: code and name, as the INS county file spells them;
 * - `editions`, `offices`, `rounds`: the indexes the cells use;
 * - `cells`: `[edition, office, round, [rows per county, in `counties` order]]`
 *   for every edition × office × round with SIRUTA rows (a cell's rows are its
 *   distinct places: the (edition, office, round, SIRUTA) tuple is unique,
 *   checked here);
 * - `unlisted`: `[edition, office, round, rows]` for SIRUTA codes not in the list;
 * - `places`: per edition, the distinct SIRUTA codes it reports (`all`), how
 *   many the list names (`named`) and, per county, the distinct places.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { cache: { type: 'string' } } })
if (!values.cache) {
  console.error('usage: generate-elections-analize-counties.mjs --cache <dir of <electionKey>.json>')
  process.exit(2)
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'src/development/prototypes/elections/analize/counties.fixture.json')
const catalog = JSON.parse(readFileSync(resolve(root, 'src/development/prototypes/elections/shared/catalog.fixture.json'), 'utf8'))
const uat = JSON.parse(readFileSync(resolve(root, 'public/assets/geojson/uat.json'), 'utf8'))
const judete = JSON.parse(readFileSync(resolve(root, 'public/assets/geojson/judete.json'), 'utf8'))

const counties = judete.features
  .map((feature) => ({ code: String(feature.properties.mnemonic), name: String(feature.properties.name) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
const countyIndex = new Map(counties.map((county, index) => [county.code, index]))
const countyOfSiruta = new Map(uat.features.map((feature) => [String(feature.properties.natcode), String(feature.properties.countyMn)]))
for (const code of countyOfSiruta.values()) if (!countyIndex.has(code)) throw new Error(`county ${code} in the UAT list is not in the county file`)

const editions = catalog.editions.map((edition) => edition.key)
const offices = []
const rounds = []
const indexOf = (list, value) => {
  const found = list.indexOf(value)
  if (found >= 0) return found
  list.push(value)
  return list.length - 1
}

const cells = new Map()
const unlisted = new Map()
const places = {}
const dir = resolve(values.cache)
for (const [editionIndex, key] of editions.entries()) {
  const file = resolve(dir, `${key}.json`)
  const rows = JSON.parse(readFileSync(file, 'utf8'))
  const seen = new Set()
  const all = new Set()
  const named = new Set()
  const byCounty = new Map()
  for (const row of rows) {
    if (row.scopeType !== 'siruta') continue
    const tuple = `${row.reportedOffice}|${row.reportedRound}|${row.sourceScopeKey}`
    if (seen.has(tuple)) throw new Error(`${key}: ${tuple} twice — a cell's rows would not be its places`)
    seen.add(tuple)
    all.add(row.sourceScopeKey)
    const office = indexOf(offices, row.reportedOffice)
    const round = indexOf(rounds, row.reportedRound)
    const cellKey = `${editionIndex}|${office}|${round}`
    const county = countyOfSiruta.get(row.sourceScopeKey)
    if (county === undefined) {
      unlisted.set(cellKey, (unlisted.get(cellKey) ?? 0) + 1)
      continue
    }
    named.add(row.sourceScopeKey)
    if (!byCounty.has(county)) byCounty.set(county, new Set())
    byCounty.get(county).add(row.sourceScopeKey)
    if (!cells.has(cellKey)) cells.set(cellKey, new Array(counties.length).fill(0))
    cells.get(cellKey)[countyIndex.get(county)] += 1
  }
  if (all.size > 0) {
    places[key] = {
      all: all.size,
      named: named.size,
      byCounty: Object.fromEntries([...byCounty.entries()].map(([code, set]) => [code, set.size]).sort((a, b) => a[0].localeCompare(b[0]))),
    }
  }
}
if (readdirSync(dir).filter((name) => name.endsWith('.json')).length !== editions.length) throw new Error('the cache does not hold exactly the catalog’s editions')

const split = (cellKey) => cellKey.split('|').map(Number)
const fixture = {
  generatedBy: 'scripts/generate-elections-analize-counties.mjs',
  readAt: catalog.readAt,
  counties,
  editions,
  offices,
  rounds,
  cells: [...cells.entries()].map(([cellKey, perCounty]) => [...split(cellKey), perCounty]),
  unlisted: [...unlisted.entries()].map(([cellKey, rows]) => [...split(cellKey), rows]),
  places,
}
writeFileSync(out, `${JSON.stringify(fixture)}\n`)
const sirutaRows = fixture.cells.reduce((sum, [, , , perCounty]) => sum + perCounty.reduce((a, b) => a + b, 0), 0) + fixture.unlisted.reduce((sum, [, , , rows]) => sum + rows, 0)
console.log(`${out}: ${fixture.cells.length} cells, ${fixture.unlisted.length} unlisted cells, ${sirutaRows} SIRUTA rows, ${Object.keys(places).length} editions with places`)
