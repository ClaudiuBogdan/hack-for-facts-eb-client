#!/usr/bin/env node
/**
 * Builds `src/features/ngos/hub/finance-summary.ts` — the money behind
 * `/ngos` — from the Ministry of Finance's non-profit financial statements
 * on data.gov.ro (one `web_ong_an<YEAR>.txt` per year, 46 indicators by CUI)
 * and the platform's NGO profiles for the largest.
 *
 *   node scripts/summarize-ngo-finances.mjs /tmp/mfp-ong
 *
 * The directory caches the yearly files; a file already there is not fetched
 * again.
 *
 * The indicators read keep their meaning in every dictionary from 2016 on
 * (checked against each year's `.csv`): I14, I22, I30 revenue from non-profit,
 * special-purpose and economic activities, and I38 their total. The staff
 * counts (I45, I46) are not read: filers type activity codes into them (9499
 * „employees").
 *
 * A blank cell is unknown, not zero: a statement whose total revenue (I38)
 * is blank is counted in the `unknown` class, never in `none` (seven in
 * 2025); in the sums it adds nothing.
 *
 * A statement with a revenue above 1 bn lei is a value to verify — no
 * non-profit comes near (the largest, 450 mil. lei in 2025) — and is left out
 * of every sum and named in `excluded`, with whether its revenue repeats its
 * fixed assets (I1, „Active imobilizate – total", read unvalidated, for this) and
 * whether the organisation has a profile to show the statement on: one, in
 * 2019, whose 6,2 bn lei are exactly its fixed assets.
 *
 * The leaders are the largest by revenue among the organisations the NGO
 * profile resolves: a registry entry whose CUI the platform admitted, by the
 * registry's own declaration or by an exact name and county match at ANAF —
 * each one the profile page (`/ngos/$cui`) opens. Most
 * filers are not in that set — unions, religious bodies and parties are not
 * in the NGO registry, and most registry entries declare no CUI — so the
 * ranking is of the registry's NGOs, not of every non-profit.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseStatements } from './lib/ngo-statements.mjs'

const API_URL = process.env.NGO_API_URL ?? 'https://dev-chronos-api.transparenta.eu/api/v1/graphql'
const CKAN = 'https://data.gov.ro/api/3/action/package_search'
const OUTPUT = fileURLToPath(new URL('../src/features/ngos/hub/finance-summary.ts', import.meta.url))
/** From 2016 the dictionaries agree on every indicator read. */
const FIRST_YEAR = 2016
const ERROR_REVENUE = 1_000_000_000
/** How far down the revenue ranking to look for profiles, and how many leaders to keep. */
const PROFILE_DEPTH = 400
const LEADERS = 10

const cache = process.argv[2]
if (!cache) {
  console.error('usage: node scripts/summarize-ngo-finances.mjs <cache-dir>')
  process.exit(1)
}
mkdirSync(cache, { recursive: true })

async function graphql(query, variables) {
  const response = await fetch(API_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  if (!response.ok) throw new Error(`${API_URL}: HTTP ${response.status}`)
  const body = await response.json()
  if (body.errors?.length) throw new Error(JSON.stringify(body.errors))
  return body.data
}

/** A statements file's year, from its own name (`web_ong_an2024.txt`, `webongan2016.txt`, `web_ong_2013.txt`). */
const FILE_YEAR = /ong_?(?:an)?_?(\d{4})\.txt$/i

/**
 * Each year's statements file: the newest `.txt` whose name says ONG and the
 * year, from any „Situații financiare" package. MFP republishes a year about a
 * year later with the late filers added, often inside a later year's package
 * (the 2021 package holds the revised 2016–2020 files), so a year is keyed by
 * the file's name, never the package's.
 */
async function yearlyFiles() {
  const response = await fetch(`${CKAN}?q=${encodeURIComponent('title:"Situatii financiare"')}&rows=1000`)
  if (!response.ok) throw new Error(`data.gov.ro: HTTP ${response.status}`)
  const { success, result } = await response.json()
  if (!success || !Array.isArray(result?.results)) throw new Error('data.gov.ro: unexpected package_search response')
  if (result.results.length < result.count) throw new Error(`data.gov.ro: ${result.count} packages, ${result.results.length} read`)
  const files = new Map()
  for (const pkg of result.results) {
    for (const resource of pkg.resources ?? []) {
      const year = Number(FILE_YEAR.exec(resource.url.split('/').pop() ?? '')?.[1])
      if (!year || year < FIRST_YEAR) continue
      const modified = String(resource.last_modified ?? resource.created)
      const previous = files.get(year)
      if (!previous || modified > previous.modified) {
        files.set(year, { url: resource.url, id: resource.id, modified, dataset: `https://data.gov.ro/dataset/${pkg.name}` })
      }
    }
  }
  return files
}

/** The non-profit activity's domain; codes lose their leading zero in the files (`162` is 0162). */
function domainOf(code) {
  const activity = code.padStart(4, '0')
  const division = activity.slice(0, 2)
  if (activity === '9499') return 'general'
  if (activity.startsWith('931')) return 'sport'
  if (division === '87' || division === '88') return 'social'
  if (division === '85') return 'education'
  if (division === '86') return 'health'
  if (division === '90' || division === '91' || activity.startsWith('932')) return 'culture'
  if (activity === '9491') return 'religion'
  if (activity === '9411' || activity === '9412') return 'professional'
  if (activity === '9420') return 'unions'
  if (division === '64') return 'finance'
  if (division === '01' || division === '02') return 'agriculture'
  if (activity === '9492') return 'political'
  return 'other'
}

function sizeOf(revenue) {
  if (revenue === null) return 'unknown'
  if (revenue < 0) return 'negative'
  if (revenue === 0) return 'none'
  if (revenue <= 10_000) return 'under10k'
  if (revenue <= 100_000) return 'under100k'
  if (revenue <= 1_000_000) return 'under1m'
  return 'over1m'
}

const files = await yearlyFiles()
const years = [...files.keys()].sort((a, b) => a - b)
for (let year = FIRST_YEAR; year <= years[years.length - 1]; year += 1) if (!files.has(year)) throw new Error(`no statements file for ${year}`)

const read = new Map()
for (const year of years) {
  // Keyed by the resource and its modification, so a republished year is read again, never its old figures under the new date.
  const file = files.get(year)
  const path = join(cache, `ong-${year}-${file.id}-${file.modified.replace(/[^0-9]/g, '')}.txt`)
  if (!existsSync(path)) {
    const response = await fetch(file.url)
    if (!response.ok) throw new Error(`${year}: ${response.status}`)
    writeFileSync(path, Buffer.from(await response.arrayBuffer()))
  }
  const parsed = parseStatements(readFileSync(path, 'latin1'))
  // A few bad rows are the source's; more is a changed layout or a cut file, and no summary.
  if (parsed.malformed > parsed.statements.size / 1000) throw new Error(`${year}: ${parsed.malformed} malformed rows`)
  read.set(year, parsed)
  console.error(`${year}: ${parsed.statements.size} statements, ${parsed.malformed} malformed rows dropped`)
}

const excluded = []
const kept = new Map(
  years.map((year) => [
    year,
    [...read.get(year).statements].filter(([cui, statement]) => {
      if ((statement.I38 ?? 0) <= ERROR_REVENUE) return true
      excluded.push({ year, cui, revenue: statement.I38, equalsFixedAssets: statement.I38 === statement.fixedAssets, profile: false })
      return false
    }),
  ]),
)
const counted = (year) => kept.get(year)

/**
 * A first release is published within the year after the one it covers; the
 * revision, with the late filers, comes about a year later. Years of either
 * kind sit side by side in the series, so each says which it is.
 */
const firstRelease = (year) => files.get(year).modified.slice(0, 10) < `${year + 2}-01-01`
const series = years.map((year) => {
  const rows = counted(year)
  return {
    year,
    statements: rows.length,
    revenue: rows.reduce((sum, [, statement]) => sum + (statement.I38 ?? 0), 0),
    published: files.get(year).modified.slice(0, 10),
    firstRelease: firstRelease(year),
  }
})

const year = years[years.length - 1]
const latest = counted(year)
// The year before as it is summed: an excluded statement is no base for a change either.
const previous = new Map(counted(year - 1))
const sum = (pick) => latest.reduce((total, [, statement]) => total + (pick(statement) ?? 0), 0)

const sources = { nonProfit: sum((s) => s.I14), economic: sum((s) => s.I30), special: sum((s) => s.I22) }
const revenue = sum((s) => s.I38)
if (sources.nonProfit + sources.economic + sources.special !== revenue) throw new Error('the revenue sources do not add up to the total')

const SIZES = ['negative', 'none', 'under10k', 'under100k', 'under1m', 'over1m', 'unknown']
const sizes = SIZES.map((key) => ({ key, statements: 0, revenue: 0 }))
const domains = new Map()
for (const [, statement] of latest) {
  const size = sizes[SIZES.indexOf(sizeOf(statement.I38))]
  size.statements += 1
  size.revenue += statement.I38 ?? 0
  const key = domainOf(statement.activity)
  const domain = domains.get(key) ?? { key, statements: 0, revenue: 0 }
  domain.statements += 1
  domain.revenue += statement.I38 ?? 0
  domains.set(key, domain)
}

// The leaders: the ranking walked down until enough profiles resolve.
const COUNTY_CODES = {
  ALBA: 'AB', ARAD: 'AR', ARGES: 'AG', BACAU: 'BC', BIHOR: 'BH', 'BISTRITA NASAUD': 'BN', BOTOSANI: 'BT',
  BRASOV: 'BV', BRAILA: 'BR', BUCURESTI: 'B', BUZAU: 'BZ', 'CARAS SEVERIN': 'CS', CALARASI: 'CL', CLUJ: 'CJ',
  CONSTANTA: 'CT', COVASNA: 'CV', DAMBOVITA: 'DB', DOLJ: 'DJ', GALATI: 'GL', GIURGIU: 'GR', GORJ: 'GJ',
  HARGHITA: 'HR', HUNEDOARA: 'HD', IALOMITA: 'IL', IASI: 'IS', ILFOV: 'IF', MARAMURES: 'MM', MEHEDINTI: 'MH',
  MURES: 'MS', NEAMT: 'NT', OLT: 'OT', PRAHOVA: 'PH', 'SATU MARE': 'SM', SALAJ: 'SJ', SIBIU: 'SB', SUCEAVA: 'SV',
  TELEORMAN: 'TR', TIMIS: 'TM', TULCEA: 'TL', VASLUI: 'VS', VALCEA: 'VL', VRANCEA: 'VN',
}
const fold = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/-/g, ' ').toUpperCase().trim()
const STATUS = { Inregistrat: null, Dizolvata: 'dissolved', 'In Lichidare': 'inLiquidation', Radiat: 'deregistered' }
// The organisation profile admits a CUI, and is what `/ngos/$cui` opens.
const PROFILE = `query($cui: CUI!) {
  ngoOrganizationProfile(cui: $cui) { cui name county sourceRegistryStatus registryRecords { nameWithheld } }
}`

const ranked = [...latest].sort(([, a], [, b]) => (b.I38 ?? 0) - (a.I38 ?? 0)).slice(0, PROFILE_DEPTH)
const leaders = []
for (let start = 0; start < ranked.length && leaders.length < LEADERS; start += 4) {
  const batch = ranked.slice(start, start + 4)
  const reads = await Promise.all(batch.map(([cui]) => graphql(PROFILE, { cui })))
  batch.forEach(([cui, statement], index) => {
    const profile = reads[index].ngoOrganizationProfile
    // A withheld name is withheld here too: the organisation is left out rather than shown unnamed.
    if (!profile || !profile.name || profile.registryRecords.some((record) => record.nameWithheld) || leaders.length >= LEADERS) return
    if (!(profile.sourceRegistryStatus in STATUS)) throw new Error(`unknown registry status ${profile.sourceRegistryStatus}`)
    const before = previous.get(cui)
    leaders.push({
      cui,
      name: profile.name.replace(/\s+/g, ' ').trim(),
      county: profile.county ? (COUNTY_CODES[fold(profile.county)] ?? null) : null,
      domain: domainOf(statement.activity),
      revenue: statement.I38,
      previous: before && before.I38 > 0 ? before.I38 : null,
      status: STATUS[profile.sourceRegistryStatus],
    })
  })
}
if (leaders.length < LEADERS) throw new Error(`only ${leaders.length} profiles in the top ${PROFILE_DEPTH}`)

// An excluded statement's organisation, where the profile admits it: the page links the statement there.
for (const entry of excluded) entry.profile = (await graphql(PROFILE, { cui: entry.cui })).ngoOrganizationProfile !== null

const summary = {
  year,
  source: { dataset: files.get(year).dataset, file: files.get(year).url, published: files.get(year).modified.slice(0, 10) },
  statements: latest.length,
  withRevenue: latest.filter(([, statement]) => (statement.I38 ?? 0) > 0).length,
  revenue,
  sources,
  sizes,
  domains: [...domains.values()].sort((a, b) => b.statements - a.statements),
  years: series,
  excluded,
  leaders,
}

/** One key per line; an array of records one record per line, so a refresh diffs by row. */
function literal(value, indent = '') {
  const inner = `${indent}  `
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const record = (item) => `{ ${Object.entries(item).map(([key, field]) => `${key}: ${literal(field)}`).join(', ')} }`
    return `[\n${value.map((item) => `${inner}${record(item)}`).join(',\n')},\n${indent}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => `${inner}${key}: ${literal(item, inner)}`)
    return `{\n${entries.join(',\n')},\n${indent}}`
  }
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  return JSON.stringify(value)
}

const module = `// Generated by scripts/summarize-ngo-finances.mjs — do not edit by hand.
// Statements: Ministerul Finanțelor, data.gov.ro, ${FIRST_YEAR}–${year}. Leaders: NGO profiles, ${API_URL}.
import type { NgoFinanceSummary } from './finance-summary-types'

export const NGO_FINANCE_SUMMARY: NgoFinanceSummary = ${literal(summary)}
`
writeFileSync(OUTPUT, module)
console.error(`wrote ${OUTPUT}: ${year}, ${latest.length} statements, ${leaders.length} leaders, ${excluded.length} excluded`)
