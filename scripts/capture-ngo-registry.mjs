#!/usr/bin/env node
/**
 * Reads every record of the Ministry of Justice NGO registry (RNONG) through
 * the Chronos GraphQL API and writes one JSON object per line.
 *
 * The API serves the registry 100 records a page with no counts, so the
 * figures on `/ong-uri` are computed from a full read and kept in the client
 * (`src/features/ngos/hub/registry-summary.ts`). Run this, then
 * `node scripts/summarize-ngo-registry.mjs <file>` to rebuild that module.
 *
 *   node scripts/capture-ngo-registry.mjs /tmp/rnong.jsonl
 *   NGO_API_URL=https://… node scripts/capture-ngo-registry.mjs /tmp/rnong.jsonl
 *
 * Sequential on purpose: ~1,400 pages at about a third of a second each.
 */
import { createWriteStream } from 'node:fs'

const API_URL = process.env.NGO_API_URL ?? 'https://dev-chronos-api.transparenta.eu/api/v1/graphql'
const output = process.argv[2]
if (!output) {
  console.error('usage: node scripts/capture-ngo-registry.mjs <output.jsonl>')
  process.exit(1)
}

const QUERY = `query CaptureNgoRegistry($first: Int!, $after: String) {
  ngoRegistryRecords(first: $first, after: $after) {
    edges { node {
      id registryNumber name nameWithheld category legalForm court
      sourceRegistryStatus sourceRegistrationDate county locality
      sourceCui linkedOrganizationCui isBranch sourceReportsPublicUtility
    } }
    pageInfo { hasNextPage endCursor }
    snapshot { id recordCount capturedAt sourceUrl }
  }
}`

async function page(after, attempt = 1) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { first: 100, after } }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = await response.json()
    if (body.errors?.length) throw new Error(body.errors.map((error) => error.message).join('; '))
    return body.data.ngoRegistryRecords
  } catch (error) {
    if (attempt >= 5) throw error
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    return page(after, attempt + 1)
  }
}

const out = createWriteStream(output)
let after = null
let rows = 0
let snapshot = null
for (;;) {
  const connection = await page(after)
  snapshot ??= connection.snapshot
  for (const edge of connection.edges) out.write(`${JSON.stringify(edge.node)}\n`)
  rows += connection.edges.length
  if (rows % 10_000 < 100) console.error(`${rows} / ${snapshot.recordCount}`)
  if (!connection.pageInfo.hasNextPage) break
  after = connection.pageInfo.endCursor
}
out.end()
console.error(JSON.stringify({ rows, snapshot }))
if (rows !== snapshot.recordCount) {
  console.error(`read ${rows} rows but the snapshot declares ${snapshot.recordCount}`)
  process.exit(2)
}
