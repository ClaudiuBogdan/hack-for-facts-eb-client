#!/usr/bin/env node
/**
 * Builds the NGO registry's counts — every registry entry counted by county,
 * locality, legal form, status, public utility, registry-number year and
 * whether it declares a CUI — from a full read of the registry, so the
 * registry page can count and break down any selection its filters make.
 *
 *   node scripts/capture-ngo-registry.mjs /tmp/rnong.jsonl
 *   node scripts/count-ngo-registry.mjs /tmp/rnong.jsonl
 *
 * It writes `src/features/ngos/registry/data/registry-counts.json`, or the
 * path given as a second argument. Refresh it with each new export, as the
 * hub's summary (`summarize-ngo-registry.mjs`): until then the page reads a
 * new export live and says so.
 *
 * The API serves the registry 100 records a page, with no count and no
 * group-by: until it has both, these counts stand in, and the page uses
 * them only while the API serves the export they were counted on.
 *
 * Only rows repeated field for field are dropped (as in
 * `summarize-ngo-registry.mjs`). The year is the one in the registry number
 * (`3446/A/2026`), never the registration date, which moves when an entry
 * changes; a number whose year is before 1990 or after the export (`1005`,
 * `3009`, typing slips) counts as one without a year. `NEDETERMINAT` is no
 * county.
 *
 * Output: dictionaries, then `cells` — one flat array, eight integers a
 * cell: county, locality, form, status (indexes into the dictionaries, -1
 * where the registry leaves it blank), public utility (0/1), year (-1 where
 * the number has none), CUI declared (0/1), entries.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const API_URL = process.env.NGO_API_URL ?? 'https://dev-chronos-api.transparenta.eu/api/v1/graphql'
const REGISTRY_NUMBER_YEAR = /\/(\d{4})$/
const CATEGORIES = ['association', 'foundation', 'federation', 'religious_association', 'foreign_legal_person']
const STATUSES = ['Inregistrat', 'Dizolvata', 'In Lichidare', 'Radiat']
/** The oldest registry numbers still in the registry are from 1990, before it was set up in 2000. */
const FIRST_YEAR = 1990
const NO_COUNTY = 'NEDETERMINAT'

const [input, output = fileURLToPath(new URL('../src/features/ngos/registry/data/registry-counts.json', import.meta.url))] = process.argv.slice(2)
if (!input) {
  console.error('usage: node scripts/count-ngo-registry.mjs <capture.jsonl> [output.json]')
  process.exit(1)
}

/**
 * The fields a repeat is judged by: every captured field but the row id
 * (as in `summarize-ngo-registry.mjs`). The registry page drops repeats of
 * a live read by the same list (`distinctRows` in its model), so the two
 * count alike.
 */
const REPEAT_FIELDS = [
  'registryNumber',
  'name',
  'nameWithheld',
  'category',
  'legalForm',
  'court',
  'sourceRegistryStatus',
  'sourceRegistrationDate',
  'county',
  'locality',
  'sourceCui',
  'linkedOrganizationCui',
  'isBranch',
  'sourceReportsPublicUtility',
]

const lines = readFileSync(input, 'utf8').split('\n').filter(Boolean)
const captured = lines.map((line) => JSON.parse(line))
const seen = new Set()
const rows = []
for (const row of captured) {
  const key = JSON.stringify(REPEAT_FIELDS.map((field) => row[field] ?? null))
  if (seen.has(key)) continue
  seen.add(key)
  rows.push(row)
}

const response = await fetch(API_URL, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: '{ ngoRegistryCoverage { id capturedAt recordCount } }' }),
})
const body = await response.json()
if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? response.status))
const snapshot = body.data.ngoRegistryCoverage
if (snapshot.recordCount !== lines.length) {
  throw new Error(`the capture holds ${lines.length} rows; the current snapshot declares ${snapshot.recordCount}`)
}
// A row's id names its export: a capture of an older export with as many rows must not take the current export's id.
const stray = captured.find((row) => !String(row.id).includes(`${snapshot.id}:row:`))
if (stray) throw new Error(`row ${stray.id} is not of the current export ${snapshot.id}: capture again`)

/** A dictionary sorted, so a refresh diffs quietly. */
const dictionary = (values) => [...new Set(values.filter((value) => value !== null && value !== ''))].sort((a, b) => a.localeCompare(b, 'ro'))
const lastYear = Number(snapshot.capturedAt.slice(0, 4))
const counties = dictionary(rows.map((row) => (row.county === NO_COUNTY ? null : row.county)))
const localities = dictionary(rows.map((row) => row.locality))
const countyIndex = new Map(counties.map((value, index) => [value, index]))
const localityIndex = new Map(localities.map((value, index) => [value, index]))

const cells = new Map()
for (const row of rows) {
  const category = CATEGORIES.indexOf(row.category)
  const status = STATUSES.indexOf(row.sourceRegistryStatus)
  if (category < 0) throw new Error(`unknown category ${row.category}`)
  if (status < 0) throw new Error(`unknown registry status ${row.sourceRegistryStatus}`)
  const numbered = REGISTRY_NUMBER_YEAR.exec(row.registryNumber?.trim() ?? '')
  const year = numbered && Number(numbered[1]) >= FIRST_YEAR && Number(numbered[1]) <= lastYear ? Number(numbered[1]) : -1
  const cell = [
    countyIndex.get(row.county) ?? -1,
    localityIndex.get(row.locality) ?? -1,
    category,
    status,
    row.sourceReportsPublicUtility ? 1 : 0,
    year,
    row.sourceCui ? 1 : 0,
  ]
  const key = cell.join(',')
  const found = cells.get(key)
  if (found) found[7] += 1
  else cells.set(key, [...cell, 1])
}

const flat = [...cells.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3] || a[4] - b[4] || a[5] - b[5] || a[6] - b[6]).flat()
const counts = {
  snapshotId: snapshot.id,
  capturedAt: snapshot.capturedAt.slice(0, 10),
  entries: lines.length,
  repeated: lines.length - rows.length,
  counties,
  localities,
  categories: CATEGORIES,
  statuses: STATUSES,
  cells: flat,
}
writeFileSync(output, `${JSON.stringify(counts)}\n`)
console.error(`wrote ${output}: ${rows.length} entries in ${cells.size} cells, ${localities.length} localities`)
