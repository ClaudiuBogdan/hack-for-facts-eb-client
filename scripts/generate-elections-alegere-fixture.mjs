#!/usr/bin/env node
/**
 * Regenerates the election page prototype's fixture (design note §12,
 * Guidelines G11): for every source edition, where its SIRUTA rows were
 * reported, counted by INS county — reporting places, never races — and how
 * many distinct scope keys each level holds. The API serves no aggregate
 * (ask 9), so the script reads every contest row, from the catalog
 * generator's cache when one is given.
 *
 *   node scripts/generate-elections-alegere-fixture.mjs [--api <graphql url>] [--cache <dir>]
 *
 * Writes `src/development/prototypes/elections/alegere/event.fixture.json`.
 * A SIRUTA code the INS UAT list does not know is counted under `null`; a
 * code is matched on the code alone, never on a name.
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
const out = resolve(root, 'src/development/prototypes/elections/alegere/event.fixture.json')
const uatFile = resolve(root, 'public/assets/geojson/uat.json')
const PAGE_SIZE = 100

const CONTEST = 'contestKey electionKey reportedOffice reportedRound scopeType sourceScopeKey scopeLabel'

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

async function readEditionKeys() {
  const keys = []
  for (let page = 1; ; page++) {
    const data = await gql(`query($page:Int){ electionCatalog(page:$page, pageSize:${PAGE_SIZE}){ total hasMore items { electionKey } } }`, { page })
    keys.push(...data.electionCatalog.items.map((item) => item.electionKey))
    if (!data.electionCatalog.hasMore) return keys
  }
}

async function readContests(electionKey) {
  const cached = values.cache ? resolve(values.cache, `${electionKey}.json`) : null
  if (cached && existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8'))
  const items = []
  for (let page = 1; ; page++) {
    const data = await gql(
      `query($key:ID!,$page:Int){ electionContests(electionKey:$key, page:$page, pageSize:${PAGE_SIZE}){ total hasMore items { ${CONTEST} } } }`,
      { key: electionKey, page },
    )
    items.push(...data.electionContests.items)
    if (!data.electionContests.hasMore) {
      if (items.length !== data.electionContests.total) throw new Error(`${electionKey}: read ${items.length}, total ${data.electionContests.total}`)
      break
    }
  }
  if (cached) {
    mkdirSync(dirname(cached), { recursive: true })
    writeFileSync(cached, JSON.stringify(items))
  }
  return items
}

const uat = new Map()
for (const feature of JSON.parse(readFileSync(uatFile, 'utf8')).features) {
  const p = feature.properties
  uat.set(String(p.natcode), { county: p.county, mn: p.countyMn })
}

const started = new Date()
const keys = await readEditionKeys()
const editions = {}
for (const key of keys) {
  const rows = await readContests(key)
  const siruta = new Map()
  const distinct = { source_constituency: new Set(), county: new Set(), diaspora: new Set(), national: new Set(), chamber: new Set() }
  let nullLabels = 0
  for (const row of rows) {
    if (row.scopeLabel === null) nullLabels++
    if (row.scopeType === 'siruta') {
      siruta.set(row.sourceScopeKey, (siruta.get(row.sourceScopeKey) ?? 0) + 1)
    } else {
      distinct[row.scopeType]?.add(row.sourceScopeKey)
    }
  }
  const counties = new Map()
  let named = 0
  for (const [code, count] of siruta) {
    const ins = uat.get(code) ?? null
    if (ins) named++
    const id = ins ? ins.mn : null
    const bucket = counties.get(id) ?? { mn: id, county: ins?.county ?? null, places: 0, rows: 0 }
    bucket.places++
    bucket.rows += count
    counties.set(id, bucket)
  }
  editions[key] = {
    rows: rows.length,
    nullLabels,
    siruta: {
      distinct: siruta.size,
      named,
      byCounty: [...counties.values()].sort((a, b) => b.places - a.places || String(a.mn).localeCompare(String(b.mn))).map((c) => [c.mn, c.county, c.places, c.rows]),
    },
    distinct: Object.fromEntries(Object.entries(distinct).map(([scope, set]) => [scope, set.size])),
  }
}

const readAt = values.cache
  ? new Date(
      Math.min(
        ...keys.map((key) => (existsSync(resolve(values.cache, `${key}.json`)) ? statSync(resolve(values.cache, `${key}.json`)).mtimeMs : started.getTime())),
      ),
    ).toISOString()
  : started.toISOString()

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify({ generatedBy: 'scripts/generate-elections-alegere-fixture.mjs', api: API, readAt, editions }, null, 1)}\n`)
console.log(`wrote ${out}: ${keys.length} editions`)
