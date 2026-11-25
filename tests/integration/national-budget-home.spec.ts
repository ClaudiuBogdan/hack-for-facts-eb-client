/**
 * Integration tests for the national budget page (`/national-budget`). The
 * page renders on the server: in CI the server reads the dev API and the
 * browser cannot (the API answers no CORS preflight), so these tests hold the
 * page to its structure and its address — the sections it draws, the year it
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

const SECTIONS = ['bani', 'bugete', 'stat', 'imprumut', 'anul'] as const

const bar = (page: Page) => page.getByRole('navigation', { name: 'Secțiunile paginii' })
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams)
/** The head's year button: „Anul: 2025" (or „Anul: 2026, până în …" for the year in progress). */
const yearButton = (page: Page) => page.getByRole('button', { name: /^Anul: \d{4}/u }).first()

/** Opens the head's year menu (again until the page has hydrated and it opens) and picks a year. */
async function pickYear(page: Page, year: string) {
  const item = page.getByRole('menuitemradio', { name: new RegExp(`^${year}`, 'u') })
  await expect(async () => {
    await yearButton(page).click()
    await expect(item).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 30000 })
  await item.click()
}

test.describe('National budget — the server render', () => {
  test('the bare page draws its head, its figures and every section, in a reader’s order', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(page).toHaveTitle(/^Bugetul național/u)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bugetul țării')
    await expect(page.getByRole('region', { name: 'Cifre-cheie' })).toContainText('mld. lei')
    // The pinned bar: one link per section, in order.
    await expect(bar(page).getByRole('link')).toHaveCount(SECTIONS.length)
    for (const [position, id] of SECTIONS.entries()) {
      await expect(bar(page).getByRole('link').nth(position)).toHaveAttribute('href', `#${id}`)
      // Each section, drawn by the server with its own heading.
      await expect(page.locator(`section#${id} h2`).first()).toBeVisible()
    }
    // The way into the analysis page, from the head and from the page's end.
    await expect(page.getByRole('link', { name: 'Analize avansate' })).toHaveAttribute('href', '/national-budget/analytics')
    await expect(page.locator('section#departe a[href^="/national-budget/analytics"]')).toHaveCount(6)
  })

  test('the state budget names its institutions, each opening its page; the data note names its last month', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(page.locator('section#stat a[href^="/entities/"]').first()).toBeVisible()
    // The lists open on request, from one button for both.
    const more = page.locator('section#stat button[aria-expanded]')
    await expect(more).toHaveAttribute('aria-expanded', 'false')
    await more.click()
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText(/Date până în/u).first()).toBeVisible()
  })

  test('the budgets section switches between its squares and the flow of money', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    const section = page.locator('section#bugete')
    await expect(section.getByRole('img').first()).toBeVisible()
    await section.getByRole('radio', { name: 'Fluxul banilor' }).click()
    await expect(section.locator('svg[role="img"]')).toBeVisible()
  })

  test('the year is the page’s: chosen in the head, it is written in the address', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    // The bare page shows the default year, which stays out of the address.
    expect(params(page).an).toBeUndefined()
    const current = ((await yearButton(page).getAttribute('aria-label')) ?? '').match(/\d{4}/u)?.[0] ?? ''
    const earlier = String(Number(current) - 3)
    await pickYear(page, earlier)
    await expect.poll(() => params(page).an).toBe(earlier)
    await expect(yearButton(page)).toHaveAttribute('aria-label', `Anul: ${earlier}`)
    // A change is a step in the history: Back returns to the default year and the bare address.
    await page.goBack()
    await expect.poll(() => params(page).an).toBeUndefined()
    await expect(yearButton(page)).toHaveAttribute('aria-label', `Anul: ${current}`)
  })

  test('a year in the address is read as asked; one it cannot read opens the default', async ({ page }) => {
    await page.goto(`${ROUTE}?an=2019`)
    await waitForPageReady(page)
    await expect(yearButton(page)).toHaveAttribute('aria-label', 'Anul: 2019')
    await expect(page.getByRole('heading', { name: 'Bilanțul, 2019' })).toBeVisible({ timeout: 30000 })

    await page.goto(`${ROUTE}?an=ieri`)
    await waitForPageReady(page)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bugetul țării')
  })

  test('a year before the sources says so in its sections, and the rest of the page stands', async ({ page }) => {
    await page.goto(`${ROUTE}?an=2012`)
    await waitForPageReady(page)

    await expect(page.locator('section#stat')).toContainText('2016')
    await expect(page.locator('section#bugete')).toContainText('2019')
    await expect(page.locator('section#bani h2')).toBeVisible()
  })

  test('the server’s heading and a section’s heading survive hydration', async ({ page }) => {
    // Every heading the server puts in the page is recorded as it lands, before React has touched it; React's own
    // nodes carry its fiber from the start. A mismatch makes React drop the server's node and draw its own — silently.
    await page.addInitScript(() => {
      const server = new Set<Element>()
      ;(window as unknown as { serverNodes: Set<Element> }).serverNodes = server
      new MutationObserver(() => {
        for (const node of document.querySelectorAll('h1, #bani-title, #stat-title')) {
          if (!node.closest('[hidden]') && !Object.keys(node).some((key) => key.startsWith('__reactFiber$'))) server.add(node)
        }
      }).observe(document, { childList: true, subtree: true, characterData: true })
    })
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.locator('#stat-title')).toBeVisible()
    expect(
      await page.evaluate(() => {
        const server = (window as unknown as { serverNodes: Set<Element> }).serverNodes
        return ['h1', '#bani-title', '#stat-title'].map((selector) => {
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
