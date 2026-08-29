/**
 * Regression guard: a user's raw search query must never reach telemetry.
 *
 * Three call sites shipped it before 2026-08-26
 * (SEARCH_LAYER_REVIEW_2026-08-25.md F15) — `logger.info` becomes a Sentry
 * BREADCRUMB and `logger.error` a full Sentry EVENT, so both left the browser:
 *
 *   entities.ts  logger.info("Searching entities", { searchTerm, ... })
 *   entities.ts  logger.error("Error searching entities", { error, searchTerm })
 *   graphql.ts   logger.info("Making GraphQL request", { query, variables })
 *
 * The last one sat on the SHARED legacy transport, so it leaked every variable
 * of every legacy caller, not just search.
 *
 * These assert on the SOURCE rather than by spying on the logger: the leak is a
 * property of what the call site passes, and a spy would only cover the paths a
 * test happens to drive. Reading the text catches a reintroduction anywhere in
 * these two files, including on a branch no test exercises.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, it, expect } from 'vitest'

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')

const ENTITIES_SRC = read('./entities.ts')
const GRAPHQL_SRC = read('./graphql.ts')

/** Every `logger.<level>(...)` call in a source file, as text. */
const loggerCalls = (src: string): readonly string[] =>
  [...src.matchAll(/logger\.(?:info|warn|error|debug)\([\s\S]*?\)\s*;/gu)].map(
    (m) => m[0],
  )

/**
 * Does this call pass `name` as a VALUE — shorthand `{ name }` or `{ k: name }`?
 *
 * Deliberately not a bare substring check: `Object.keys(variables)` mentions the
 * identifier while shipping only the key names, which is the allowed form. What
 * leaks is the value itself.
 */
const passesValue = (call: string, name: string): boolean =>
  new RegExp(String.raw`[{,]\s*${name}\s*[,}]`, 'u').test(call) ||
  new RegExp(String.raw`:\s*${name}\s*[,}]`, 'u').test(call)

describe('search telemetry carries no user query text', () => {
  it('finds the logger calls it is supposed to be checking', () => {
    // A regex that matched nothing would make every assertion below vacuous.
    expect(loggerCalls(ENTITIES_SRC).length).toBeGreaterThan(0)
    expect(loggerCalls(GRAPHQL_SRC).length).toBeGreaterThan(0)
  })

  it('never passes the raw searchTerm to the logger', () => {
    for (const call of loggerCalls(ENTITIES_SRC)) {
      // `queryLength: searchTerm.length` is fine; the bare value is not.
      expect(passesValue(call, 'searchTerm')).toBe(false)
    }
  })

  it('never passes GraphQL variables or the query document to the logger', () => {
    for (const call of loggerCalls(GRAPHQL_SRC)) {
      // `Object.keys(variables)` is allowed — names correlate a request, values
      // ARE the request.
      expect(passesValue(call, 'variables')).toBe(false)
      expect(passesValue(call, 'query')).toBe(false)
    }
  })

  it('still logs something useful — length and operation name', () => {
    // The fix must not be "delete the log line": losing the diagnostic entirely
    // would pass every assertion above while making outages harder to debug.
    expect(ENTITIES_SRC).toContain('queryLength: searchTerm.length')
    expect(GRAPHQL_SRC).toContain('operation: operationName(query)')
    expect(GRAPHQL_SRC).toContain('variableKeys')
  })
})
