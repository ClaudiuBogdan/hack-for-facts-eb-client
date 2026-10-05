/**
 * Integration tests for the national budget analysis page (`/national-budget/analytics`).
 * The page renders on the server: in CI the server reads the dev API, so these
 * tests hold the page to its structure — the address it answers, the bars and
 * tabs it draws, the rows it renders — never to a number that the next
 * bulletin would change. A control writes the address: a question is a link.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { Page } from '@playwright/test'

const ROUTE = '/national-budget/analytics'

/**
 * The server renders this page from the API it is given (`VITE_API_URL`): the
 * national budget roots are on the dev API only, so against another (the
 * nightly's production API) the page has nothing to render, and these tests
 * say so instead of failing on it. Without the variable (a local dev server)
 * the page's own proxy decides, and the tests run.
 */
test.beforeAll(async () => {
  const api = process.env.VITE_API_URL
  if (!api) return
  // The catalog itself, not the schema (introspection is off on the deployed APIs). Only a missing endpoint or a
  // missing field skips; an API that is down fails, as any other page of the suite would.
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

/** The address's params, as the page wrote them. */
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams)
const populations = (page: Page) => page.getByRole('navigation', { name: 'Ce citești' })
const tabs = (page: Page) => page.getByRole('tablist', { name: 'După ce' }).getByRole('tab')
const answerRows = (page: Page) => page.locator('#answer-panel tbody tr')

test.describe('National budget analysis — the server render', () => {
  test('the bare page asks its first question and answers it by line', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(page).toHaveTitle(/^Bugetul național/u)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pe ce s-au cheltuit banii publici')
    // The five populations (the bar also holds the contents' search).
    await expect(populations(page).locator('button[aria-pressed]')).toHaveCount(5)
    await expect(populations(page).getByRole('button', { name: 'Cheltuieli' })).toHaveAttribute('aria-pressed', 'true')
    await expect(tabs(page)).toHaveText(['Pe categorii', 'Pe bugete', 'În timp'])
    await expect(page.getByRole('tab', { name: 'Pe categorii' })).toHaveAttribute('aria-selected', 'true')
    // The bulletin's lines, with the total spending's parts ranked under it.
    await expect.poll(() => answerRows(page).count()).toBeGreaterThan(10)
    await expect(page.getByRole('region', { name: 'Cifre-cheie' })).toContainText('mld. lei')
  })

  test('a question in the address is answered as asked', async ({ page }) => {
    await page.goto(`${ROUTE}?tip=venituri&dupa=timp&pas=trimestru`)
    await waitForPageReady(page)

    await expect(populations(page).getByRole('button', { name: 'Venituri' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('tab', { name: 'În timp' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/venituri/iu)
    await expect.poll(() => answerRows(page).count()).toBeGreaterThan(4)
  })

  test('the law’s ministries are listed from the law itself', async ({ page }) => {
    await page.goto(`${ROUTE}?tip=ministere`)
    await waitForPageReady(page)

    await expect(page.getByRole('tab', { name: 'Aprobat' })).toHaveAttribute('aria-selected', 'true')
    // The ANAF payments are not on the page: the law's lane only.
    await expect(tabs(page)).toHaveCount(1)
    await expect.poll(() => answerRows(page).count()).toBeGreaterThan(20)
  })

  test('an opened ministry is its own question, with its own figures, and its server heading survives hydration', async ({ page }) => {
    await page.goto(`${ROUTE}?tip=ministere`)
    await waitForPageReady(page)

    const first = answerRows(page).first().getByRole('button').first()
    const name = (await first.innerText()).trim()
    await first.click()
    await expect.poll(() => params(page).rand).toBeTruthy()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(name)
    await expect(page.getByRole('region', { name: 'Cifre-cheie' })).toContainText('Locul între ordonatori')

    // The same address, loaded: the server writes the ministry's name, and hydration keeps the heading it sent. A
    // mismatch makes React drop the server's node and draw its own — silently: recoverable errors go to Sentry, not
    // to the console. Every heading the server puts in the page (the parser's, or a streamed swap's) is recorded as it
    // lands, before React has touched it (an observer runs before React's next task); React's own nodes carry its
    // fiber from the start, so they are never recorded.
    await page.addInitScript(() => {
      const server = new Set<Element>()
      ;(window as unknown as { serverHeadings: Set<Element> }).serverHeadings = server
      new MutationObserver(() => {
        const heading = document.querySelector('#budget-advanced-title')
        if (heading && !heading.closest('[hidden]') && !Object.keys(heading).some((key) => key.startsWith('__reactFiber$'))) server.add(heading)
      }).observe(document, { childList: true, subtree: true, characterData: true })
    })
    await page.reload()
    await waitForPageReady(page)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(name)
    expect(
      await page.evaluate(() => {
        const heading = document.querySelector('#budget-advanced-title')
        return heading !== null && (window as unknown as { serverHeadings: Set<Element> }).serverHeadings.has(heading)
      }),
    ).toBe(true)
  })

  test('an address it cannot read falls back to the first question, not to an error', async ({ page }) => {
    await page.goto(`${ROUTE}?tip=altceva&perioada=ieri&dupa=platit`)
    await waitForPageReady(page)

    await expect(populations(page).getByRole('button', { name: 'Cheltuieli' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('tab', { name: 'Pe categorii' })).toHaveAttribute('aria-selected', 'true')
    await expect.poll(() => answerRows(page).count()).toBeGreaterThan(10)

    // The first change writes a clean address: what the page couldn't read leaves it.
    await page.getByRole('tab', { name: 'În timp' }).click()
    await expect.poll(() => params(page)).toEqual({ dupa: 'timp' })
    await expect(page.getByRole('tab', { name: 'În timp' })).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('National budget analysis — the controls write the address', () => {
  test('a population in the bar writes its own address, and the default leaves it', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await populations(page).getByRole('button', { name: 'Legea' }).click()
    await expect.poll(() => params(page).tip).toBe('lege')
    await expect(populations(page).getByRole('button', { name: 'Legea' })).toHaveAttribute('aria-pressed', 'true')

    await populations(page).getByRole('button', { name: 'Cheltuieli' }).click()
    await expect.poll(() => params(page).tip).toBeUndefined()
  })

  test('the tabs move with the arrow keys, each a step the browser can go back from', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await page.getByRole('tab', { name: 'Pe categorii' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => params(page).dupa).toBe('bugete')
    await expect(page.getByRole('tab', { name: 'Pe bugete' })).toBeFocused()
    await page.keyboard.press('End')
    await expect.poll(() => params(page).dupa).toBe('timp')

    await page.goBack()
    await expect.poll(() => params(page).dupa).toBe('bugete')
  })

  test('a change of question keeps the site’s own keys', async ({ page }) => {
    await page.goto(`${ROUTE}?lang=ro`)
    await waitForPageReady(page)

    await populations(page).getByRole('button', { name: 'Deficit' }).click()
    await expect.poll(() => params(page).tip).toBe('sold')
    expect(params(page).lang).toBe('ro')
  })

  test('the contents open on „/", find a line by its words, and open it', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await page.locator('body').press('/')
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    const field = sheet.getByRole('searchbox', { name: 'Caută în cuprins' })
    await expect(field).toBeFocused()
    await field.fill('dobanzi')
    await sheet.getByRole('button', { name: /^Dobânzi/u }).first().click()
    await expect.poll(() => params(page).rand).toBe('expenditure.interest')
    await expect(sheet).toBeHidden()
  })
})
