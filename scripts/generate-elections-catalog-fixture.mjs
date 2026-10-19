#!/usr/bin/env node
/**
 * Regenerates the elections prototypes' shared fixtures from the deployed
 * dev API (design note §12, Guidelines G11): every source edition and every
 * contest row, counted the way the page needs them. The elections module
 * serves no aggregate and no search by place (asks 9 and 10), so this script
 * reads all 105k contest rows (about 1,060 pages) and counts on its own.
 *
 *   node scripts/generate-elections-catalog-fixture.mjs [--api <graphql url>] [--cache <dir>]
 *
 * Writes:
 * - `src/development/prototypes/elections/shared/catalog.fixture.json`: the editions as
 *   served, each with its rows counted by office × scope type × round, and the
 *   readiness the API reports (checked to be one constant per kind of row);
 * - `src/development/prototypes/elections/shared/places.fixture.json`: every SIRUTA
 *   scope with its rows (edition, office, round), the label the first source
 *   gave it (for a code the INS list lacks, the first that names no listed
 *   code) and, where the INS UAT list knows the code, its INS name, kind and
 *   county. Rows the sources key by their own numbering are never matched to a
 *   place: that would be a join on names.
 *
 * `--cache <dir>` keeps each edition's contests as `<electionKey>.json` and
 * reuses them on the next run; `readAt` is then the cache's oldest file date.
 * The script fails rather than write a fixture that would mislead: a readiness
 * that varies, a contest key that does not follow its pattern, a page count
 * that disagrees with `total`.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    api: { type: 'string', default: 'https://dev-chronos-api.transparenta.eu/api/v1/graphql' },
    cache: { type: 'string' },
  },
})
const API = values.api
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const hubOut = resolve(root, 'src/development/prototypes/elections/shared/catalog.fixture.json')
const placesOut = resolve(root, 'src/development/prototypes/elections/shared/places.fixture.json')
const uatFile = resolve(root, 'public/assets/geojson/uat.json')
const CONCURRENCY = 4
const PAGE_SIZE = 100

const READINESS = 'identity sourceSelection sourceOpening results mandates issues'
const EDITION = `electionKey eventKey reportedName reportedYear verifiedYear reportedFamily verifiedFamily reportedRound reportedDate reportedAuthority readiness { ${READINESS} }`
const CONTEST = `contestKey electionKey eventKey reportedOffice verifiedOffice chamber reportedRound scopeType sourceScopeKey scopeLabel constituencyCode constituencyName readiness { ${READINESS} }`

async function gql(query, variables) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(30_000),
      })
      const json = await response.json()
      if (json.errors?.length) throw new Error(JSON.stringify(json.errors))
      return json.data
    } catch (error) {
      if (attempt >= 4) throw error
      await new Promise((done) => setTimeout(done, 1_000 * attempt))
    }
  }
}

async function readEditions() {
  const items = []
  for (let page = 1; ; page++) {
    const data = await gql(`query($page:Int){ electionCatalog(page:$page, pageSize:${PAGE_SIZE}){ total hasMore items { ${EDITION} } } }`, { page })
    items.push(...data.electionCatalog.items)
    if (!data.electionCatalog.hasMore) {
      if (items.length !== data.electionCatalog.total) throw new Error(`catalog: read ${items.length}, total ${data.electionCatalog.total}`)
      return items
    }
  }
}

async function readContests(electionKey) {
  const cached = values.cache ? resolve(values.cache, `${electionKey}.json`) : null
  if (cached && existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8'))
  const items = []
  let total = 0
  for (let page = 1; ; page++) {
    const data = await gql(`query($k:ID!,$p:Int){ electionContests(electionKey:$k, page:$p, pageSize:${PAGE_SIZE}){ total hasMore items { ${CONTEST} } } }`, {
      k: electionKey,
      p: page,
    })
    items.push(...data.electionContests.items)
    total = data.electionContests.total
    if (!data.electionContests.hasMore) break
  }
  if (items.length !== total) throw new Error(`${electionKey}: read ${items.length} contests, total ${total}`)
  if (cached) {
    mkdirSync(dirname(cached), { recursive: true })
    writeFileSync(cached, JSON.stringify(items))
  }
  return items
}

/** The one readiness every row of a kind carries; the fixture stores it once, and refuses to if it varies. */
function constantReadiness(rows, kind) {
  const seen = new Map()
  for (const row of rows) seen.set(JSON.stringify(row.readiness), row.readiness)
  const distinct = [...seen.values()]
  // Edition issues differ only where a year or a date is missing; no edition lacks a year today.
  if (distinct.length !== 1) throw new Error(`${kind} readiness varies (${distinct.length} shapes): the page would have to show it per row`)
  return distinct[0]
}

/** `contest:<edition>:<office-slug>:<scopeType>:<scope key, ':' as '-'>` — checked for every row a page links. */
function expectedContestKey(contest) {
  const slug = contest.reportedOffice.replaceAll('_', '-')
  const scope = contest.sourceScopeKey.toLowerCase().replaceAll(':', '-')
  return `contest:${contest.electionKey}:${slug}:${contest.scopeType}:${scope}`
}

const started = new Date()
const editions = await readEditions()
console.log(`catalog: ${editions.length} editions`)

const queue = editions.map((edition) => edition.electionKey)
const contestsByEdition = new Map()
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const key = queue.shift()
      contestsByEdition.set(key, await readContests(key))
    }
  }),
)

const allContests = [...contestsByEdition.values()].flat()
console.log(`contests: ${allContests.length} rows`)
const editionReadiness = constantReadiness(editions, 'edition')
const contestReadiness = constantReadiness(allContests, 'contest')

// ── hub.fixture.json ──
const hubEditions = editions.map((edition) => {
  const counts = new Map()
  for (const contest of contestsByEdition.get(edition.electionKey)) {
    const key = JSON.stringify([contest.reportedOffice, contest.scopeType, contest.reportedRound])
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return {
    key: edition.electionKey,
    eventKey: edition.eventKey,
    name: edition.reportedName,
    year: edition.reportedYear,
    family: edition.reportedFamily,
    round: edition.reportedRound,
    date: edition.reportedDate,
    authority: edition.reportedAuthority,
    contests: contestsByEdition.get(edition.electionKey).length,
    /** [office, scopeType, round | null, rows], most rows first. */
    counts: [...counts.entries()].map(([key, n]) => [...JSON.parse(key), n]).sort((a, b) => b[3] - a[3] || String(a[0]).localeCompare(String(b[0]))),
  }
})

// ── places.fixture.json ──
const uat = new Map(
  JSON.parse(readFileSync(uatFile, 'utf8')).features.map(({ properties: p }) => [p.natcode, { name: p.name, kind: p.natLevName, county: p.county, countyCode: p.countyMn }]),
)
const editionIndex = new Map(editions.map((edition, index) => [edition.electionKey, index]))
const offices = [...new Set(allContests.filter((c) => c.scopeType === 'siruta').map((c) => c.reportedOffice))].sort()
const officeIndex = new Map(offices.map((office, index) => [office, index]))
const rounds = [...new Set(allContests.filter((c) => c.scopeType === 'siruta').map((c) => c.reportedRound))].sort((a, b) => String(a).localeCompare(String(b)))
const roundIndex = new Map(rounds.map((round, index) => [round, index]))
const places = {}
/** Every label the sources give each code, in the catalog's edition order (not the order the reads finished in). */
const labelsOf = new Map()
let mismatched = 0
for (const contest of editions.flatMap((edition) => contestsByEdition.get(edition.electionKey))) {
  if (contest.scopeType !== 'siruta') continue
  if (contest.contestKey !== expectedContestKey(contest)) mismatched++
  const place = (places[contest.sourceScopeKey] ??= { label: null, ins: uat.get(contest.sourceScopeKey) ?? null, rows: [] })
  if (contest.scopeLabel !== null) labelsOf.set(contest.sourceScopeKey, [...(labelsOf.get(contest.sourceScopeKey) ?? []), contest.scopeLabel])
  place.rows.push([editionIndex.get(contest.electionKey), officeIndex.get(contest.reportedOffice), roundIndex.get(contest.reportedRound)])
}
if (mismatched > 0) throw new Error(`${mismatched} SIRUTA contest keys do not follow the expected pattern: store them instead of deriving them`)
for (const place of Object.values(places)) place.rows.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])

/**
 * The label a page shows for a code is the first one a source gave it — except
 * for a code today's INS list lacks, which passes over a label that a listed
 * code also carries: that label names the other place. Without the rule,
 * 179132 (all of București, reported so by both 2020 parliamentary editions)
 * would be „BUCUREŞTI SECTORUL 6", the label those editions give it and the
 * name of 179196; `bec-local-1996` labels 179132 „Municipiul BUCURESTI".
 */
const listedCarriers = new Map()
for (const [code, labels] of labelsOf) if (uat.has(code)) for (const label of labels) listedCarriers.set(label, (listedCarriers.get(label) ?? new Set()).add(code))
for (const [code, place] of Object.entries(places)) {
  const labels = labelsOf.get(code) ?? []
  const own = place.ins ? undefined : labels.find((label) => ![...(listedCarriers.get(label) ?? [])].some((other) => other !== code))
  place.label = own ?? labels[0] ?? null
}

const readAt = values.cache
  ? new Date(
      Math.min(
        ...editions.map((e) => (existsSync(resolve(values.cache, `${e.electionKey}.json`)) ? statSync(resolve(values.cache, `${e.electionKey}.json`)).mtimeMs : started.getTime())),
      ),
    ).toISOString()
  : started.toISOString()

mkdirSync(dirname(hubOut), { recursive: true })
writeFileSync(
  hubOut,
  `${JSON.stringify(
    {
      generatedBy: 'scripts/generate-elections-catalog-fixture.mjs',
      api: API,
      readAt,
      readiness: { edition: editionReadiness, contest: contestReadiness },
      /** Distinct SIRUTA scopes, and how many of them today's INS UAT list names. */
      places: {
        siruta: Object.keys(places).length,
        named: Object.values(places).filter((place) => place.ins).length,
        insUats: uat.size,
      },
      editions: hubEditions,
    },
    null,
    1,
  )}\n`,
)
writeFileSync(
  placesOut,
  `${JSON.stringify({
    generatedBy: 'scripts/generate-elections-catalog-fixture.mjs',
    readAt,
    editions: editions.map((edition) => edition.electionKey),
    offices,
    rounds,
    places,
  })}\n`,
)
const placeCount = Object.keys(places).length
const named = Object.values(places).filter((place) => place.ins).length
console.log(`wrote ${hubOut}`)
console.log(`wrote ${placesOut}: ${placeCount} SIRUTA places (${named} with an INS name), ${offices.length} offices, ${rounds.length} rounds`)
