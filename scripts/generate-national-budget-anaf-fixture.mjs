#!/usr/bin/env node
/**
 * Regenerates `src/features/national-budget/page/mocks/fixtures/anaf-state-budget.json`:
 * the state budget's payments as the principal authorities (ordonatori
 * principali) report them to ANAF, read from the deployed dev API. This lane
 * is served today; it is a different population and data-through date than
 * the Ministry of Finance bulletins, and the page keeps the two apart.
 *
 *   node scripts/generate-national-budget-anaf-fixture.mjs [--api <graphql url>]
 *
 * State budget = budget sector 1 („Bugetul de stat"), funding source 1
 * („Integral de la buget"), report `PRINCIPAL_AGGREGATED`, expenses (`ch`).
 * - each year's total, 2016 to the year in progress (summed from the
 *   aggregated line items, as the explorer reads them);
 * - the principal authorities, ranked, for every one of those years;
 * - the last month with data (the year in progress runs to it).
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { api: { type: 'string', default: 'https://dev-chronos-api.transparenta.eu/api/v1/graphql' } } })
const API = values.api
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'src/features/national-budget/page/mocks/fixtures/anaf-state-budget.json')

async function gql(query, variables) {
  const response = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const json = await response.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 400))
  return json.data
}

const period = (type, start, end) => ({ type, selection: { interval: { start, end } } })
const filter = (reportPeriod) => ({
  report_period: reportPeriod,
  account_category: 'ch',
  report_type: 'PRINCIPAL_AGGREGATED',
  normalization: 'total',
  currency: 'RON',
  inflation_adjusted: false,
  budget_sector_ids: ['1'],
  funding_source_ids: ['1'],
  show_period_growth: false,
})

const LINE_ITEMS = `query L($filter: AnalyticsFilterInput!) { aggregatedLineItems(filter: $filter, limit: 100000) { nodes { amount } pageInfo { totalCount } } }`
const ENTITIES = `query E($filter: AnalyticsFilterInput!) { entityAnalytics(filter: $filter, sort: { by: "amount", order: "DESC" }, limit: 200) { nodes { entity_cui entity_name entity_type amount } pageInfo { totalCount } } }`

const sum = (nodes) => nodes.reduce((total, node) => total + Number(node.amount), 0)

// The last month with data: the year in progress runs to it.
const now = new Date()
let lastMonth = null
for (let year = now.getUTCFullYear(); year >= now.getUTCFullYear() - 1 && !lastMonth; year -= 1) {
  for (let month = 12; month >= 1; month -= 1) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    const data = await gql(LINE_ITEMS, { filter: filter(period('MONTH', key, key)) })
    if (data.aggregatedLineItems.nodes.length > 0) {
      lastMonth = key
      break
    }
  }
}
if (!lastMonth) throw new Error('no month with data')
const lastYear = Number(lastMonth.slice(0, 4))
const lastComplete = lastMonth.endsWith('-12') ? lastYear : lastYear - 1

const years = []
for (let year = 2016; year <= lastYear; year += 1) {
  const data = await gql(LINE_ITEMS, { filter: filter(period('YEAR', String(year), String(year))) })
  const nodes = data.aggregatedLineItems.nodes
  if (nodes.length === 0) continue
  years.push({ year, lei: sum(nodes).toFixed(2), throughMonth: year === lastYear ? lastMonth : `${year}-12`, lines: nodes.length })
  console.log(year, (sum(nodes) / 1e9).toFixed(2), 'bn')
}

const authorities = {}
for (const { year } of years) {
  const data = await gql(ENTITIES, { filter: filter(period('YEAR', String(year), String(year))) })
  const rows = data.entityAnalytics.nodes
  authorities[year] = {
    throughMonth: year === lastYear ? lastMonth : `${year}-12`,
    totalCount: data.entityAnalytics.pageInfo.totalCount,
    rows: rows.map((row) => ({ cui: row.entity_cui, name: row.entity_name, type: row.entity_type, lei: Number(row.amount).toFixed(2) })),
  }
  const total = rows.reduce((acc, row) => acc + Number(row.amount), 0)
  console.log(year, 'authorities', rows.length, (total / 1e9).toFixed(2), 'bn')
}

writeFileSync(
  out,
  `${JSON.stringify(
    {
      kind: 'real_api_snapshot',
      source: 'ANAF, execuția bugetară raportată de ordonatorii principali (budget sector 1, funding source 1, PRINCIPAL_AGGREGATED, ch)',
      api: API,
      fetchedAt: new Date().toISOString(),
      lastMonth,
      lastCompleteYear: lastComplete,
      years,
      authorities,
    },
    null,
    1,
  )}\n`,
)
console.log('wrote', out)
