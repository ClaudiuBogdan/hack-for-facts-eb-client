#!/usr/bin/env node
/**
 * Regenerates `src/features/justice/lib/hub-snapshot.ts`: the court portal's
 * figures the justice front door (`/justice`) and its prototypes draw, read
 * from the deployed dev API's judicial roots. The capture of portal.just.ro
 * stopped in June 2026; rerun this when it resumes.
 *
 *   node scripts/generate-justice-hub-snapshot.mjs [--api <graphql url>]
 *
 * Every count is the API's: `judicialCaseload` for cases (by level, court,
 * matter, year and stage), the decision lists paged whole for the ECHR, CCR
 * and CNSC series. The reference year is the last calendar year the Portal
 * capture covers whole (the year before its newest modification). No figure
 * is estimated or summed from another source.
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { api: { type: 'string', default: 'https://dev-chronos-api.transparenta.eu/api/v1/graphql' } } })
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'src/features/justice/lib/hub-snapshot.ts')

async function gql(query, variables) {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(values.api, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'transparenta-fixtures' },
      body: JSON.stringify({ query, variables }),
    })
    const json = await response.json().catch(() => null)
    if (json && !json.errors) return json.data
    if (attempt === 3) throw new Error(JSON.stringify(json?.errors ?? response.status).slice(0, 400))
  }
}

const LEVELS = ['judecatorie', 'tribunal', 'tribunal_militar', 'curte_de_apel', 'curte_militara_apel', 'inalta_curte']
/** The Portal's stage values with more than a few hundred cases (scrapper data brief E6), plus the ÎCCJ's own. */
const STAGES = [
  'Fond',
  'Apel',
  'ContestaţieNCPP',
  'Recurs',
  'RevizuireFond',
  'ContestatieinanulareApel',
  'RevizuireApel',
  'ContestatieinanulareFond',
  'RevizuireRecurs',
  'ContestatieinanulareRecurs',
  'ContestatieInAnulareNCPP',
  'RevizuireContestatieNCPP',
  'Recurs în interesul legii',
]

const AGGREGATE = `query($g: JudicialAggregateGroupBy!, $f: JudicialCasesFilter) { judicialCaseload(groupBy: $g, filter: $f) { denominator coverage groups { key label caseCount } } }`
async function caseload(groupBy, filter) {
  const data = await gql(AGGREGATE, { g: groupBy, f: filter })
  const { denominator, coverage, groups } = data.judicialCaseload
  if (coverage !== 1) throw new Error(`coverage ${coverage} for ${groupBy} ${JSON.stringify(filter)}`)
  return { total: denominator, groups: groups.map((group) => ({ key: group.key, count: group.caseCount })) }
}
const levelFilter = (levels) => ({ courtLevel: { in: levels } })
const asMap = (groups) => Object.fromEntries(groups.map((group) => [group.key, group.count]))

// ── freshness: the newest stored modification (Portal) and the newest archive date (ÎCCJ) ──
const NEWEST = `query($f: JudicialCasesFilter, $s: JudicialCaseSort) { judicialCases(filter: $f, sort: $s, dir: DESC, first: 1) { edges { node { sourceSlug sourceOpenedAt latestSourceModifiedAt } } } }`
const portalNewest = (await gql(NEWEST, { f: levelFilter(LEVELS.filter((level) => level !== 'inalta_curte')), s: 'modifiedAt' })).judicialCases.edges[0].node
const iccjNewest = (await gql(NEWEST, { f: levelFilter(['inalta_curte']), s: 'openedAt' })).judicialCases.edges[0].node
const portalModifiedAt = portalNewest.latestSourceModifiedAt
const year = Number(portalModifiedAt.slice(0, 4)) - 1
console.log(`Portal newest modification ${portalModifiedAt}; ÎCCJ newest archive date ${iccjNewest.sourceOpenedAt}; reference year ${year}`)

// ── cases ──
const all = levelFilter(LEVELS)
const inYear = { ...all, year: { eq: year } }
const total = (await caseload('courtLevel', all)).total
const byLevelInYear = await caseload('courtLevel', inYear)
const byCourt = asMap((await caseload('court', all)).groups)
const byCourtInYear = asMap((await caseload('court', inYear)).groups)
const byYear = (await caseload('year', all)).groups
const matters = { inYear: (await caseload('category', inYear)).groups, byLevelInYear: {} }
for (const level of LEVELS) matters.byLevelInYear[level] = (await caseload('category', { ...levelFilter([level]), year: { eq: year } })).groups
const stages = []
for (const stage of STAGES) {
  const levelsInYear = await caseload('courtLevel', { ...inYear, stage: { in: [stage] } })
  stages.push({ stage, byLevelInYear: asMap(levelsInYear.groups) })
}

// ── courts ──
const courtList = (await gql(`{ judicialCourts { institutionCode courtLevel countyCode } }`)).judicialCourts
const courts = courtList.map((court) => ({
  code: court.institutionCode,
  level: court.courtLevel,
  county: court.countyCode,
  cases: byCourt[court.institutionCode] ?? 0,
  casesInYear: byCourtInYear[court.institutionCode] ?? 0,
}))

// ── decisions: the public series, and CNSC's months ──
const DECISIONS = `query($f: JudicialDecisionsFilter!, $after: String) { judicialDecisions(filter: $f, first: 50, after: $after) { edges { node { decisionId decisionYear decisionDate decisionKind ecli privacyClass } } pageInfo { hasNextPage endCursor } } }`
async function decisions(sourceSystem) {
  const rows = []
  let after = null
  for (;;) {
    const page = (await gql(DECISIONS, { f: { sourceSystem: { eq: sourceSystem } }, after })).judicialDecisions
    rows.push(...page.edges.map((edge) => edge.node))
    if (!page.pageInfo.hasNextPage) return rows
    after = page.pageInfo.endCursor
  }
}
const tally = (keys) => Object.entries(keys.reduce((acc, key) => ((acc[key] = (acc[key] ?? 0) + 1), acc), {})).sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => ({ key, count }))

const hudoc = await decisions('hudoc_decision')
// Judgments (HEJUD/HFJUD), one per ECLI: a judgment published in English and French is one judgment.
const judgments = new Map()
for (const row of hudoc) if (/^h[ef]jud$/.test(row.decisionKind ?? '') && row.ecli) judgments.set(row.ecli, row)
const ccr = await decisions('ccr_decision')
const cnsc = await decisions('cnsc_decision')

const snapshot = {
  capturedAt: new Date().toISOString().slice(0, 10),
  asOf: { portalModifiedAt, iccjArchiveDate: iccjNewest.sourceOpenedAt },
  year,
  cases: { total, inYear: byLevelInYear.total, byLevelInYear: asMap(byLevelInYear.groups), byYear },
  matters,
  stages,
  courts,
  decisions: {
    echrJudgments: tally([...judgments.values()].map((row) => row.decisionDate.slice(0, 4))),
    ccrByYear: tally(ccr.map((row) => String(row.decisionYear))),
    cnscByMonth: tally(cnsc.map((row) => row.decisionDate.slice(0, 7))),
  },
}
// JSON with bare identifier keys and single-quoted strings, as the other generated snapshots read.
const literal = JSON.stringify(snapshot, null, 2)
  .replace(/"([A-Za-z_][A-Za-z0-9_]*)":/g, '$1:')
  .replace(/"((?:[^"\\]|\\.)*)"/g, (_, text) => `'${text.replace(/'/g, "\\'")}'`)
  // A flat object on one line: a court, a count.
  .replace(/\{\n\s*([^{}[\]]*?)\n\s*\}/g, (_, inner) => `{ ${inner.replace(/\n\s*/g, ' ')} }`)
writeFileSync(
  out,
  `/**\n * The court portal's figures for the justice front door, read from the judicial API on ${snapshot.capturedAt}.\n *\n * Generated by \`scripts/generate-justice-hub-snapshot.mjs\`; never edit a figure by hand.\n */\nimport type { JusticeHubSnapshot } from './hub-snapshot-types'\n\nexport const JUSTICE_HUB_SNAPSHOT: JusticeHubSnapshot = ${literal}\n`,
)
// The years alone, for the routes: a route that imported the snapshot would load it on every page.
const firstWhole = year - 2
const lastCapture = Number(portalModifiedAt.slice(0, 4))
writeFileSync(
  resolve(root, 'src/features/justice/lib/hub-years.ts'),
  `/**\n * The court portal capture's years, from the front door's snapshot read on ${snapshot.capturedAt}.\n *\n * Generated by \`scripts/generate-justice-hub-snapshot.mjs\` beside \`hub-snapshot.ts\`, so a route can know them without\n * loading the snapshot; never edit by hand.\n */\n\n/** The last calendar year the capture covers whole: the pages describe it by default. */\nexport const JUSTICE_REFERENCE_YEAR = ${year}\n/** The first year the capture holds whole; the years before hold only cases still active later. */\nexport const JUSTICE_FIRST_WHOLE_YEAR = ${firstWhole}\n/** The year the capture stops in: a part-year. */\nexport const JUSTICE_LAST_CAPTURE_YEAR = ${lastCapture}\n`,
)
console.log(`wrote ${out}: ${total} cases, ${courts.length} courts, ${stages.length} stages, ${judgments.size} ECHR judgments, ${ccr.length} CCR, ${cnsc.length} CNSC`)
