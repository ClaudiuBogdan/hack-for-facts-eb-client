/**
 * Integration tests for the national budget page (`/national-budget`). The
 * page renders on the server: in CI the server reads the dev API and the
 * browser cannot (the API answers no CORS preflight), so these tests hold the
 * page to its structure and its address — the bands it draws, the year it
 * reads, the way back and forth to the analysis page — never to a number the
 * next bulletin would change, and never to a read the browser makes.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { Page } from '@playwright/test'

const ROUTE = '/national-budget'

/**
 * The national budget roots are on the dev API only: against another (the
 * nightly's production API) the page has nothing to render, and these tests
 * say so instead of failing on it. Without the variable (a local dev server)
 * the page's own proxy decides, and the tests run.
 */
test.beforeAll(async () => {
  const api = process.env.VITE_API_URL
  if (!api) return
  const response = await fetch(`${api.replace(/\/+$/u, '')}/api/v1/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ budgetNationalCatalog { snapshots { execution } } }' }),
    signal: AbortSignal.timeout(20000),
  })
  const body = response.status === 404 ? null : ((await response.json().catch(() => null)) as { readonly errors?: readonly { readonly message?: string }[] } | null)
  const missing = response.status === 404 || (body?.errors ?? []).some((error) => error.message?.includes('Cannot query field "budgetNationalCatalog"'))
  test.skip(missing, `${api} does not serve the national budget API`)
})

const BANDS = ['cheltuieli', 'domenii', 'ministere', 'venituri', 'deficit', 'anul', 'bugete', 'lege'] as const

const bar = (page: Page) => page.getByRole('navigation', { name: 'Secțiunile paginii' })
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams)

test.describe('National budget — the server render', () => {
  test('the bare page draws its head, its figures and every band, in a reader’s order', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(page).toHaveTitle(/^Bugetul național/u)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('De unde vin banii publici')
    await expect(page.getByRole('region', { name: 'Cifre-cheie' })).toContainText('mld. lei')
    // The pinned bar: one link per band, in order, and the year.
    await expect(bar(page).getByRole('link')).toHaveCount(BANDS.length)
    for (const [position, id] of BANDS.entries()) {
      await expect(bar(page).getByRole('link').nth(position)).toHaveAttribute('href', `#${id}`)
      // Each band, drawn by the server with its own heading.
      await expect(page.locator(`section#${id} h2`).first()).toBeVisible()
    }
    // The way into the analysis page, from the head and from the last band.
    await expect(page.getByRole('link', { name: 'Analize avansate' })).toHaveAttribute('href', '/national-budget/analytics')
    await expect(page.locator('section[aria-labelledby="start-title"] a[href^="/national-budget/analytics"]')).toHaveCount(6)
  })

  test('the ministries are listed, each opening on what it paid for; the sources name their last month', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    const first = page.locator('section#ministere button[aria-expanded]').first()
    await expect(first).toBeVisible()
    // The sources' line names its data's last month.
    await expect(page.getByText(/date până în/u).first()).toBeVisible()
  })

  test('the year is the page’s: chosen in the bar, it is written in the address', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    const select = bar(page).getByRole('combobox', { name: 'Anul' })
    const current = await select.inputValue()
    const earlier = String(Number(current) - 3)
    await select.selectOption(earlier)
    await expect.poll(() => params(page).an).toBe(earlier)
    // The head's dropdown follows: one year for the whole page.
    await expect(page.getByRole('combobox', { name: 'Anul' }).first()).toHaveValue(earlier)
    // The default year stays out of the address.
    await select.selectOption(current)
    await expect.poll(() => params(page).an).toBeUndefined()
  })

  test('a year in the address is read as asked; one it cannot read opens the default', async ({ page }) => {
    await page.goto(`${ROUTE}?an=2019`)
    await waitForPageReady(page)
    await expect(bar(page).getByRole('combobox', { name: 'Anul' })).toHaveValue('2019')
    await expect(page.getByRole('region', { name: 'Cifre-cheie' })).toContainText('2019')

    await page.goto(`${ROUTE}?an=ieri`)
    await waitForPageReady(page)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('De unde vin banii publici')
  })

  test('a year before ANAF’s reports says so in its bands, and the rest of the page stands', async ({ page }) => {
    await page.goto(`${ROUTE}?an=2012`)
    await waitForPageReady(page)

    await expect(page.locator('section#domenii')).toContainText('2016')
    await expect(page.locator('section#ministere')).toContainText('2016')
    await expect(page.locator('section#cheltuieli h2')).toBeVisible()
  })

  test('the server’s heading and a band’s heading survive hydration', async ({ page }) => {
    // Every heading the server puts in the page is recorded as it lands, before React has touched it; React's own
    // nodes carry its fiber from the start. A mismatch makes React drop the server's node and draw its own — silently.
    await page.addInitScript(() => {
      const server = new Set<Element>()
      ;(window as unknown as { serverNodes: Set<Element> }).serverNodes = server
      new MutationObserver(() => {
        for (const node of document.querySelectorAll('h1, #cheltuieli-title, #ministere-title')) {
          if (!node.closest('[hidden]') && !Object.keys(node).some((key) => key.startsWith('__reactFiber$'))) server.add(node)
        }
      }).observe(document, { childList: true, subtree: true, characterData: true })
    })
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.locator('#ministere-title')).toBeVisible()
    expect(
      await page.evaluate(() => {
        const server = (window as unknown as { serverNodes: Set<Element> }).serverNodes
        return ['h1', '#cheltuieli-title', '#ministere-title'].map((selector) => {
          const node = document.querySelector(selector)
          return node !== null && server.has(node)
        })
      }),
    ).toEqual([true, true, true])
  })
})

test.describe('National budget — the ways in', () => {
  test('the old pages lead here', async ({ page }) => {
    await page.goto('/buget-national-2026')
    await expect.poll(() => new URL(page.url()).pathname).toBe(ROUTE)
    await page.goto('/budget-explorer')
    await expect.poll(() => new URL(page.url()).pathname).toBe(ROUTE)
  })

  test('the analysis page leads back here', async ({ page }) => {
    await page.goto(`${ROUTE}/analytics`)
    await waitForPageReady(page)
    await expect(page.getByRole('link', { name: 'Bugetul național' }).first()).toHaveAttribute('href', ROUTE)
  })
})
