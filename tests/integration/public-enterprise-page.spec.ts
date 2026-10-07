/**
 * Integration tests for one public enterprise's page
 * (`/public-enterprises/$cui`). The server reads the enterprise, its company
 * record and its last twelve months as a buyer from `VITE_API_URL` and renders
 * the page whole; the browser reads nothing on mount (in CI it could not: the
 * dev API answers no CORS preflight). So these tests hold the page to its
 * structure and its address on live data — the head, the bands in the pinned
 * bar's order, the links that leave it, a CUI no list holds — never to a figure
 * the next source load changes. Tursib (789401) is controlled by Consiliul
 * Local Sibiu in ANAF's list.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'

const ROUTE = '/public-enterprises/789401'
const BANDS = ['control', 'bani', 'amepip', 'stare'] as const

/**
 * The public-enterprise API is on the dev API only: against another (the
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
    body: JSON.stringify({ query: '{ publicEnterpriseSources { family } }' }),
    signal: AbortSignal.timeout(20000),
  })
  const body = response.status === 404 ? null : ((await response.json().catch(() => null)) as { readonly errors?: readonly { readonly message?: string }[] } | null)
  const missing = response.status === 404 || (body?.errors ?? []).some((error) => error.message?.includes('Cannot query field "publicEnterpriseSources"'))
  test.skip(missing, `${api} does not serve the public-enterprise API`)
})

/** Only a whole render is cached publicly: a partial one (a live read past its deadline) leaves its part to the browser. */
const isWhole = (cacheControl: string | undefined) => /s-maxage=/u.test(cacheControl ?? '')

test.describe('Public enterprise page — the server render', () => {
  test('the page draws its head and every band, in the pinned bar’s order', async ({ page }) => {
    const response = await page.goto(ROUTE)
    expect(response?.status()).toBe(200)
    await waitForPageReady(page)

    await expect(page).toHaveTitle(/^Tursib SA — Întreprinderi publice — Transparenta\.eu$/u)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tursib SA')
    await expect(page.getByText(/o controlează, după lista ANAF a întreprinderilor publice/u).first()).toBeVisible()
    const bar = page.getByRole('navigation', { name: 'Secțiunile paginii' })
    await expect(bar.getByRole('link')).toHaveCount(BANDS.length)
    for (const [position, id] of BANDS.entries()) {
      await expect(bar.getByRole('link').nth(position)).toHaveAttribute('href', `#${id}`)
      await expect(page.locator(`section#${id} h2`).first()).toBeVisible()
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/public-enterprises\/789401$/u)
  })

  test('the server’s HTML carries the page, its nodes survive hydration, and the browser reads nothing', async ({ page }) => {
    const html = await (await page.request.get(ROUTE)).text()
    expect(html).toContain('Tursib SA')
    for (const id of BANDS) expect(html).toContain(`id="${id}"`)

    await page.addInitScript(() => {
      const caught: Element[] = []
      ;(window as unknown as { __serverNodes: Element[] }).__serverNodes = caught
      new MutationObserver((records, observer) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node instanceof Element && (node.matches('h1') || node.matches('section#amepip'))) caught.push(node)
          }
        }
        if (caught.length >= 2) observer.disconnect()
      }).observe(document, { childList: true, subtree: true })
    })
    // A whole server render seeds every query: the browser reads nothing on mount (in CI it could not).
    const reads: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/graphql(?:[?#]|$)/u.test(request.url())) reads.push(request.postDataJSON()?.operationName ?? 'anonymous')
    })
    const response = await page.goto(ROUTE)
    await waitForPageReady(page)
    await page.waitForTimeout(1000)
    // Only a whole render is cached publicly; a partial one (a live read past its deadline) is read again in the browser, as it should be.
    if (isWhole(response?.headers()['cache-control'])) expect(reads).toEqual([])
    else test.info().annotations.push({ type: 'note', description: `partial server read: the browser read ${reads.join(', ') || 'nothing'}` })
    const kept = await page.evaluate(() => {
      const caught = (window as unknown as { __serverNodes: Element[] }).__serverNodes
      return { caught: caught.length, kept: caught.filter((node) => document.contains(node)).length }
    })
    expect(kept.caught).toBe(2)
    expect(kept.kept).toBe(2)
  })

  test('its links leave for the authority’s budget, the company page and the procurement page', async ({ page }) => {
    const response = await page.goto(ROUTE)
    await waitForPageReady(page)
    // Each link needs its read: on a partial render, the one that failed is the browser's to read again.
    test.skip(!isWhole(response?.headers()['cache-control']), 'partial server read: the links wait on the browser')

    await expect(page.locator('section#control a[href="/entities/4270740"]').first()).toBeVisible()
    await expect(page.locator('section#control a[href^="/public-enterprises/"]').first()).toBeVisible()
    await expect(page.locator('a[href="/companies/789401"]').first()).toBeVisible()
    await expect(page.locator('section#bani a[href="/procurement/institutions/789401"]')).toBeVisible()
  })

  test('AMEPIP’s values, year by year, open on a click', async ({ page }) => {
    const response = await page.goto(ROUTE)
    await waitForPageReady(page)
    // The tables need the indicator pages: on a partial render they may be the browser's to read again.
    test.skip(!isWhole(response?.headers()['cache-control']), 'partial server read: the indicators wait on the browser')

    const amepip = page.locator('section#amepip')
    await expect(amepip.getByRole('table')).toHaveCount(0)
    await amepip.getByRole('button', { name: /Toate valorile AMEPIP, pe ani/u }).click()
    await expect(amepip.getByRole('table')).toHaveCount(2)
  })
})

test.describe('Public enterprise page — the ways in', () => {
  test('a CUI no list holds is a 404', async ({ page }) => {
    const response = await page.goto('/public-enterprises/14399840')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Nu e o întreprindere publică' })).toBeVisible()
  })

  test('an address that is not a CUI is a 404', async ({ page }) => {
    const response = await page.request.get('/public-enterprises/RO789401')
    expect(response.status()).toBe(404)
  })
})
