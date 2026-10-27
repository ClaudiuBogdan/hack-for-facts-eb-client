#!/usr/bin/env node
// Builds the README's per-domain results table from every evidence/<domain>/<target>/<slug>-<profile>/summary.json.
//   node aggregate.mjs [pages.txt]   -> markdown on stdout (one row per page × profile × target)
import fs from 'node:fs'
import path from 'node:path'

const HERE = path.dirname(new URL(import.meta.url).pathname)
const ROOT = path.dirname(HERE)
const pages = fs
  .readFileSync(process.argv[2] ?? path.join(HERE, 'pages.txt'), 'utf8')
  .split('\n')
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [domain, url] = line.split('|')
    const slug = url.replace(/^\//, '').replace(/\//g, '-') || 'home'
    return { domain, url, slug }
  })

const load = (domain, target, slug, profile) => {
  const file = path.join(ROOT, 'evidence', domain, target, `${slug}-${profile}`, 'summary.json')
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
}
const s = (ms) => (ms == null ? '–' : (ms / 1000).toFixed(ms >= 10000 ? 1 : 2))
const kb = (v) => (v == null ? '–' : String(Math.round(v / 1024)))

const out = []
out.push('| page | profile | target | TTFB s | FCP s | LCP s | CLS | TBT s | hydrated s | repeat LCP s | JS KB (zstd) | API calls | req |')
out.push('|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
for (const { url, domain, slug } of pages) {
  for (const profile of ['mobile', 'desktop']) {
    for (const target of ['deployed', 'local']) {
      const sum = load(domain, target, slug, profile)
      if (!sum) {
        out.push(`| \`${url}\` | ${profile} | ${target} | (missing) |||||||||| |`)
        continue
      }
      const c = sum.cold
      const w = sum.warm
      const cap = c.hitCap ? ' ⚑' : ''
      out.push(
        `| \`${url}\` | ${profile} | ${target} | ${s(c.ttfb)} | ${s(c.fcp)} | ${s(c.lcp)}${cap} | ${c.cls == null ? '–' : c.cls.toFixed(3)} | ${s(c.tbt)} | ${s(c.hydrationEnd)} | ${s(w.lcp)} | ${kb(c.jsTransferBytes)} | ${c.apiCalls ?? '–'} | ${c.requests ?? '–'} |`,
      )
    }
  }
}
console.log(out.join('\n'))
