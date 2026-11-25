#!/usr/bin/env node
/**
 * Which integration specs let a GraphQL read reach the API? (TEST-001)
 *
 * Reads Playwright `--reporter=list` output (CI's integration shard logs, or a local run) and gives
 * each "[mockApi] No mock found for operation: X" warning to the next test result printed after it,
 * the test it ran in. That holds when one worker runs the tests one after another, as each CI shard
 * does. Prints, per spec file, the operations, how many reads, and in which tests.
 *
 * A lower bound: a test that never calls `mockGraphQL` has no GraphQL route, so its reads go out
 * without a warning and are not counted here. Read a log, not a raw terminal capture: in a TTY the
 * reporter's cursor controls can put two results on one line, and a title then takes the next one in.
 *
 * Usage:
 *   gh api repos/{owner}/{repo}/actions/jobs/<job id>/logs > shard.log
 *   node scripts/find-unmocked-graphql-reads.mjs shard-1.log shard-2.log ...
 */
import { readFileSync } from 'node:fs'

const WARNING = /\[mockApi\] No mock found for operation: (\w+)/
// A result line: passed ✓, failed ✘ or skipped -, with a duration in ms, s or m (none when skipped).
const RESULT = /[✓✘-]\s+\d+ \[integration\] › (tests\/integration\/[^:]+):\d+:\d+ › (.+?)(?: \(retry #\d+\))?(?: \([\d.]+(?:ms|s|m)\))?\s*$/
// Colour codes, when the reporter wrote to a terminal or FORCE_COLOR was set.
const ANSI = /\x1b\[[0-9;]*m/g

const bySpec = new Map()
let total = 0
for (const path of process.argv.slice(2)) {
  let pending = []
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.replace(ANSI, '').replace(/^\S+Z /, '')
    const warning = WARNING.exec(line)
    if (warning) {
      pending.push(warning[1])
      continue
    }
    const result = RESULT.exec(line)
    if (!result) continue
    const [, spec, title] = result
    for (const operation of pending) {
      const operations = bySpec.get(spec) ?? new Map()
      const entry = operations.get(operation) ?? { reads: 0, tests: new Set() }
      entry.reads += 1
      entry.tests.add(title)
      operations.set(operation, entry)
      bySpec.set(spec, operations)
      total += 1
    }
    pending = []
  }
}

for (const spec of [...bySpec.keys()].sort()) {
  console.log(spec)
  for (const [operation, { reads, tests }] of [...bySpec.get(spec)].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${operation}: ${reads} read(s) in ${tests.size} test(s)`)
    for (const title of [...tests].sort()) console.log(`    - ${title}`)
  }
}
console.log(`${total} unmocked read(s) in ${bySpec.size} spec file(s)`)
process.exitCode = total > 0 ? 1 : 0
