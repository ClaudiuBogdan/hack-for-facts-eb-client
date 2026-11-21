// Parliament screens (docs/design/parliament-skin-tokens.md): light pairs (base :3021 vs working tree :3031) for a
// pixel diff, and dark text samples on :3031 for a contrast sweep. Analyse with pxdiff.py and darkcheck.py.
//
// Base: a worktree of the pre-change commit served with `npx vite --mode chronos-server --port 3021 --strictPort`;
// working tree: the same on :3031. Restart :3031 before a capture: the dev server can keep serving a stale module.
//
//   node screens.mjs <outDir> [routes.json] [--only=substr,substr] [--widths=390,1440]
//
// routes.json is written on the first run (list pages + the first detail page of each kind and its tabs, resolved on
// the base server) and reused afterwards so every run compares the same URLs.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const { chromium } = createRequire(path.join(repo, 'package.json'))('@playwright/test')

const [outDir, routesArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const only = flag('only')?.split(',')
const widths = (flag('widths') ?? '390,1440').split(',').map(Number)
const BASE = 'http://127.0.0.1:3021'
const NEW = 'http://127.0.0.1:3031'
const routesFile = routesArg ?? path.join(outDir, '..', 'routes.json')
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()

async function context(theme, width, origin) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  await ctx.addCookies([{ name: 'ui-theme', value: theme, url: origin }])
  // An essential-only decision, so the consent banner never covers the page.
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('cookie-consent', JSON.stringify({ version: 1, essential: true, analytics: false, sentry: false, updatedAt: '2026-11-21T00:00:00.000Z' }))
    } catch {}
  })
  return ctx
}

async function settle(page, url) {
  // The mouse starts at (0, 0), over the app's sidebar, which then expands on hover at its own pace: park it.
  await page.mouse.move(page.viewportSize().width - 2, page.viewportSize().height - 2)
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important }' })
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
  })
  // Client reads finish after networkidle on a cold dev server: wait until no skeleton is left in main.
  await page.waitForFunction(() => !document.querySelector('main .animate-pulse, main [aria-busy="true"]'), null, { timeout: 45000 }).catch(() => {})
  await page.waitForTimeout(600)
  // Cookie banners and toasts are not parliament's: hide anything fixed outside main.
  await page.addStyleTag({ content: '[role="dialog"][aria-label*="ookie" i], [data-sonner-toaster] { display: none !important }' })
}

async function resolveRoutes() {
  if (fs.existsSync(routesFile)) return JSON.parse(fs.readFileSync(routesFile, 'utf8'))
  const ctx = await context('light', 1440, BASE)
  // A fresh page per navigation: the dev server serves every module unbundled, and one long-lived page runs out of
  // request slots (ERR_INSUFFICIENT_RESOURCES).
  const open = async (url) => {
    const page = await ctx.newPage()
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })
    return page
  }
  const lists = ['/parlament', '/parlament/voturi', '/parlament/proiecte', '/parlament/membri', '/parlament/grupuri', '/parlament/comisii', '/parlament/agenda', '/parlament/stenograme']
  const routes = [...lists]
  for (const [list, prefix] of [
    ['/parlament/voturi', '/parlament/voturi/'],
    ['/parlament/proiecte', '/parlament/proiecte/'],
    ['/parlament/membri', '/parlament/membri/'],
    ['/parlament/grupuri', '/parlament/grupuri/'],
    ['/parlament/comisii', '/parlament/comisii/'],
    ['/parlament/stenograme', '/parlament/stenograme/'],
  ]) {
    const listPage = await open(BASE + list)
    const detail = await listPage.evaluate((p) => [...document.querySelectorAll(`main a[href^="${p}"]`)].map((a) => new URL(a.href).pathname).find((h) => h.length > p.length), prefix)
    await listPage.close()
    if (!detail) continue
    routes.push(detail)
    const detailPage = await open(BASE + detail)
    const tabs = await detailPage.evaluate((d) => [...new Set([...document.querySelectorAll(`a[href^="${d}/"]`)].map((a) => new URL(a.href).pathname))], detail)
    await detailPage.close()
    routes.push(...tabs.filter((t) => t.split('/').length === detail.split('/').length + 1).slice(0, 6))
  }
  routes.push('/parlament/voturi/does-not-exist-000', '/')
  fs.writeFileSync(routesFile, JSON.stringify(routes, null, 1))
  await ctx.close()
  return routes
}

const slug = (route) => (route === '/' ? 'landing' : route.replace(/^\//, '').replace(/[^\w-]+/g, '_')).slice(0, 90)

/** Light: full page + focus + hover, on both servers. */
async function lightPair(route, width, attempt = 1) {
  const heights = []
  for (const [tag, origin] of [['base', BASE], ['new', NEW]]) {
    const ctx = await context('light', width, origin)
    const page = await ctx.newPage()
    await settle(page, origin + route)
    // The app shell is not parliament: hide its sidebar and anything fixed outside main, and record main's box so
    // pxdiff compares only that.
    const box = await page.evaluate(() => {
      for (const el of document.querySelectorAll('[data-sidebar], body *')) {
        if (el.closest('main')) continue
        if (el.hasAttribute('data-sidebar') || getComputedStyle(el).position === 'fixed') el.style.setProperty('visibility', 'hidden', 'important')
      }
      const r = document.querySelector('main')?.getBoundingClientRect()
      return r ? { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } : null
    })
    fs.writeFileSync(`${outDir}/light.${slug(route)}.${width}.${tag}.main.json`, JSON.stringify(box))
    heights.push(await page.evaluate(() => document.documentElement.scrollHeight))
    await page.screenshot({ path: `${outDir}/light.${slug(route)}.${width}.${tag}.full.png`, fullPage: true })
    // Focus inside the page, not the app shell: the first focusable in main, then two more.
    await page.locator('main a[href], main button, main input, main [tabindex="0"]').first().focus().catch(() => {})
    for (let i = 0; i < 2; i++) await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${outDir}/light.${slug(route)}.${width}.${tag}.focus.png` })
    const card = page.locator('main a[href^="/parlament/"]').first()
    if (await card.count()) {
      await card.scrollIntoViewIfNeeded().catch(() => {})
      await card.hover({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(250)
      await page.screenshot({ path: `${outDir}/light.${slug(route)}.${width}.${tag}.hover.png` })
    }
    await ctx.close()
  }
  // Data that arrived late on one server makes the pages different lengths: take the pair again once.
  if (heights[0] !== heights[1] && attempt === 1) await lightPair(route, width, 2)
}

/** Dark: per viewport, a text-hidden shot and each text node's rect, colour (as rgba) and opacity chain. */
async function darkSamples(route, width) {
  const ctx = await context('dark', width, NEW)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)))
  await settle(page, NEW + route)
  await page.screenshot({ path: `${outDir}/dark.${slug(route)}.${width}.full.png`, fullPage: true })
  const meta = []
  const seen = new Set()
  const height = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0, idx = 0; y < height; y += 800) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(200)
    const rects = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const c2d = canvas.getContext('2d', { willReadFrequently: true })
      const rgba = (css) => {
        c2d.clearRect(0, 0, 1, 1)
        c2d.fillStyle = '#000'
        c2d.fillStyle = css
        c2d.fillRect(0, 0, 1, 1)
        return [...c2d.getImageData(0, 0, 1, 1).data]
      }
      const out = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      let n
      while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue
        const el = n.parentElement
        if (!el.closest('main') && !el.closest('[data-parliament-promo]')) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.display === 'none') continue
        const range = document.createRange()
        range.selectNodeContents(n)
        const b = range.getBoundingClientRect()
        if (b.width < 3 || b.height < 6 || b.top < 0 || b.bottom > innerHeight || b.left < 0 || b.right > innerWidth) continue
        let op = 1
        for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity
        if (op < 0.05) continue
        const cls = (el.getAttribute('class') ?? '').slice(0, 160)
        out.push({ text: n.textContent.trim().slice(0, 40), x: b.left, y: b.top, w: b.width, h: b.height, size: parseFloat(cs.fontSize), weight: +cs.fontWeight, fg: rgba(el.closest('svg') && cs.fill && cs.fill !== 'none' && !cs.fill.startsWith('url(') ? cs.fill : cs.color), op, cls, key: n.textContent.trim().slice(0, 40) + Math.round(b.top + scrollY) + Math.round(b.left) })
      }
      return out
    })
    const fresh = rects.filter((r) => !seen.has(r.key))
    fresh.forEach((r) => seen.add(r.key))
    if (!fresh.length) continue
    const hide = await page.addStyleTag({ content: '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}' })
    await page.waitForTimeout(120)
    await page.screenshot({ path: `${outDir}/dark.${slug(route)}.${width}.${idx}.bg.png` })
    await hide.evaluate((e) => e.remove())
    meta.push({ idx, rects: fresh })
    idx++
  }
  fs.writeFileSync(`${outDir}/dark.${slug(route)}.${width}.json`, JSON.stringify({ route, width, errors, meta }))
  await ctx.close()
}

const routes = (await resolveRoutes()).filter((r) => !only || only.some((o) => r.includes(o)))
for (const route of routes) {
  for (const width of widths) {
    try {
      await lightPair(route, width)
      await darkSamples(route, width)
      console.log('ok', route, width)
    } catch (e) {
      console.log('FAIL', route, width, e.message.slice(0, 160))
    }
  }
}
await browser.close()
