#!/usr/bin/env node
// Summarise a Chrome trace written by perf-run.mjs (trace-cold.trace.json): main-thread self time by
// activity, the scripts that cost the most main-thread time, and the longest tasks.
//   node trace-summary.mjs <trace-cold.json> [--top 15]
import fs from 'node:fs'

const file = process.argv[2]
const TOP = Number(process.argv[process.argv.indexOf('--top') + 1]) || 15
if (!file) {
  console.error('usage: trace-summary.mjs <trace.json> [--top 15]')
  process.exit(2)
}
const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
const events = Array.isArray(raw) ? raw : raw.traceEvents

// Renderer main thread of the page: the CrRendererMain thread with the most complete events.
const threadNames = new Map()
for (const e of events) if (e.ph === 'M' && e.name === 'thread_name') threadNames.set(`${e.pid}:${e.tid}`, e.args.name)
const counts = new Map()
for (const e of events) {
  const key = `${e.pid}:${e.tid}`
  if (threadNames.get(key) === 'CrRendererMain' && (e.ph === 'X' || e.ph === 'B')) counts.set(key, (counts.get(key) ?? 0) + 1)
}
const mainKey = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
if (!mainKey) {
  console.error('no renderer main thread found')
  process.exit(1)
}

// Build complete intervals (X, and B/E pairs) on the main thread.
const intervals = []
const open = []
for (const e of events) {
  if (`${e.pid}:${e.tid}` !== mainKey) continue
  if (e.ph === 'X' && e.dur != null) intervals.push({ name: e.name, ts: e.ts, end: e.ts + e.dur, args: e.args })
  else if (e.ph === 'B') open.push(e)
  else if (e.ph === 'E') {
    const b = open.pop()
    if (b) intervals.push({ name: b.name, ts: b.ts, end: e.ts, args: b.args })
  }
}
intervals.sort((a, b) => a.ts - b.ts || b.end - a.end)

const urlOf = (iv) => iv.args?.data?.url || iv.args?.data?.scriptName || iv.args?.data?.sourceURL || iv.args?.fileName || null
const isTask = (n) => n === 'RunTask' || n === 'ThreadControllerImpl::RunTask'
const t0 = intervals.find((iv) => iv.name === 'ParseHTML' || isTask(iv.name))?.ts ?? intervals[0]?.ts ?? 0

// Self time per name and per script URL (inherited from the nearest ancestor with a URL).
const selfByName = new Map()
const selfByUrl = new Map()
const stack = []
const tasks = []
for (const iv of intervals) {
  while (stack.length && stack.at(-1).end <= iv.ts) stack.pop()
  const parent = stack.at(-1)
  iv.self = iv.end - iv.ts
  iv.url = urlOf(iv) ?? parent?.url ?? null
  iv.task = isTask(iv.name) && !parent ? iv : parent?.task ?? null
  if (parent) parent.self -= iv.end - iv.ts
  if (isTask(iv.name) && !parent) {
    iv.children = new Map()
    tasks.push(iv)
  }
  stack.push(iv)
}
for (const iv of intervals) {
  if (iv.self <= 0) continue
  selfByName.set(iv.name, (selfByName.get(iv.name) ?? 0) + iv.self)
  if (iv.url && !isTask(iv.name)) selfByUrl.set(iv.url, (selfByUrl.get(iv.url) ?? 0) + iv.self)
  if (iv.task && iv.task !== iv) iv.task.children.set(iv.name, (iv.task.children.get(iv.name) ?? 0) + iv.self)
}

const ms = (us) => (us / 1000).toFixed(1)
const busy = tasks.reduce((s, t) => s + (t.end - t.ts), 0)
console.log(`trace: ${file}`)
console.log(`main thread ${mainKey}: ${tasks.length} top-level tasks, ${ms(busy)} ms busy`)
console.log(`\nself time by activity (top ${TOP}):`)
for (const [name, us] of [...selfByName.entries()].filter(([n]) => !isTask(n)).sort((a, b) => b[1] - a[1]).slice(0, TOP)) console.log(`  ${ms(us).padStart(8)} ms  ${name}`)
console.log(`\nmain-thread time by script (top ${TOP}):`)
for (const [url, us] of [...selfByUrl.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP)) console.log(`  ${ms(us).padStart(8)} ms  ${url.replace(/^https?:\/\/[^/]+/, '')}`)
console.log(`\nlongest tasks (top ${TOP}), start relative to the first parse/task:`)
for (const t of [...tasks].sort((a, b) => b.end - b.ts - (a.end - a.ts)).slice(0, TOP)) {
  const parts = [...t.children.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, us]) => `${n} ${ms(us)}`)
  const scripts = [...new Set(intervals.filter((iv) => iv.task === t && iv.url).map((iv) => iv.url.replace(/^https?:\/\/[^/]+/, '')))].slice(0, 3)
  console.log(`  ${ms(t.end - t.ts).padStart(8)} ms @ ${ms(t.ts - t0)} ms  ${parts.join(', ')}${scripts.length ? `  [${scripts.join(' ')}]` : ''}`)
}
