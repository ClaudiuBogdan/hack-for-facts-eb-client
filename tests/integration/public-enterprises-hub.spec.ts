/**
 * Integration tests for the public enterprises' front door
 * (`/public-enterprises`). The page reads no API: its figures are a snapshot
 * kept in the client, rendered in full on the server. So these tests hold the
 * page to its structure and its address — the head, the figures, the bands in
 * the pinned bar's order, the choices it writes in the address, the retired
 * addresses that lead to it — never to a number the next snapshot changes.
 */

import type { Page } from '@playwright/test'
import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'

const ROUTE = '/public-enterprises'
const BANDS = ['control', 'judete', 'domenii', 'marime', 'stare', 'bani'] as const

const bar = (page: Page) => page.getByRole('navigation', { name: 'Secțiunile paginii' })
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams)

test.describe('Public enterprises — the server render', () => {
  test('the bare page draws its head, its figures and every band, in the pinned bar’s order', async ({ page }) => {
    const response = await page.goto(ROUTE)
    expect(response?.status()).toBe(200)
    await waitForPageReady(page)

    await expect(page).toHaveTitle(/^Întreprinderile publice din România/u)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Firmele statului')
    await expect(page.getByRole('region', { name: 'Cifre-cheie' })).toContainText('Întreprinderi publice')
    await expect(page.getByRole('region', { name: 'Cine controlează cele mai multe' }).getByRole('listitem').first()).toBeVisible()
    await expect(bar(page).getByRole('link')).toHaveCount(BANDS.length)
    for (const [position, id] of BANDS.entries()) {
      await expect(bar(page).getByRole('link').nth(position)).toHaveAttribute('href', `#${id}`)
      await expect(page.locator(`section#${id} h2`).first()).toBeVisible()
    }
    // The sources' line names its sources and the day the figures were read.
    await expect(page.getByText(/^Surse:/u)).toContainText('citite pe')
  })

  test('the server’s HTML carries the page, and its nodes survive hydration', async ({ page }) => {
    // The server's own HTML, before any script: the head and the bands are in it.
    const html = await (await page.request.get(ROUTE)).text()
    expect(html).toContain('Firmele statului')
    for (const id of BANDS) expect(html).toContain(`id="${id}"`)

    // The parser's nodes, caught as they are inserted (before the client's scripts run); hydration must keep them.
    await page.addInitScript(() => {
      const caught: Element[] = []
      ;(window as unknown as { __serverNodes: Element[] }).__serverNodes = caught
      new MutationObserver((records, observer) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node instanceof Element && (node.matches('h1') || node.matches('section#bani'))) caught.push(node)
          }
        }
        if (caught.length >= 2) observer.disconnect()
      }).observe(document, { childList: true, subtree: true })
    })
    await page.goto(ROUTE)
    await waitForPageReady(page)
    const kept = await page.evaluate(() => {
      const caught = (window as unknown as { __serverNodes: Element[] }).__serverNodes
      return { caught: caught.length, kept: caught.filter((node) => document.contains(node)).length }
    })
    expect(kept.caught).toBe(2)
    expect(kept.kept).toBe(2)
  })
})

test.describe('Public enterprises — in English', () => {
  test('the page reads in English at ?lang=en, its pinned bar’s labels and titles too', async ({ page }) => {
    await page.goto(`${ROUTE}?lang=en`)
    await waitForPageReady(page)

    await expect(page).toHaveTitle(/^Romania’s public enterprises/u)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('The companies of the state')
    await expect(page.locator('section#stare h2').first()).toContainText('Their status')
    await expect(page.getByRole('navigation', { name: 'Page sections' }).getByRole('link').nth(4)).toContainText('Status')
  })
})

test.describe('Public enterprises — the address', () => {
  test('the head’s ranking writes its group in the address, the default left out', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    const ranking = page.getByRole('region', { name: 'Cine controlează cele mai multe' })
    await ranking.getByRole('radio', { name: 'Județele' }).click()
    await expect.poll(() => params(page).autoritati).toBe('judete')
    await expect(ranking.getByRole('listitem').first()).toContainText(/Consiliul Judetean/iu)
    await ranking.getByRole('radio', { name: 'Statul' }).click()
    await expect.poll(() => params(page).autoritati).toBeUndefined()
  })

  test('a choice in the address is read as asked; one it cannot read opens the default', async ({ page }) => {
    await page.goto(`${ROUTE}?autoritati=local&marime=pierdere&judete=nimic`)
    await waitForPageReady(page)

    await expect(page.getByRole('region', { name: 'Cine controlează cele mai multe' }).getByRole('radio', { name: 'Locale' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('section#marime').getByRole('radio', { name: 'Pierdere' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('section#judete').getByRole('radio', { name: 'Toate' })).toHaveAttribute('aria-checked', 'true')
  })

  test('the counties band writes its population, and its map’s list follows', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    const counties = page.locator('section#judete')
    await counties.getByRole('radio', { name: 'Ale statului' }).click()
    await expect.poll(() => params(page).judete).toBe('centrale')
    await expect(counties).toContainText('Întreprinderi ale statului central, după sediu')
  })

  test('the largest enterprises open their company pages', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    const first = page.locator('section#marime ol a').first()
    await expect(first).toHaveAttribute('href', /^\/companies\/\d+$/u)
  })
})

test.describe('Public enterprises — the ways in', () => {
  test('the retired front door leads here for good, its language kept', async ({ page }) => {
    const response = await page.request.get('/intreprinderi-publice?lang=en&q=apa', { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers().location).toMatch(/\/public-enterprises\?lang=en$/u)
  })

  test('a retired profile address leads to the enterprise’s company page, for now', async ({ page }) => {
    const response = await page.request.get('/intreprinderi-publice/RO10020943', { maxRedirects: 0 })
    expect(response.status()).toBe(302)
    expect(response.headers().location).toMatch(/\/companies\/10020943$/u)
    expect(response.headers()['cache-control']).toBe('no-store')
  })

  test('the sidebar lists the page, on a page that does not link it otherwise', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)
    await expect(page.locator('[data-sidebar="sidebar"] a[href="/public-enterprises"]').first()).toBeAttached()
  })
})
