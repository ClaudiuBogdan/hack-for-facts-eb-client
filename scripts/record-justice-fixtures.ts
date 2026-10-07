#!/usr/bin/env node
/**
 * Records the judicial API's answers to the justice pages' own GraphQL
 * documents (`src/features/justice/api/judicial-queries.ts`) into
 * `src/features/justice/fixtures/`, for the unit tests. Rerun it when a
 * document changes; never edit a fixture by hand.
 *
 *   yarn tsx scripts/record-justice-fixtures.ts [--api <graphql url>]
 *
 * The court is a small tribunal with three judecătorii under it; the case
 * has resolved citations, a same-file link at another court and parties of
 * both kinds — none named, as the API serves them.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { CASE_QUERY, CHILDREN_QUERY, COURT_CASES_PAGE_SIZE, COURT_QUERY, relatedCasesQuery } from '../src/features/justice/api/judicial-queries'
import { DEFAULT_QUESTION, type Question } from '../src/features/justice/lib/analysis-model'
import { analysisReads } from '../src/features/justice/lib/analysis-plans'
import { MAIN_STAGES } from '../src/features/justice/lib/judicial-model'

const { values } = parseArgs({ options: { api: { type: 'string', default: 'https://dev-chronos-api.transparenta.eu/api/v1/graphql' } } })
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'src/features/justice/fixtures')

const COURT = 'TribunalulSALAJ'
const YEAR = 2025
const CASE = { code: 'CurteadeApelCONSTANTA', number: '5180/118/2021/a3' }

async function gql(query: string, variables: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(values.api, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'transparenta-fixtures' },
    body: JSON.stringify({ query, variables }),
  })
  const json = (await response.json()) as { data?: Record<string, unknown>; errors?: unknown }
  if (json.errors || !json.data) throw new Error(JSON.stringify(json.errors ?? response.status).slice(0, 400))
  return json.data
}

function write(name: string, data: unknown) {
  writeFileSync(resolve(outDir, name), `${JSON.stringify(data, null, 1)}\n`)
  console.log(`wrote ${name}`)
}

mkdirSync(outDir, { recursive: true })

const court = { institutionCode: { in: [COURT] } }
const inYear = { ...court, year: { eq: YEAR } }
const courtPage = await gql(COURT_QUERY, {
  code: COURT,
  court,
  year: inYear,
  ...Object.fromEntries(MAIN_STAGES.map((main, index) => [`stage${index}`, { ...inYear, stage: { in: [main.stage] } }])),
  first: COURT_CASES_PAGE_SIZE,
})
write('court-page.json', courtPage)

const children = ((courtPage.court as { children: { institutionCode: string }[] }).children ?? []).map((child) => child.institutionCode)
write('court-children.json', await gql(CHILDREN_QUERY, { filter: { institutionCode: { in: children }, year: { eq: YEAR } } }))

const casePage = await gql(CASE_QUERY, CASE)
write('case-page.json', casePage)

const detail = casePage.judicialCase as { case: { caseId: string }; lineage: { fromCaseId: string; toCaseId: string | null }[] }
const ids = [...new Set(detail.lineage.map((edge) => (edge.fromCaseId === detail.case.caseId ? edge.toCaseId : edge.fromCaseId)).filter((id): id is string => id !== null))]
write('case-related.json', await gql(relatedCasesQuery(ids), Object.fromEntries(ids.map((id, index) => [`id${index}`, id]))))

// The analysis page's reads, as the page plans them (`analysis-plans.ts`), each with the API's answer: the
// bare page (courts in 2025 and 2024), and contentious-administrative cases by stage (a matter the ÎCCJ spells its own way).
const ANALYSIS_QUESTIONS: readonly Question[] = [DEFAULT_QUESTION, { ...DEFAULT_QUESTION, matters: ['contenciosadministrativsifiscal'], dupa: 'etape' }]
const AGGREGATE = 'query($groupBy: JudicialAggregateGroupBy!, $filter: JudicialCasesFilter) { judicialCaseload(groupBy: $groupBy, filter: $filter) { denominator groups { key caseCount } } }'
const analysisRecords: unknown[] = []
const recorded = new Set<string>()
for (const read of ANALYSIS_QUESTIONS.flatMap(analysisReads)) {
  const key = JSON.stringify(read)
  if (read.filter === null || recorded.has(key)) continue
  recorded.add(key)
  analysisRecords.push({ ...read, data: await gql(AGGREGATE, { groupBy: read.groupBy, filter: read.filter }) })
}
write('analysis-reads.json', analysisRecords)
