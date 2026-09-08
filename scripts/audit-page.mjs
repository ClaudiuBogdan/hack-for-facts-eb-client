#!/usr/bin/env node
/**
 * Audit one page for accessibility, from the command line.
 *
 *   node scripts/audit-page.mjs <url> [--scope <selector>] [--theme light|dark|both]
 *
 * Example:
 *   node scripts/audit-page.mjs 'http://localhost:3311/development/landing/home-refs?v=landing' \
 *     --scope '[data-dev-marker]'
 *
 * Runs axe-core in the Playwright Chromium this repo already installs, and
 * prints the violations grouped by rule. Exits non-zero if any are found inside
 * the scope, so it can gate something later if that is ever wanted.
 *
 * ## Two things it does that a naive run does not, both of which changed the answer
 *
 * **It settles the animations.** This app reveals blocks on scroll, and axe
 * files an element caught mid-fade as `incomplete` rather than as a violation.
 * Auditing the landing page without settling reported 3 colour-contrast
 * failures; with `prefers-reduced-motion` forced, so every entrance is at its
 * final opacity, the same page reported 21. So the browser is launched with
 * reduced motion, and the page is scrolled to the bottom and back first to
 * trigger anything that only arrives on approach.
 *
 * **It scopes.** A prototype under `/development/*` renders inside the real
 * application shell, so most of what axe finds belongs to the sidebar and the
 * shell footer rather than to the thing under test. `--scope` takes a selector
 * and reports only what is inside it, with the rest summarised separately so it
 * is not silently dropped.
 *
 * ## What it is not
 *
 * Accessibility, not performance. A Vite dev server serves unminified modules
 * with no compression, so timings and byte counts measured against it mean
 * nothing; for those, build and serve the production output. Markup and colour
 * are trustworthy in dev, which is what this checks.
 *
 * And automated coverage is partial. Deque's own figure for axe-core is about
 * 57% of WCAG issues on their dataset — a detection rate, not a compliance
 * score. Keyboard order, focus restoration, whether a screen reader's
 * announcement makes sense, and whether an animation is disorienting are all
 * outside what any of this can see.
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const AXE_URL = 'https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js'
const AXE_PATH = 'tmp/audit/axe.min.js'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--'))
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

if (!url) {
  console.error('usage: node scripts/audit-page.mjs <url> [--scope <selector>] [--theme light|dark|both]')
  process.exit(2)
}

const scope = flag('scope', null)
const themeArg = flag('theme', 'both')
const themes = themeArg === 'both' ? ['light', 'dark'] : [themeArg]

/** Downloaded once and cached, so repeat runs need no network. */
async function ensureAxe() {
  if (existsSync(AXE_PATH)) return
  mkdirSync('tmp/audit', { recursive: true })
  const res = await fetch(AXE_URL)
  if (!res.ok) throw new Error(`could not fetch axe-core: ${res.status}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(AXE_PATH))
}

async function audit(browser, theme) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    // the reason the numbers are right — see the note at the top
    reducedMotion: 'reduce',
  })
  await page.goto(url, { waitUntil: 'networkidle' })
  const consent = page.getByRole('button', { name: /Permite doar esen|Accept/i })
  if (await consent.count()) await consent.first().click().catch(() => {})
  if (theme === 'dark') await page.evaluate(() => document.documentElement.classList.add('dark'))
  // reach everything that only arrives when scrolled to
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(600)
  await page.addScriptTag({ path: AXE_PATH })

  const result = await page.evaluate(
    async ({ tags, scope }) => {
      const res = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } })
      const root = scope ? document.querySelector(scope) : null
      const inScope = []
      const outOfScope = {}
      for (const v of res.violations) {
        for (const n of v.nodes) {
          const el = document.querySelector(n.target[0])
          const mine = !scope || (root && el && root.contains(el))
          if (!mine) {
            outOfScope[v.id] = (outOfScope[v.id] || 0) + 1
            continue
          }
          const data = n.any?.[0]?.data
          inScope.push({
            id: v.id,
            impact: v.impact,
            help: v.help,
            target: String(n.target[0]).slice(0, 100),
            text: (el?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
            ratio: data?.contrastRatio ?? null,
          })
        }
      }
      return { version: window.axe.version, inScope, outOfScope, incomplete: res.incomplete.length }
    },
    { tags: TAGS, scope },
  )
  await page.close()
  return result
}

await ensureAxe()
const browser = await chromium.launch()
const report = {}
let failed = 0

for (const theme of themes) {
  const r = await audit(browser, theme)
  report[theme] = r
  const grouped = {}
  for (const v of r.inScope) (grouped[v.id] ??= []).push(v)
  failed += r.inScope.length

  console.log(`\n===== ${theme.toUpperCase()} =====  axe-core ${r.version}`)
  console.log(`  ${r.inScope.length} violation node(s)${scope ? ` inside ${scope}` : ''}`)
  for (const [id, items] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)) {
    const worst = items.map((i) => i.ratio).filter(Boolean).sort((a, b) => a - b)[0]
    console.log(`\n  [${items[0].impact}] ${id} — ${items.length}${worst ? `  worst ratio ${worst}:1` : ''}`)
    console.log(`    ${items[0].help}`)
    for (const i of items.slice(0, 5)) console.log(`      ${i.target}  "${i.text}"`)
    if (items.length > 5) console.log(`      … and ${items.length - 5} more`)
  }
  const outside = Object.entries(r.outOfScope)
  if (outside.length)
    console.log(
      `\n  outside the scope (app shell, not audited here): ` +
        outside.map(([k, n]) => `${k}:${n}`).join(' '),
    )
}

mkdirSync('tmp/audit', { recursive: true })
writeFileSync('tmp/audit/report.json', JSON.stringify(report, null, 1))
console.log('\nfull report: tmp/audit/report.json')
await browser.close()
process.exit(failed > 0 ? 1 : 0)
