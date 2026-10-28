#!/usr/bin/env node
// Full-page screenshots for the visual check of a fix: mobile and desktop, no throttling, pages without people only.
//   node screenshot.mjs <base-url> <out-dir> <pages-file>
// Waits for the load event, then for the network to go quiet (at most 15 s), so hydrated content is in the picture.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../../../../package.json', import.meta.url))
const { chromium } = require('playwright')

const [base, outDir, pagesFile] = process.argv.slice(2)
if (!base || !outDir || !pagesFile) {
  console.error('usage: screenshot.mjs <base-url> <out-dir> <pages-file>')
  process.exit(2)
}
fs.mkdirSync(outDir, { recursive: true })
const pages = fs
  .readFileSync(pagesFile, 'utf8')
  .split('\n')
  .filter((line) => line.trim() && !line.startsWith('#'))
  .map((line) => line.split('|'))
  .filter(([, , people]) => people !== '1')

const PROFILES = {
  mobile: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36' },
  desktop: { viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36' },
}
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: process.env.PERF_SPKI ? [`--ignore-certificate-errors-spki-list=${process.env.PERF_SPKI}`] : [] })
let failed = 0
try {
  for (const [profile, options] of Object.entries(PROFILES)) {
    const context = await browser.newContext(options)
    for (const [, url] of pages) {
      const page = await context.newPage()
      const slug = url.replace(/^\//, '').replace(/\//g, '-') || 'home'
      try {
        await page.goto(base + url, { waitUntil: 'load', timeout: 60000 })
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
        await page.screenshot({ path: path.join(outDir, `${slug}-${profile}.png`), fullPage: true })
        console.log(`${slug}-${profile}.png`)
      } catch (error) {
        failed++
        console.error(`${url} ${profile}: ${error.message}`)
      }
      await page.close()
    }
    await context.close()
  }
} finally {
  await browser.close()
}
process.exit(failed ? 1 : 0)
