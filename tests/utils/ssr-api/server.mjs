#!/usr/bin/env node
/**
 * The API the app's server render reads during the integration tests: TEST-001's server side (this harness:
 * client-dev-polish; the browser guard, tests/utils/api-guard.ts: client-entity-analytics).
 *
 * The app's server reads `INTERNAL_API_URL` (src/config/env.ts); playwright.config.ts points it here. A GraphQL read
 * is answered from its recorded fixture (tests/fixtures/ssr-api/<operation>-<hash>.json.gz, by operation and
 * variables; gzipped, as ANAF's line-item answers run to some 700 kB each: `zcat <file> | jq` reads one). One without a fixture is forwarded to `VITE_API_URL`, as the tests did before (`passthrough`), except
 * the national budget's reads, which never reach the live API (`missing`, answered with an error). With
 * `SSR_API_MODE=strict` nothing is forwarded; with `SSR_API_MODE=record` every read is forwarded and its answer saved.
 *
 * Every read prints one line, `[ssr-api] <source> <operation> <hash> <from>`, so with one worker each read lands in
 * its test's place in Playwright's output. `GET /__ssr-api/reads?after=<seq>` lists them for a test's own check, and
 * `/__ssr-api/judged` keeps where the checks have got to (GET reads it, POST `?upTo=<seq>` moves it on).
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { gunzipSync, gzipSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures/ssr-api')
const PORT = Number(process.env.PLAYWRIGHT_SSR_API_PORT ?? 3199)
const MODE = process.env.SSR_API_MODE ?? 'passthrough'
const UPSTREAM = (process.env.SSR_API_UPSTREAM ?? process.env.VITE_API_URL ?? '').replace(/\/+$/u, '')

/** JSON with its keys sorted, so a read's key doesn't depend on the order its variables were written in. */
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
  return JSON.stringify(value ?? null)
}

const keyOf = (operation, variables) => `${operation}-${createHash('sha256').update(stable(variables)).digest('hex').slice(0, 12)}`

/** The keys of the national budget's ANAF filter (`anafFilter` in home-data.ts), and nothing else: an entity page's read adds its own. */
const ANAF_KEYS = 'account_category,budget_sector_ids,currency,funding_source_ids,inflation_adjusted,normalization,report_period,report_type,show_period_growth'

/** The national budget's reads: its own operations, and ANAF's whole-state-budget reads its pages make. */
function nationalBudget(operation, variables) {
  if (/^Budget(National|Execution|Approved)/u.test(operation)) return true
  const filter = variables?.filter
  return (
    (operation === 'EntityAnalytics' || operation === 'AggregatedLineItems') &&
    Object.keys(filter ?? {}).sort().join(',') === ANAF_KEYS &&
    filter.report_type === 'PRINCIPAL_AGGREGATED' &&
    filter.account_category === 'ch' &&
    filter.normalization === 'total' &&
    stable(filter.budget_sector_ids) === '["1"]' &&
    stable(filter.funding_source_ids) === '["1"]'
  )
}

const fixtures = new Map()
mkdirSync(FIXTURES, { recursive: true })
for (const file of readdirSync(FIXTURES).filter((name) => name.endsWith('.json.gz'))) {
  fixtures.set(file.slice(0, -'.json.gz'.length), JSON.parse(gunzipSync(readFileSync(path.join(FIXTURES, file))).toString('utf8')).response)
}

const reads = []

/**
 * How far the tests' checks have judged the reads (`test.ts`): each check starts here and moves it past what it
 * judged. It lives here, not in a worker, so a worker restarted after a failure goes on from where the last check
 * ended: nothing is judged twice, nothing skipped.
 */
let judged = 0

function note(source, operation, key, from, budget) {
  const read = { seq: reads.length + 1, source, operation, key, from, nationalBudget: budget }
  reads.push(read)
  console.log(`[ssr-api] ${source} ${key} ${from}`)
}

async function forward(body) {
  if (!UPSTREAM) throw new Error('no upstream: set VITE_API_URL or SSR_API_UPSTREAM')
  const response = await fetch(`${UPSTREAM}/api/v1/graphql`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body })
  return { status: response.status, text: await response.text() }
}

const send = (response, status, text) => {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(text)
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`)
  if (request.method === 'GET' && url.pathname === '/__ssr-api/health') return send(response, 200, '{"ok":true}')
  if (request.method === 'GET' && url.pathname === '/__ssr-api/reads') {
    const after = Number(url.searchParams.get('after') ?? 0)
    return send(response, 200, JSON.stringify(reads.filter((read) => read.seq > after)))
  }
  if (url.pathname === '/__ssr-api/judged') {
    if (request.method === 'POST') judged = Math.max(judged, Number(url.searchParams.get('upTo') ?? 0) || 0)
    return send(response, 200, JSON.stringify({ judged }))
  }
  if (request.method !== 'POST' || !url.pathname.endsWith('/graphql')) return send(response, 404, '{"errors":[{"message":"[ssr-api] not a GraphQL read"}]}')

  let raw = ''
  for await (const chunk of request) raw += chunk
  const body = JSON.parse(raw || '{}')
  const operation = body.operationName ?? /\b(?:query|mutation)\s+(\w+)/u.exec(body.query ?? '')?.[1] ?? 'anonymous'
  const variables = body.variables ?? {}
  const key = keyOf(operation, variables)
  const from = request.headers['x-ssr-api-from'] === 'browser' ? 'browser' : 'server'
  const budget = nationalBudget(operation, variables)
  try {
    if (MODE === 'record') {
      const answer = await forward(raw)
      if (answer.status === 200 && !JSON.parse(answer.text).errors) {
        writeFileSync(path.join(FIXTURES, `${key}.json.gz`), gzipSync(`${JSON.stringify({ operation, variables, response: JSON.parse(answer.text) })}\n`, { level: 9 }))
        fixtures.set(key, JSON.parse(answer.text))
      }
      note('recorded', operation, key, from, budget)
      return send(response, answer.status, answer.text)
    }
    if (fixtures.has(key)) {
      note('fixture', operation, key, from, budget)
      return send(response, 200, JSON.stringify(fixtures.get(key)))
    }
    if (MODE === 'strict' || budget) {
      note('missing', operation, key, from, budget)
      // In full: a cursor alone runs to a thousand characters, and the variables are what a recording needs.
      console.log(`[ssr-api] missing ${key} asked ${stable(variables)}`)
      return send(response, 200, JSON.stringify({ errors: [{ message: `[ssr-api] no fixture for ${key}`, extensions: { code: 'SSR_API_MISSING' } }] }))
    }
    const answer = await forward(raw)
    note('passthrough', operation, key, from, budget)
    return send(response, answer.status, answer.text)
  } catch (error) {
    note('failed', operation, key, from, budget)
    return send(response, 502, JSON.stringify({ errors: [{ message: `[ssr-api] ${error instanceof Error ? error.message : String(error)}` }] }))
  }
}).listen(PORT, '127.0.0.1', () => console.log(`[ssr-api] ${MODE} on 127.0.0.1:${PORT}, ${fixtures.size} fixtures, upstream ${UPSTREAM || 'none'}`))
