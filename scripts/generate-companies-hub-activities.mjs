#!/usr/bin/env node
/**
 * Regenerates `src/features/private-companies/lib/hub-activities.ts`, the
 * companies hub's „Pe domenii" rankings, from the public API only — no
 * database: the companies analysis release's derived activity selection
 * (v3, `ACTIVITY`), each exact (source, code, revision) its own group, never
 * an ANAF code read as a Rev.2 or Rev.3 division.
 *
 * Three rankings, each the question the hub's link asks the analysis:
 * - turnover: the year's admitted turnover, by its sum;
 * - employees: the year's admitted headcounts within the hub's ceiling
 *   (0–50,000, as the hub's other employee figures), by their sum;
 * - activeFirms: the release's companies whose observed ONRC status is
 *   „în funcțiune" (1048), by their count.
 * Each keeps the API's own totals (the shares' denominator), the rest of the
 * groups as one remainder, and the companies with no selection — several
 * classes, a code outside the nomenclature, no qualified selection — apart.
 * The parts must add up to the API's totals before anything is written.
 *
 *   node scripts/generate-companies-hub-activities.mjs --year 2025
 *
 * Options:
 *   --year   fiscal year (default: last year)
 *   --api    GraphQL endpoint (default: dev-chronos-api)
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'src/features/private-companies/lib/hub-activities.ts')

const { values: args } = parseArgs({
  options: {
    year: { type: 'string', default: String(new Date().getFullYear() - 1) },
    api: { type: 'string', default: 'https://dev-chronos-api.transparenta.eu/api/v1/graphql' },
  },
})
const YEAR = Number(args.year)
if (!Number.isInteger(YEAR) || YEAR < 2008) {
  console.error('Usage: --year 2025')
  process.exit(1)
}

/**
 * The hub's employee range, 0 to `HUB_EMPLOYEE_CEILING`: the cohort its other employee figures count,
 * inherited as such — a range the ranking states, not a finding that every count past it is wrong.
 */
const EMPLOYEE_CEILING = 50_000
const STATUS_ACTIVE = '1048'
const TOP = 10

const RELEASE_QUERY = `query { companyAnalysisRelease { release { releaseId publishedAt source { sourcePublishedAt } } } }`
const BUCKET = 'kind key label companies filers metric { metric sum contributors } activity { basis source code revision label descriptionStatus derived }'
const BREAKDOWN_QUERY = `
  query HubActivities($release: BigInt!, $scope: CompanyAnalysisScopeInput, $metric: CompanyAnalysisMetric, $rankBy: CompanyAnalysisRankBy, $topN: Int) {
    companyAnalysisBreakdown(release: $release, scope: $scope, dimension: ACTIVITY, metric: $metric, rankBy: $rankBy, topN: $topN) {
      release { releaseId publishedAt active }
      fiscalYear dimension metric rankBy rankedBy groupCount
      groups { ${BUCKET} }
      other { ${BUCKET} }
      unknown { ${BUCKET} }
      unclassified { ${BUCKET} }
      totals { ${BUCKET} }
    }
  }`

/** What each ranking asks: the same scope, metric and rank the hub's link opens in the analysis. */
const RANKINGS = {
  turnover: { metric: 'TURNOVER', rankBy: 'METRIC_SUM', scope: { fiscalYear: YEAR }, value: 'sum' },
  employees: {
    metric: 'EMPLOYEES',
    rankBy: 'METRIC_SUM',
    scope: { fiscalYear: YEAR, financialRanges: [{ metric: 'EMPLOYEES', min: '0', max: String(EMPLOYEE_CEILING) }] },
    value: 'sum',
  },
  activeFirms: { metric: 'TURNOVER', rankBy: 'COMPANIES', scope: { fiscalYear: YEAR, observedStatus: { in: [STATUS_ACTIVE] } }, value: 'companies' },
}

async function graphql(query, variables = {}) {
  const started = Date.now()
  const response = await fetch(args.api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const body = await response.json()
  if (!response.ok || body.errors?.length) throw new Error(`${args.api}: ${response.status} ${JSON.stringify(body.errors ?? body).slice(0, 500)}`)
  return { data: body.data, ms: Date.now() - started }
}

/** An exact decimal from the API as a number: sums stay far below 2^53 (the year's turnover is ~2.8e12 lei). */
const number = (text) => (text === null || text === undefined ? null : Number(text))

function valueOf(bucket, kind) {
  return kind === 'sum' ? number(bucket.metric?.sum ?? null) : number(bucket.companies)
}

function rankingOf(name, answer, kind) {
  const problems = []
  const check = (ok, message) => ok || problems.push(`${name}: ${message}`)
  check(answer.dimension === 'ACTIVITY', `dimension ${answer.dimension}`)
  check(answer.fiscalYear === YEAR, `fiscal year ${answer.fiscalYear}`)
  check(answer.groups.length === TOP, `${answer.groups.length} groups, not ${TOP}`)
  const rows = answer.groups.map((group) => {
    const activity = group.activity
    check(activity && activity.code !== null && (activity.source === 'ONRC' || activity.source === 'ANAF'), `group ${group.key} selects no activity`)
    // An ONRC group carries its own revision; ANAF's never does (ANAF publishes none).
    check(activity.source === 'ANAF' ? activity.revision === null : /^rev[0-3]$/.test(activity.revision ?? ''), `group ${group.key} has revision ${activity.revision}`)
    const expected = activity.source === 'ONRC' ? `onrc:${activity.revision}:${activity.code}` : `anaf:${activity.code}`
    check(group.key === expected, `group key ${group.key} is not ${expected}`)
    return {
      key: group.key,
      source: activity.source,
      code: activity.code,
      revision: activity.revision,
      label: activity.label,
      value: valueOf(group, kind),
      companies: number(group.companies),
    }
  })
  const unclassified = (answer.unclassified ?? []).map((bucket) => ({
    basis: bucket.activity?.basis ?? null,
    value: valueOf(bucket, kind),
    companies: number(bucket.companies),
  }))
  check(unclassified.every((bucket) => bucket.basis !== null), 'an unclassified bucket names no basis')
  // No contributor is no sum: null, never a published zero (the reconciliation counts it as nothing).
  const other = { value: valueOf(answer.other, kind), companies: number(answer.other.companies), groups: answer.groupCount - TOP }
  const unknown = answer.unknown ? { value: valueOf(answer.unknown, kind) ?? 0, companies: number(answer.unknown.companies) } : null
  check(unknown === null || (unknown.value === 0 && unknown.companies === 0), 'an unknown bucket holds companies')
  const total = valueOf(answer.totals, kind)
  const companies = number(answer.totals.companies)
  // Conservation: the ranked rows, the rest and the unselected add up to the API's own totals.
  const parts = (pick) => rows.reduce((sum, row) => sum + (pick(row) ?? 0), 0) + (pick(other) ?? 0) + unclassified.reduce((sum, bucket) => sum + (pick(bucket) ?? 0), 0)
  check(Math.abs(parts((entry) => entry.value) - total) < 0.5, `the parts' ${kind} (${parts((entry) => entry.value)}) is not the total (${total})`)
  check(parts((entry) => entry.companies) === companies, `the parts' companies (${parts((entry) => entry.companies)}) are not the total (${companies})`)
  check(rows.every((row, index) => index === 0 || (rows[index - 1].value ?? 0) >= (row.value ?? 0)), 'the rows are not ranked')
  if (problems.length > 0) throw new Error(`The breakdown does not reconcile:\n- ${problems.join('\n- ')}`)
  return { total, companies, groupCount: answer.groupCount, rows, other, unclassified }
}

// The two Unicode line breaks, built from their code points: a literal one would end the regex.
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), 'g')
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), 'g')
/** A single-quoted literal of any text, or `null`: a line break in a label would end the string. */
const quote = (value) =>
  value === null || value === undefined
    ? 'null'
    : `'${String(value)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(LINE_SEPARATOR, '\\u2028')
        .replace(PARAGRAPH_SEPARATOR, '\\u2029')}'`
const num = (value) => (value === null || value === undefined ? 'null' : String(value))

function render(source, rankings) {
  const ranking = (name, data) => [
    `  ${name}: {`,
    `    total: ${num(data.total)},`,
    `    companies: ${num(data.companies)},`,
    `    groupCount: ${data.groupCount},`,
    '    rows: [',
    ...data.rows.map(
      (row) =>
        `      { key: ${quote(row.key)}, source: ${quote(row.source)}, code: ${quote(row.code)}, revision: ${quote(row.revision)}, label: ${quote(row.label)}, value: ${num(row.value)}, companies: ${num(row.companies)} },`,
    ),
    '    ],',
    `    other: { value: ${num(data.other.value)}, companies: ${num(data.other.companies)}, groups: ${data.other.groups} },`,
    '    unclassified: [',
    ...data.unclassified.map((bucket) => `      { basis: ${quote(bucket.basis)}, value: ${num(bucket.value)}, companies: ${num(bucket.companies)} },`),
    '    ],',
    '  },',
  ]
  return [
    "import type { CompanyHubActivities } from './hub-snapshot-types'",
    '',
    '/**',
    ` * The companies hub's „Pe domenii" rankings: release ${source.releaseId} of the companies analysis`,
    ` * (published ${source.publishedAt}, ONRC edition of ${source.onrcPublished}), fiscal year ${YEAR}, read`,
    ` * from the public API on ${source.readOn} (\`companyAnalysisBreakdown\`, dimension ACTIVITY, top ${TOP}).`,
    ' *',
    ' * Each row is one derived activity selection — an ONRC class with its own',
    ' * revision, or ANAF\'s fiscal code with its revision unpublished — never a',
    ' * division, never a registered principal activity. Each ranking keeps the',
    " * API's totals for its shares; the rest of the groups and the companies with",
    ' * no selection are kept apart, and the parts add up to the totals.',
    ' *',
    ' * Generated by `scripts/generate-companies-hub-activities.mjs`; never edit a figure by hand.',
    ' */',
    'export const COMPANY_HUB_ACTIVITIES: CompanyHubActivities = {',
    `  source: { releaseId: ${quote(source.releaseId)}, publishedAt: ${quote(source.publishedAt)}, onrcPublished: ${quote(source.onrcPublished)}, fiscalYear: ${YEAR}, readOn: ${quote(source.readOn)} },`,
    ...ranking('turnover', rankings.turnover),
    ...ranking('employees', rankings.employees),
    ...ranking('activeFirms', rankings.activeFirms),
    '}',
    '',
  ].join('\n')
}

const { data: releaseData } = await graphql(RELEASE_QUERY)
const { release } = releaseData.companyAnalysisRelease
const rankings = {}
for (const [name, ask] of Object.entries(RANKINGS)) {
  const { data, ms } = await graphql(BREAKDOWN_QUERY, { release: release.releaseId, scope: ask.scope, metric: ask.metric, rankBy: ask.rankBy, topN: TOP })
  const answer = data.companyAnalysisBreakdown
  if (answer.release.releaseId !== release.releaseId) throw new Error(`${name}: answered by release ${answer.release.releaseId}, not ${release.releaseId}`)
  rankings[name] = rankingOf(name, answer, ask.value)
  console.log(`${name}: ${answer.groupCount} groups, total ${rankings[name].total}, ${ms} ms`)
}
const source = {
  releaseId: release.releaseId,
  publishedAt: release.publishedAt?.slice(0, 10) ?? null,
  onrcPublished: release.source.sourcePublishedAt.slice(0, 10),
  readOn: new Date().toISOString().slice(0, 10),
}
writeFileSync(OUT, render(source, rankings))
console.log(`wrote ${OUT}`)
