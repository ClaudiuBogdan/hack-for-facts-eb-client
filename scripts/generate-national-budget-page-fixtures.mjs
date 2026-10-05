#!/usr/bin/env node
/**
 * Regenerates the national budget page's mock fixtures
 * (`src/features/national-budget/page/mocks/fixtures/`) from the reviewed
 * data handoff and the March 2026 draft annex. Nothing here is hand-edited.
 *
 *   node scripts/generate-national-budget-page-fixtures.mjs
 *
 * Inputs (read-only):
 * - `docs/design/national-budget/data-handoff-20261002/approved-budget-real-sample.json`
 *   288 real rows of `budget.approved_budget_lines` (seven law editions).
 * - `docs/design/national-budget/data-handoff-20261002/execution-real-sample.json`
 *   289 real facts of `budget.execution_release_facts` (BGC bulletin,
 *   December 2025 and July 2026).
 * - `src/features/budget-2026/data/*.json`: the March 2026 draft's Anexa 3,
 *   extracted from PDFs on 2026-03-23 (not reviewed; a draft, not a law).
 *
 * Outputs:
 * - `approved-lines.sample.json`, `execution-facts.sample.json`: the real rows,
 *   copied without aggregation, with their provenance header.
 * - `catalog.json`: editions and the execution release index. Release months
 *   are January 2006 through July 2026 minus the six published gaps; the
 *   generator fails unless that leaves exactly the 241 selected releases the
 *   handoff counted.
 * - `draft-2026.json`: the draft's totals, authorities and their economic split.
 * - `demo-2025-authorities.json`: a SYNTHETIC authority list for the 2025
 *   edition (values invented, seeded, labelled `synthetic_demo`), because the
 *   sample holds one authority only. Administrația Prezidențială keeps its
 *   real sample rows and is not part of this file.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const handoff = resolve(root, 'docs/design/national-budget/data-handoff-20261002')
const draftDir = resolve(root, 'src/features/budget-2026/data')
const outDir = resolve(root, 'src/features/national-budget/page/mocks/fixtures')

const read = (path) => {
  const text = readFileSync(path, 'utf8')
  return { json: JSON.parse(text), sha256: createHash('sha256').update(text).digest('hex') }
}
const write = (name, value) => {
  writeFileSync(resolve(outDir, name), `${JSON.stringify(value, null, 1)}\n`)
  console.log(`wrote ${name}`)
}
const fail = (message) => {
  console.error(message)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

// ── Real samples ─────────────────────────────────────────────────────────────

const approved = read(resolve(handoff, 'approved-budget-real-sample.json'))
const execution = read(resolve(handoff, 'execution-real-sample.json'))
if (approved.json.kind !== 'real_source_sample_for_mock_adapter') fail('approved sample: unexpected kind')
if (execution.json.kind !== 'real_source_sample_for_mock_adapter') fail('execution sample: unexpected kind')

const { rows: approvedRows, ...approvedHeader } = approved.json
write('approved-lines.sample.json', {
  ...approvedHeader,
  inputFile: 'docs/design/national-budget/data-handoff-20261002/approved-budget-real-sample.json',
  inputSha256: approved.sha256,
  rows: approvedRows,
})

const { rows: executionRows, ...executionHeader } = execution.json
write('execution-facts.sample.json', {
  ...executionHeader,
  inputFile: 'docs/design/national-budget/data-handoff-20261002/execution-real-sample.json',
  inputSha256: execution.sha256,
  rows: executionRows,
})

// ── Catalog: editions and the release index ─────────────────────────────────

/** Unpublished months and why (handoff `execution-status.md`, 25 September). */
const RELEASE_GAPS = {
  '2008-12': 'held_accounting',
  '2012-09': 'held_accounting',
  '2012-11': 'held_accounting',
  '2019-07': 'source_gap',
  '2024-01': 'missing_bgc_original',
  '2025-05': 'incompatible_source',
}
/** Published months whose printed coverage stops short of the month's end. */
const RELEASE_NOTES = { '2006-07': 'printed_coverage_to_july_30' }

const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate()
const sampleMonths = new Set(executionRows.map((row) => row.period_end.slice(0, 7)))
const releases = []
for (let year = 2006; year <= 2026; year += 1) {
  for (let month = 1; month <= 12; month += 1) {
    if (year === 2026 && month > 7) break
    const key = `${year}-${String(month).padStart(2, '0')}`
    const periodEnd = `${key}-${String(lastDay(year, month)).padStart(2, '0')}`
    const gap = RELEASE_GAPS[key]
    releases.push({
      periodEnd,
      status: gap ? 'gap' : 'selected',
      gapReason: gap ?? null,
      note: RELEASE_NOTES[key] ?? null,
      inSample: sampleMonths.has(key),
    })
  }
}
const selected = releases.filter((release) => release.status === 'selected').length
if (selected !== execution.json.coverage.count) {
  fail(`release index: ${selected} selected months, handoff counts ${execution.json.coverage.count}`)
}

const reviewed = approved.json.completeEditionCoverage.map((edition) => ({
  key: String(edition.budgetYear),
  budgetYear: edition.budgetYear,
  publication: `law_${edition.budgetYear}_as_sent_to_monitorul_oficial`,
  status: 'law_as_sent',
  review: 'reviewed',
  counts: { lines: edition.lines, approved: edition.approved, forecasts: edition.forecasts },
  targetYears: [0, 1, 2, 3].map((offset) => edition.budgetYear + offset),
  funds: ['state_budget', 'state_social_insurance', 'health_insurance', 'unemployment_insurance'],
}))

write('catalog.json', {
  kind: 'mock_catalog_from_handoff',
  generatedFrom: [approved.sha256, execution.sha256],
  editions: [
    ...reviewed,
    {
      key: '2026-draft',
      budgetYear: 2026,
      publication: 'draft_2026_march_anexa3_pdf_extract',
      status: 'draft',
      review: 'unreviewed',
      counts: null,
      targetYears: [2026, 2027, 2028, 2029],
      funds: ['state_budget'],
    },
  ],
  /** Editions the reviewed lane does not hold yet, kept visible. */
  pendingEditions: [
    { budgetYear: 2018, reason: 'deployment_in_progress' },
    { budgetYear: 2017, reason: 'pending' },
    { budgetYear: 2016, reason: 'pending' },
    { budgetYear: 2015, reason: 'pending_missing_state_synthesis' },
  ],
  executionCoverage: execution.json.coverage,
  releases,
})

// ── The March 2026 draft ────────────────────────────────────────────────────

const totals = read(resolve(draftDir, 'totals.json'))
const ranking = read(resolve(draftDir, 'entities-ranking.json'))
const economic = read(resolve(draftDir, 'entity-economic-matrix.json'))

write('draft-2026.json', {
  kind: 'draft_static_unreviewed',
  publication: 'draft_2026_march_anexa3_pdf_extract',
  extractedOn: '2026-03-23',
  source: 'Anexa 3 la proiectul legii bugetului de stat pe 2026 (PDF-uri pe ordonatori), Ministerul Finanțelor',
  sourceUrl: 'https://mfinante.gov.ro/ro/acasa/transparenta/proiecte-acte-normative',
  method: 'server docs/research/research-202603231105-national-budget-2026-client-data-issues.md',
  unit: 'thousand_lei',
  inputSha256: { totals: totals.sha256, ranking: ranking.sha256, economic: economic.sha256 },
  totals: totals.json,
  authorities: ranking.json.map((row) => ({
    key: row.entity,
    name: row.label,
    proposed2026: String(row.propuneri_2026),
    estimate2027: row.estimari_2027 == null ? null : String(row.estimari_2027),
    preliminary2025: row.executie_preliminata_2025 == null ? null : String(row.executie_preliminata_2025),
    actual2024: row.realizari_2024 == null ? null : String(row.realizari_2024),
  })),
  economic: economic.json.map((row) => ({
    key: row.entity,
    code: row.economic_code,
    label: row.economic_label,
    proposed2026: String(row.propuneri_2026),
  })),
})

// ── Synthetic 2025 authority scenario ───────────────────────────────────────

/** mulberry32: small, seeded, reproducible. */
function prng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const SEED = 20261002
const random = prng(SEED)
const gaussian = () => {
  const u = Math.max(random(), 1e-12)
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const stateCredit = (budgetYear, measureYear) => {
  const rows = approvedRows.filter(
    (row) =>
      row.budget_year === budgetYear &&
      row.measure_year === measureYear &&
      row.form === 'state_budget_synthesis' &&
      row.row_role === 'credit' &&
      row.credit_type === 'budget_credits' &&
      row.capitol === '5001' &&
      row.context_label === 'CHELTUIELI - BUGET DE STAT',
  )
  if (rows.length !== 1) fail(`state credit total ${budgetYear}/${measureYear}: ${rows.length} rows`)
  return Number(rows[0].amount)
}
const presidency = (measureYear, creditType) => {
  const rows = approvedRows.filter(
    (row) =>
      row.budget_year === 2025 &&
      row.form === 'state_budget_authority_detail' &&
      row.authority_code === '01' &&
      row.capitol === '5001' &&
      row.titlu === '' &&
      row.row_role === 'credit' &&
      row.credit_type === creditType &&
      row.measure_year === measureYear,
  )
  if (rows.length !== 1) fail(`presidency total ${measureYear}/${creditType}: ${rows.length} rows`)
  return Number(rows[0].amount)
}

const others = ranking.json.filter((row) => row.entity !== 'administratia-prezidentiala')
const weights = others.map((row) => row.propuneri_2026 * Math.exp(0.3 * gaussian()))
const targetYears = [2025, 2026, 2027, 2028]
const drift = others.map(() => targetYears.map((year, index) => (index === 0 ? 1 : Math.exp(0.08 * gaussian()))))
const commitmentFactor = others.map(() => 1 + 0.3 * random())

/** Spread `total` over the rows in proportion to `weight`, in whole thousands, summing exactly. */
function apportion(total, weight) {
  const sum = weight.reduce((a, b) => a + b, 0)
  const raw = weight.map((w) => (total * w) / sum)
  const floored = raw.map(Math.floor)
  let rest = total - floored.reduce((a, b) => a + b, 0)
  const order = raw.map((value, index) => [value - Math.floor(value), index]).sort((a, b) => b[0] - a[0])
  for (const [, index] of order) {
    if (rest <= 0) break
    floored[index] += 1
    rest -= 1
  }
  return floored
}

const budgetByYear = Object.fromEntries(
  targetYears.map((year, yearIndex) => {
    const total = stateCredit(2025, year) - presidency(year, 'budget_credits')
    return [year, apportion(total, weights.map((w, row) => w * drift[row][yearIndex]))]
  }),
)
const order = others.map((_, index) => index).sort((a, b) => budgetByYear[2025][b] - budgetByYear[2025][a])

write('demo-2025-authorities.json', {
  kind: 'synthetic_demo',
  warning: 'Valori inventate pentru machetă. Numele sunt reale (lista proiectului 2026), sumele nu.',
  seed: SEED,
  method:
    'Weights: the March 2026 draft proposal per authority × lognormal noise (σ 0.3), drifted per target year (σ 0.08); budget credits apportioned in whole thousands to the real 2025-edition state total minus the real Administrația Prezidențială row, per target year; commitment credits = budget credits × U(1, 1.3), not anchored. Codes D01… are invented.',
  edition: '2025',
  unit: 'thousand_lei',
  anchors: Object.fromEntries(targetYears.map((year) => [year, String(stateCredit(2025, year))])),
  authorities: order.map((index, rank) => ({
    key: `demo-${others[index].entity}`,
    code: `D${String(rank + 1).padStart(2, '0')}`,
    name: others[index].label,
    budgetCredits: Object.fromEntries(targetYears.map((year) => [year, String(budgetByYear[year][index])])),
    commitmentCredits: Object.fromEntries(
      targetYears.map((year) => [year, String(Math.round(budgetByYear[year][index] * commitmentFactor[index]))]),
    ),
  })),
})
