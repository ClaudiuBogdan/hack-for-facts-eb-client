#!/usr/bin/env node
/**
 * The elections front door's own small fixture, derived from the shared
 * places fixture (`shared/places.fixture.json`, written by
 * `generate-elections-catalog-fixture.mjs`) and the INS UAT list
 * (`public/assets/geojson/uat.json`). The shared index is 1.2 MB and loads
 * only in the browser; the front door needs two things it can server-render:
 *
 * - per edition, how many distinct SIRUTA codes it reports and how many of
 *   them today's INS UAT list names (the denominator is today's list, not the
 *   year's);
 * - the largest places the sources report, by the INS 2021 population the UAT
 *   list carries, so the „your locality" door has somewhere to start, each
 *   with the number of editions that report there (never a sum of their rows).
 *
 *   node scripts/generate-elections-hub-places.mjs
 *
 * Writes `src/development/prototypes/elections/hub/places.coverage.json`. Never edit it by hand.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const placesFile = resolve(root, 'src/development/prototypes/elections/shared/places.fixture.json')
const uatFile = resolve(root, 'public/assets/geojson/uat.json')
const out = resolve(root, 'src/development/prototypes/elections/hub/places.coverage.json')
const LARGEST = 12

const places = JSON.parse(readFileSync(placesFile, 'utf8'))
const uat = JSON.parse(readFileSync(uatFile, 'utf8'))
const population = new Map()
for (const feature of uat.features) {
  const { natcode, insPop2021 } = feature.properties
  if (typeof natcode === 'string' && typeof insPop2021 === 'number') population.set(natcode, insPop2021)
}

const perEdition = places.editions.map(() => ({ siruta: new Set(), named: new Set() }))
const large = []
for (const [siruta, place] of Object.entries(places.places)) {
  for (const edition of new Set(place.rows.map((row) => row[0]))) {
    perEdition[edition].siruta.add(siruta)
    if (place.ins) perEdition[edition].named.add(siruta)
  }
  const pop = population.get(siruta)
  // The editions that report here, counted as editions: a place's rows across editions are the same races told several times, never a total.
  const editions = new Set(place.rows.map((row) => row[0])).size
  if (place.ins && pop !== undefined) large.push({ siruta, name: place.ins.name, kind: place.ins.kind, county: place.ins.county, population: pop, editions })
}
large.sort((a, b) => b.population - a.population || a.name.localeCompare(b.name, 'ro'))

const fixture = {
  generatedBy: 'scripts/generate-elections-hub-places.mjs',
  readAt: places.readAt,
  insUats: uat.features.length,
  populationYear: 2021,
  editions: places.editions.map((key, index) => ({ key, siruta: perEdition[index].siruta.size, named: perEdition[index].named.size })).filter((edition) => edition.siruta > 0),
  largest: large.slice(0, LARGEST),
}
writeFileSync(out, `${JSON.stringify(fixture, null, 1)}\n`)
console.log(`wrote ${out}: ${fixture.editions.length} editions with locality rows, ${fixture.largest.length} largest places`)
