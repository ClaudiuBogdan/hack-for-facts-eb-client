#!/usr/bin/env node
// Medians of one measure-local.sh cycle as a markdown table, or before -> after when a second cycle is given.
//   node fixes-table.mjs <out-dir> [<before-dir>]
// Reads every <dir>/<domain>/<slug>-<profile>/summary.json (cold loads).
import fs from 'node:fs'
import path from 'node:path'

const [afterDir, beforeDir] = process.argv.slice(2)
if (!afterDir) {
  console.error('usage: fixes-table.mjs <out-dir> [<before-dir>]')
  process.exit(2)
}

const summaries = (dir) => {
  const found = new Map()
  for (const domain of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue
    for (const run of fs.readdirSync(path.join(dir, domain.name), { withFileTypes: true })) {
      const file = path.join(dir, domain.name, run.name, 'summary.json')
      if (run.isDirectory() && fs.existsSync(file)) found.set(`${domain.name}/${run.name}`, JSON.parse(fs.readFileSync(file, 'utf8')))
    }
  }
  return found
}

const COLUMNS = [
  ['TTFB s', 'ttfb', 's'],
  ['FCP s', 'fcp', 's'],
  ['LCP s', 'lcp', 's'],
  ['TBT s', 'tbt', 's'],
  ['CLS', 'cls', 'cls'],
  ['hydrated s', 'hydrationEnd', 's'],
  ['JS KB', 'jsTransferBytes', 'kb'],
  ['bytes KB', 'transferBytes', 'kb'],
  ['req', 'requests', 'n'],
  ['API', 'apiCalls', 'n'],
]
const fmt = (v, kind) => {
  if (v == null) return '–'
  if (kind === 's') return (v / 1000).toFixed(2)
  if (kind === 'kb') return String(Math.round(v / 1024))
  if (kind === 'cls') return v.toFixed(3)
  return String(v)
}

const after = summaries(afterDir)
const before = beforeDir ? summaries(beforeDir) : null
const out = [`| page | profile | ${COLUMNS.map((c) => c[0]).join(' | ')} |`, `|---|---|${COLUMNS.map(() => '---:').join('|')}|`]
const order = { mobile: 0, desktop: 1 }
const keys = [...after.keys()].sort((a, b) => {
  const [pa, qa] = [after.get(a).url, order[after.get(a).profile]]
  const [pb, qb] = [after.get(b).url, order[after.get(b).profile]]
  return pa === pb ? qa - qb : pa.localeCompare(pb)
})
for (const key of keys) {
  const a = after.get(key)
  const b = before?.get(key)
  const cells = COLUMNS.map(([, field, kind]) => {
    const now = fmt(a.cold[field], kind)
    if (!before) return now
    return `${fmt(b?.cold[field], kind)} → ${now}`
  })
  const flags = [a.cold.navErrors?.length ? ' ⚠ nav error' : '', a.cold.hitCap ? ' ⚑ cap' : ''].join('')
  out.push(`| \`${new URL(a.url).pathname}\`${flags} | ${a.profile} | ${cells.join(' | ')} |`)
}
console.log(out.join('\n'))
