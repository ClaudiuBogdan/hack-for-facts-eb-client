/**
 * Integration tests for one controlling authority's portfolio
 * (`/public-enterprises/authorities/$cui`). The page reads no API: the server
 * renders it from the snapshot the generator writes, and a client-side
 * navigation fetches the authority's part from the page's own JSON route. So
 * these tests hold the page to its structure, its address and its ways in, on
 * the committed snapshot — never to a figure the next regeneration changes.
 * Consiliul Local Sibiu (4270740) has its enterprises in ANAF's list, and the
 * announcements name another authority for Tursib.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { Page } from '@playwright/test'

const ROUTE = '/public-enterprises/authorities/4270740'

const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams)

test.describe('Authority portfolio — the server render', () => {
  test('the page draws its head, its sources’ panel and the table, from the server', async ({ page }) => {
    const response = await page.goto(ROUTE)
    expect(response?.status()).toBe(200)
    expect(response?.headers()['cache-control'] ?? '').toMatch(/s-maxage=3600/u)
    await waitForPageReady(page)

    await expect(page).toHaveTitle(/^Consiliul Local Sibiu: întreprinderile publice — Transparenta\.eu$/u)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Consiliul Local Sibiu')
    await expect(page.getByText(/După lista ANAF a întreprinderilor publice, controlează \d+ întreprinderi\./u)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Ce spune fiecare sursă' })).toBeVisible()
    await expect(page.locator('section#intreprinderi table tbody tr').first()).toBeVisible()
    await expect(page.locator('section#surse')).toContainText('Tursib')

    const html = await (await page.request.get(ROUTE)).text()
    expect(html).toMatch(/<link rel="canonical" href="[^"]*\/public-enterprises\/authorities\/4270740"/u)
    expect(html).toContain('id="intreprinderi"')
  })

  test('the server’s nodes survive hydration, and the browser reads nothing', async ({ page }) => {
    await page.addInitScript(() => {
      const caught: Element[] = []
      ;(window as unknown as { __serverNodes: Element[] }).__serverNodes = caught
      new MutationObserver((records, observer) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node instanceof Element && (node.matches('h1') || node.matches('section#intreprinderi'))) caught.push(node)
          }
        }
        if (caught.length >= 2) observer.disconnect()
      }).observe(document, { childList: true, subtree: true })
    })
    const reads: string[] = []
    page.on('request', (request) => {
      if (/portfolio\.json|\/graphql(?:[?#]|$)/u.test(request.url())) reads.push(request.url())
    })
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await page.waitForTimeout(1000)
    expect(reads).toEqual([])
    const kept = await page.evaluate(() => {
      const caught = (window as unknown as { __serverNodes: Element[] }).__serverNodes
      return { caught: caught.length, kept: caught.filter((node) => document.contains(node)).length }
    })
    expect(kept).toEqual({ caught: 2, kept: 2 })
  })

  test('the JSON route serves the authority’s part, for GET and HEAD, and a 404 for one the snapshot does not hold', async ({ page }) => {
    const part = await page.request.get(`${ROUTE}/portfolio.json`)
    expect(part.status()).toBe(200)
    expect(part.headers()['x-robots-tag']).toBe('noindex')
    expect((await page.request.head(`${ROUTE}/portfolio.json`)).status()).toBe(200)
    expect((await page.request.get('/public-enterprises/authorities/0123/portfolio.json')).status()).toBe(404)
    const body = (await part.json()) as { readonly authority: { readonly cui: string }; readonly enterprises: readonly unknown[] }
    expect(body.authority.cui).toBe('4270740')
    expect(body.enterprises.length).toBeGreaterThan(0)
    expect((await page.request.get('/public-enterprises/authorities/99999999/portfolio.json')).status()).toBe(404)
  })
})

test.describe('Authority portfolio — the address', () => {
  test('the table’s order and filter are written in the address, the defaults left out', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    const table = page.locator('section#intreprinderi')
    await table.getByRole('button', { name: /Salariați/u }).click()
    await expect.poll(() => params(page).ordine).toBe('salariati')
    await table.getByRole('radio', { name: 'Inactive', exact: true }).click()
    await expect.poll(() => params(page).lista).toBe('inactive')
    await table.getByRole('radio', { name: 'Toate', exact: true }).click()
    await expect.poll(() => params(page).lista).toBeUndefined()
  })

  test('a choice it cannot read opens the default', async ({ page }) => {
    await page.goto(`${ROUTE}?lista=nimic&ordine=pierdere`)
    await waitForPageReady(page)
    await expect(page.locator('section#intreprinderi').getByRole('radio', { name: 'Toate', exact: true })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('section#intreprinderi').getByRole('columnheader', { name: /Cifra de afaceri/u })).toHaveAttribute('aria-sort', 'descending')
  })
})

test.describe('Authority portfolio — the ways in', () => {
  test('an authority the snapshot does not hold, or a path that is not a CUI, is a 404 in the page’s own frame, not indexed', async ({ page }) => {
    const response = await page.goto('/public-enterprises/authorities/99999999')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Nicio întreprindere publică sub această autoritate' })).toBeVisible()
    // A path the params reject fails before the page's lazy file loads: it still lands on the page's own not-found page.
    const rejected = await page.goto('/public-enterprises/authorities/04270740')
    expect(rejected?.status()).toBe(404)
    await expect(page.getByText('Adresa nu numește un CUI.')).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/u)
  })

  test('the bare authorities address leads to the hub’s band of who controls them', async ({ page }) => {
    const response = await page.request.get('/public-enterprises/authorities?lang=en', { maxRedirects: 0 })
    expect(response.status()).toBe(302)
    expect(response.headers().location).toMatch(/\/public-enterprises\?lang=en#control$/u)
  })

  test('the hub’s authority rows open the portfolio, read in the browser', async ({ page }) => {
    await page.goto('/public-enterprises')
    await waitForPageReady(page)
    const reads: string[] = []
    page.on('request', (request) => {
      if (/portfolio\.json/u.test(request.url())) reads.push(request.url())
    })
    const first = page.getByRole('region', { name: 'Cine controlează cele mai multe' }).getByRole('link').first()
    const href = await first.getAttribute('href')
    expect(href).toMatch(/^\/public-enterprises\/authorities\/\d+$/u)
    await first.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`, 'u'))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('section#intreprinderi table tbody tr').first()).toBeVisible()
    // One read, of this snapshot's copy.
    expect(reads).toHaveLength(1)
    expect(reads[0]).toMatch(/portfolio\.json\?v=/u)
  })
})
