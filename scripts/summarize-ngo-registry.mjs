#!/usr/bin/env node
/**
 * Builds `src/features/ngos/hub/registry-summary.ts` — the figures behind
 * `/ong-uri` — from a full read of the NGO registry and INS's resident
 * population by county.
 *
 *   node scripts/capture-ngo-registry.mjs /tmp/rnong.jsonl
 *   node scripts/summarize-ngo-registry.mjs /tmp/rnong.jsonl
 *
 * Counts are of registry entries, not of distinct organisations the registry
 * cannot prove: only rows repeated field for field are dropped. A county's
 * `source` is the registry's own spelling, which the registry filter matches
 * exactly (`DÂMBOVITA`, `VÂLCEA`).
 *
 * A year's new entries are the ones whose registry number carries that year
 * (`3446/A/2026`), not the ones whose registration date falls in it: the date
 * moves when an entry changes (957 entries dated 2025 carry numbers from
 * 1994 to 2024), while the number is kept — the 1990s organisations taken
 * into the registry in 2000 kept their 1990s numbers.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const API_URL = process.env.NGO_API_URL ?? 'https://dev-chronos-api.transparenta.eu/api/v1/graphql'
const OUTPUT = fileURLToPath(new URL('../src/features/ngos/hub/registry-summary.ts', import.meta.url))
/** The last full year of registrations, and the year of the population the densities divide by. */
const YEAR = 2025
/** The registry was established in 2000: from 2001 a year's numbers are that year's new entries. */
const FIRST_YEAR = 2001
/** `3446/A/2026`: order number, the registry's part (A–E, by legal form), the year the number was given. */
const REGISTRY_NUMBER = /^\d+\/[A-E]\/(\d{4})$/

const input = process.argv[2]
if (!input) {
  console.error('usage: node scripts/summarize-ngo-registry.mjs <capture.jsonl>')
  process.exit(1)
}

async function graphql(query, variables) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const body = await response.json()
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? response.status))
  return body.data
}

/** County codes by the registry's county names, folded to ASCII capitals. */
const COUNTY_CODES = {
  ALBA: 'AB', ARAD: 'AR', ARGES: 'AG', BACAU: 'BC', BIHOR: 'BH', 'BISTRITA NASAUD': 'BN', BOTOSANI: 'BT',
  BRASOV: 'BV', BRAILA: 'BR', BUCURESTI: 'B', BUZAU: 'BZ', 'CARAS SEVERIN': 'CS', CALARASI: 'CL', CLUJ: 'CJ',
  CONSTANTA: 'CT', COVASNA: 'CV', DAMBOVITA: 'DB', DOLJ: 'DJ', GALATI: 'GL', GIURGIU: 'GR', GORJ: 'GJ',
  HARGHITA: 'HR', HUNEDOARA: 'HD', IALOMITA: 'IL', IASI: 'IS', ILFOV: 'IF', MARAMURES: 'MM', MEHEDINTI: 'MH',
  MURES: 'MS', NEAMT: 'NT', OLT: 'OT', PRAHOVA: 'PH', 'SATU MARE': 'SM', SALAJ: 'SJ', SIBIU: 'SB', SUCEAVA: 'SV',
  TELEORMAN: 'TR', TIMIS: 'TM', TULCEA: 'TL', VASLUI: 'VS', VALCEA: 'VL', VRANCEA: 'VN',
}
const fold = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/-/g, ' ').toUpperCase().trim()

const STATUS_KEYS = { Inregistrat: 'registered', Radiat: 'deregistered', 'In Lichidare': 'inLiquidation', Dizolvata: 'dissolved' }
const CATEGORY_KEYS = ['association', 'foundation', 'federation', 'religious_association', 'foreign_legal_person']

const lines = readFileSync(input, 'utf8').split('\n').filter(Boolean)
const seen = new Set()
const rows = []
for (const line of lines) {
  const row = JSON.parse(line)
  const { id, ...fields } = row
  const key = JSON.stringify(fields)
  if (seen.has(key)) continue
  seen.add(key)
  rows.push(row)
}

const coverage = await graphql('{ ngoRegistryCoverage { id capturedAt recordCount sourceUrl } }')
const snapshot = coverage.ngoRegistryCoverage
if (snapshot.recordCount !== lines.length) {
  throw new Error(`the capture holds ${lines.length} rows; the current snapshot declares ${snapshot.recordCount}`)
}

const status = { registered: 0, deregistered: 0, inLiquidation: 0, dissolved: 0 }
const categories = Object.fromEntries(CATEGORY_KEYS.map((key) => [key, 0]))
const years = new Map()
const counties = new Map()
let publicUtility = 0
let noCounty = 0
let lastRegistration = ''

for (const row of rows) {
  const statusKey = STATUS_KEYS[row.sourceRegistryStatus]
  if (!statusKey) throw new Error(`unknown registry status ${row.sourceRegistryStatus}`)
  if (!CATEGORY_KEYS.includes(row.category)) throw new Error(`unknown category ${row.category}`)
  status[statusKey] += 1
  const date = row.sourceRegistrationDate
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`entry ${row.id} has no registration date`)
  if (date > lastRegistration) lastRegistration = date
  // An irregular number (21 in the September 2026 export, e.g. `17121/A/20`) is counted nowhere by year.
  const numbered = REGISTRY_NUMBER.exec(row.registryNumber)
  const year = numbered ? Number(numbered[1]) : null
  if (year !== null && year >= FIRST_YEAR && year <= YEAR) years.set(year, (years.get(year) ?? 0) + 1)

  const code = row.county ? COUNTY_CODES[fold(row.county)] : undefined
  if (code) {
    const county = counties.get(code) ?? { code, source: row.county, registered: 0, added: 0 }
    if (county.source !== row.county) throw new Error(`county ${code} is spelled ${county.source} and ${row.county}`)
    if (statusKey === 'registered') county.registered += 1
    if (year === YEAR) county.added += 1
    counties.set(code, county)
  } else if (row.county && fold(row.county) !== 'NEDETERMINAT') {
    throw new Error(`unknown county ${row.county}`)
  }

  if (statusKey !== 'registered') continue
  categories[row.category] += 1
  if (row.sourceReportsPublicUtility) publicUtility += 1
  if (!code) noCounty += 1
}

// Resident population on 1 January of YEAR, the total cell of each county.
const population = await graphql(
  `query($f: InsObservationFilterInput) { insObservations(datasetCode: "POP105A", filter: $f, limit: 1000, offset: 0) {
    nodes { value value_status territory { code level } classifications { type_code code } } } }`,
  { f: { territoryLevels: ['NUTS3'], period: { type: 'YEAR', selection: { dates: [String(YEAR)] } } } },
)
const residents = new Map()
for (const node of population.insObservations.nodes) {
  const members = Object.fromEntries(node.classifications.map((entry) => [entry.type_code, entry.code]))
  if (node.territory?.level !== 'NUTS3' || members.D0 !== '1' || members.D1 !== '105' || members.D2 !== '108') continue
  if (node.value_status) throw new Error(`POP105A ${node.territory.code} is flagged ${node.value_status}`)
  residents.set(node.territory.code, Number(node.value))
}
for (const code of Object.values(COUNTY_CODES)) {
  if (!counties.has(code)) throw new Error(`no registry entries for ${code}`)
  if (!residents.has(code)) throw new Error(`no ${YEAR} population for ${code}`)
}

const firstYear = Math.min(...years.keys())
if (firstYear !== FIRST_YEAR || years.size !== YEAR - FIRST_YEAR + 1) throw new Error('a year without registrations')
const summary = {
  snapshotId: snapshot.id,
  sourceUrl: snapshot.sourceUrl,
  capturedAt: snapshot.capturedAt.slice(0, 10),
  lastRegistration,
  entries: lines.length,
  repeated: lines.length - rows.length,
  status,
  categories,
  publicUtility,
  noCounty,
  year: YEAR,
  registrations: [...years].sort(([a], [b]) => a - b).map(([year, count]) => ({ year, count })),
  counties: [...counties.values()]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((county) => ({ ...county, residents: residents.get(county.code) })),
}

/** One key per line; an array of records one record per line, so a refresh diffs by county and by year. */
function literal(value, indent = '') {
  const inner = `${indent}  `
  if (Array.isArray(value)) {
    const record = (item) => `{ ${Object.entries(item).map(([key, field]) => `${key}: ${literal(field)}`).join(', ')} }`
    return `[\n${value.map((item) => `${inner}${record(item)}`).join(',\n')},\n${indent}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => `${inner}${key}: ${literal(item, inner)}`)
    return `{\n${entries.join(',\n')},\n${indent}}`
  }
  return JSON.stringify(value).replace(/"/g, "'")
}

const module = `// Generated by scripts/summarize-ngo-registry.mjs — do not edit by hand.
// Registry: ${snapshot.id}, captured ${summary.capturedAt}.
// Population: INS POP105A, resident population on 1 January ${YEAR}, by county.
import type { NgoRegistrySummary } from './registry-summary-types'

export const NGO_REGISTRY_SUMMARY: NgoRegistrySummary = ${literal(summary)}
`
writeFileSync(OUTPUT, module)
console.error(`wrote ${OUTPUT}: ${rows.length} entries, ${summary.repeated} repeated rows dropped`)
