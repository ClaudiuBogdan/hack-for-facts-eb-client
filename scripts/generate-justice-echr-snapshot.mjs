#!/usr/bin/env node
/**
 * Regenerates `src/features/justice/lib/echr-snapshot.ts`: the European Court
 * of Human Rights' documents in cases against Romania, as the judicial API
 * stores them from HUDOC (`sourceSystem: hudoc_decision`, every row public).
 *
 *   node scripts/generate-justice-echr-snapshot.mjs [--api <graphql url>]
 *
 * HUDOC stores a document once per language, so the English and French
 * versions are merged: a judgment by its ECLI, a decision or a communicated
 * case by its date and applications (they carry no ECLI). The API stores no
 * title and no applicant's name, and none is looked for. Resolutions, legal
 * summaries and advisory requests are left out: the page counts judgments,
 * decisions and communicated cases only.
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { api: { type: 'string', default: 'https://dev-chronos-api.transparenta.eu/api/v1/graphql' } } })
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'src/features/justice/lib/echr-snapshot.ts')

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

const DECISIONS = `query($f: JudicialDecisionsFilter!, $after: String) { judicialDecisions(filter: $f, first: 50, after: $after) { edges { node { sourceRef decisionDate decisionKind ecli applicationNo attrs privacyClass } } pageInfo { hasNextPage endCursor } } }`
const rows = []
for (let after = null; ; ) {
  const page = (await gql(DECISIONS, { f: { sourceSystem: { eq: 'hudoc_decision' } }, after })).judicialDecisions
  rows.push(...page.edges.map((edge) => edge.node))
  if (!page.pageInfo.hasNextPage) break
  after = page.pageInfo.endCursor
}
const restricted = rows.filter((row) => row.privacyClass !== 'public').length
if (restricted > 0) throw new Error(`${restricted} HUDOC rows are not public: decide what the page may show before regenerating`)

/** HUDOC's document types, English and French: HEJUD/HFJUD judgments, HEDEC/HFDEC decisions, HECOM/HFCOM communicated cases. */
const FAMILIES = { hejud: 'judgment', hfjud: 'judgment', hedec: 'decision', hfdec: 'decision', hecom: 'communicated', hfcom: 'communicated' }
const LANGUAGES = { ENG: 'en', FRE: 'fr' }
const applicationsOf = (row) => (row.applicationNo ?? '').split(';').map((value) => value.trim()).filter(Boolean)

const judgments = new Map()
const documents = new Map()
for (const row of rows) {
  const family = FAMILIES[row.decisionKind ?? '']
  if (!family || !row.decisionDate) continue
  const applications = applicationsOf(row)
  if (family !== 'judgment') {
    documents.set(`${family}|${row.decisionDate}|${[...applications].sort().join(';')}`, { family, year: Number(row.decisionDate.slice(0, 4)) })
    continue
  }
  if (!row.ecli) throw new Error(`judgment ${row.sourceRef} has no ECLI`)
  const judgment = judgments.get(row.ecli) ?? { ecli: row.ecli, date: row.decisionDate, applications, versions: [] }
  if (judgment.date !== row.decisionDate) throw new Error(`${row.ecli}: two dates`)
  const language = LANGUAGES[row.attrs?.languageisocode]
  if (language) judgment.versions.push({ language, item: row.sourceRef })
  const respondents = String(row.attrs?.respondent ?? 'ROU').split(';').filter((code) => code !== 'ROU')
  if (respondents.length > 0) judgment.alsoAgainst = respondents
  judgments.set(row.ecli, judgment)
}

const list = [...judgments.values()]
  .map((judgment) => ({ ...judgment, versions: judgment.versions.sort((a, b) => a.language.localeCompare(b.language)) }))
  .sort((a, b) => b.date.localeCompare(a.date) || a.ecli.localeCompare(b.ecli))
const years = new Map()
const yearOf = (year) => years.get(year) ?? years.set(year, { year, judgments: 0, applications: 0, decisions: 0, communicated: 0 }).get(year)
for (const judgment of list) {
  const entry = yearOf(Number(judgment.date.slice(0, 4)))
  entry.judgments += 1
  entry.applications += judgment.applications.length
}
for (const document of documents.values()) yearOf(document.year)[document.family === 'decision' ? 'decisions' : 'communicated'] += 1

const snapshot = {
  capturedAt: new Date().toISOString().slice(0, 10),
  newest: rows.map((row) => row.decisionDate).filter(Boolean).sort().at(-1),
  years: [...years.values()].sort((a, b) => a.year - b.year),
  judgments: list,
}
// JSON with bare identifier keys and single-quoted strings, as the other generated snapshots read; a judgment on one line.
const literal = JSON.stringify(snapshot, null, 2)
  .replace(/"([A-Za-z_][A-Za-z0-9_]*)":/g, '$1:')
  .replace(/"((?:[^"\\]|\\.)*)"/g, (_, text) => `'${text.replace(/'/g, "\\'")}'`)
  .replace(/\{\n\s*([^{}]*?)\n\s*\}/g, (_, inner) => `{ ${inner.replace(/\n\s*/g, ' ')} }`)
  .replace(/\[\n\s*('[^'\n]*'(?:,\n\s*'[^'\n]*')*)\n\s*\]/g, (_, inner) => `[${inner.replace(/\n\s*/g, ' ')}]`)
  .replace(/\[\n\s*(\{[^\n]*\}(?:,\n\s*\{[^\n]*\})?)\n\s*\]/g, (_, inner) => `[${inner.replace(/\n\s*/g, ' ')}]`)
  .replace(/\{\n\s*([^{}]*?\[[^\n]*\][^{}]*?)\n\s*\}/g, (_, inner) => `{ ${inner.replace(/\n\s*/g, ' ')} }`)
writeFileSync(
  out,
  `/**\n * The European Court of Human Rights' judgments in cases against Romania, and its documents counted by year, read from the\n * judicial API (HUDOC) on ${snapshot.capturedAt}.\n *\n * Generated by \`scripts/generate-justice-echr-snapshot.mjs\`; never edit by hand.\n */\nimport type { EchrSnapshot } from './echr-snapshot-types'\n\nexport const ECHR_SNAPSHOT: EchrSnapshot = ${literal}\n`,
)
console.log(`wrote ${out}: ${rows.length} rows, ${list.length} judgments, ${[...documents.values()].filter((d) => d.family === 'decision').length} decisions, ${[...documents.values()].filter((d) => d.family === 'communicated').length} communicated, newest ${snapshot.newest}`)
