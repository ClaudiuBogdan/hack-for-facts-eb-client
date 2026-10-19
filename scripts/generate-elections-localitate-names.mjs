#!/usr/bin/env node
/**
 * The locality prototype's small name map, derived from the shared places
 * fixture (never from the API directly, so the two can never disagree): for
 * every SIRUTA code the sources report, its INS name, kind and county where
 * today's INS UAT list has the code — otherwise the source's own label — and
 * how many elections report there (platform events, the „2014" local event
 * counted with 2016). About 90 KB, so the page's head and
 * its county neighbours render on the server, while the 1.2 MB row index
 * loads in the browser only.
 *
 *   node scripts/generate-elections-localitate-names.mjs
 *
 * Writes `src/development/prototypes/elections/localitate/names.fixture.json`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const placesFile = resolve(root, 'src/development/prototypes/elections/shared/places.fixture.json')
const catalogFile = resolve(root, 'src/development/prototypes/elections/shared/catalog.fixture.json')
const out = resolve(root, 'src/development/prototypes/elections/localitate/names.fixture.json')

const places = JSON.parse(readFileSync(placesFile, 'utf8'))
const catalog = JSON.parse(readFileSync(catalogFile, 'utf8'))
/**
 * An event whose editions hold another election's data counts as that
 * election (E1: the „2014" local editions are the 2016 local elections, after
 * the data audit) — the same rule as `SAME_ELECTION_AS` in shared/model.ts.
 */
const SAME_ELECTION_AS = new Map([['ro:local:2014', 'ro:local:2016']])
const electionOf = (eventKey) => SAME_ELECTION_AS.get(eventKey) ?? eventKey
const eventOfEdition = new Map(catalog.editions.map((edition) => [edition.key, electionOf(edition.eventKey ?? `edition:${edition.key}`)]))

/** One letter per INS kind; `?` for a code today's INS list does not have. */
const KIND = {
  'Municipiu resedinta de judet': 'R',
  'Municipiu, altul decat resedinta de judet': 'M',
  Oras: 'O',
  Comuna: 'C',
  'Sectoarele municipiului Bucuresti': 'S',
}

const counties = {}
const entries = {}
for (const [siruta, place] of Object.entries(places.places)) {
  const events = new Set(place.rows.map(([edition]) => eventOfEdition.get(places.editions[edition])))
  if (place.ins) {
    const kind = KIND[place.ins.kind]
    if (!kind) throw new Error(`${siruta}: unknown INS kind ${place.ins.kind}`)
    counties[place.ins.countyCode] = place.ins.county
    entries[siruta] = [place.ins.name, kind, place.ins.countyCode, events.size]
  } else {
    entries[siruta] = [place.label ?? siruta, '?', '', events.size]
  }
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(
  out,
  `${JSON.stringify({
    generatedBy: 'scripts/generate-elections-localitate-names.mjs',
    readAt: places.readAt,
    /** County code → county name, from the INS UAT list. */
    counties,
    /** SIRUTA → [name, kind letter, county code, elections with a row there (E1 folded into 2016)]. */
    places: entries,
  })}\n`,
)
console.log(`wrote ${out}: ${Object.keys(entries).length} places, ${Object.keys(counties).length} counties`)
