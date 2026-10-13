/**
 * Integration tests for the /companies hub: the figures are the client's
 * snapshot, so the page asks the API for nothing but the search; its choices
 * are in the URL; its links open the companies analysis and the profiles; and
 * the retired directory's addresses lead to the analysis for good.
 *
 * GraphQL is mocked (fixtures under tests/fixtures/companies-hub-flow/).
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  // The hub's field is the landing search pinned to `docTypes: ['company']`.
  await mockApi.mockGraphQL('SearchEntities', 'search-entities-dante')
}

/** The router JSON-encodes array search params, so read them back decoded. */
function searchParam(url: string, key: string): string | null {
  return new URL(url).searchParams.get(key)
}

test.describe('Companies hub', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('renders every band without asking the API for figures', async ({ page }) => {
    // The transports send `{ query, variables }` with no `operationName`, so the
    // name is read from the document itself, as the mock layer does.
    const operations: string[] = []
    const operationOf = (body: string | null): string | undefined => {
      try {
        const { query } = JSON.parse(body ?? '{}') as { query?: string }
        return /\b(?:query|mutation)\s+(\w+)/.exec(query ?? '')?.[1]
      } catch {
        return undefined
      }
    }
    page.on('request', (request) => {
      const operation = operationOf(request.postData())
      if (operation) operations.push(operation)
    })

    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: /Economia/, level: 1 })).toBeVisible({ timeout: 30000 })
    await expect(page.getByTestId('company-hub-leaders')).toContainText('OMV PETROM SA')
    // The analysis's derived activity selection, each class in its own revision — no ANAF code read into a division.
    await expect(page.getByTestId('company-hub-activities')).toContainText('4711 · ONRC Rev.3')
    await expect(page.getByTestId('company-hub-activities-rest')).toContainText('Mai multe activități clasificate ONRC, niciuna selectată')
    await expect(page.getByTestId('company-hub-sizes')).toBeVisible()
    // No qualified breakdown of the year's new companies exists: none is drawn.
    await expect(page.getByTestId('company-hub-new-sectors')).toHaveCount(0)

    // The search may warm up; nothing else may be asked for.
    expect(operations.filter((name) => name !== 'SearchEntities')).toEqual([])
  })

  test('a figure opens its band, by its own measure', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await page.getByRole('link', { name: 'Salariați', exact: true }).first().click()
    await expect(page).toHaveURL(/domenii=salariati#domenii$/, { timeout: 30000 })
    await expect(
      page.getByRole('radiogroup', { name: 'Domeniile după' }).getByRole('radio', { name: 'Salariați' }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  test('a county row opens its companies in the analysis', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await page.locator('#judete').getByRole('link', { name: /^01\s*Bucure/ }).waitFor({ timeout: 30000 })
    await page.locator('#judete ol').getByRole('link', { name: /Cluj/ }).first().click()

    await expect(page).toHaveURL(/\/companies\/analytics/, { timeout: 30000 })
    expect(searchParam(page.url(), 'judet')).toBe('CJ')
    expect(searchParam(page.url(), 'an')).toBe('2025')
  })

  test('the map’s indicator is written to the URL, and read back from it', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    const toggle = page.getByRole('radiogroup', { name: 'Indicatorul de pe hartă' })
    await toggle.getByRole('radio', { name: 'Firme noi' }).click()
    await expect(page).toHaveURL(/indicator=infiintari/, { timeout: 30000 })

    await page.reload()
    await waitForPageReady(page)
    await expect(
      page.getByRole('radiogroup', { name: 'Indicatorul de pe hartă' }).getByRole('radio', { name: 'Firme noi' }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  test('the years band’s measure is in the URL, and its chart reads a year from the keyboard', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await page.getByRole('radiogroup', { name: 'Anii după' }).getByRole('radio', { name: 'Salariați' }).click()
    await expect(page).toHaveURL(/evolutie=salariati/, { timeout: 30000 })
    const chart = page.getByTestId('company-hub-economy-chart').getByRole('slider')
    await expect(chart).toHaveAttribute('aria-label', /^Salariați, /)
    await chart.focus()
    await chart.press('Home')
    await expect(chart).toHaveAttribute('aria-valuetext', /^2008, /)
  })

  test('a largest company opens its profile', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-hub-leaders').getByRole('link', { name: /OMV PETROM SA/ }).first()).toHaveAttribute(
      'href',
      '/companies/1590082',
    )
  })

  test('the companies-in-business figure opens the analysis with its status applied', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await page.getByRole('link', { name: 'Firme în funcțiune' }).first().click()

    await expect(page).toHaveURL(/\/companies\/analytics/, { timeout: 30000 })
    expect(searchParam(page.url(), 'stare')).toBe('1048')
  })

  test('the search asks the index for companies only, and typing navigates nowhere', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    const requests: string[] = []
    page.on('request', (request) => {
      const body = request.postData()
      if (body?.includes('SearchEntities')) requests.push(body)
    })

    await page.getByRole('combobox').first().fill('dante')
    await expect(page.getByRole('option', { name: /DANTE INTERNATIONAL/ })).toBeVisible({ timeout: 30000 })

    // The scope is sent to the server, not applied to a mixed page of hits.
    expect(requests.some((body) => body.includes('"company"'))).toBe(true)
    // Typing is not a commit: the reader is still on the hub.
    await expect(page).toHaveURL(/\/companies$/)
  })

  test('picking a result opens that company profile', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await page.getByRole('combobox').first().fill('dante')
    await page.getByRole('option', { name: /DANTE INTERNATIONAL/ }).click()

    await expect(page).toHaveURL(/\/companies\/14399840/, { timeout: 30000 })
  })

  test('the retired directory’s address leads to the analysis for good, its filters and language kept', async ({ page }) => {
    const response = await page.request.get('/companies/search?county=CJ&status=1048&lang=en', { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers().location).toMatch(/\/companies\/analytics\?lang=en&onrc_judet=CJ&onrc_stare=1048$/u)
  })

  test('a legacy /companies deep link goes where the directory’s address goes, the hub’s own choices left behind', async ({ page }) => {
    const filtered = await page.request.get('/companies?county=CLUJ&indicator=densitate', { maxRedirects: 0 })
    expect(filtered.status()).toBe(301)
    expect(filtered.headers().location).toMatch(/\/companies\/analytics\?onrc_judet=CJ$/u)

    const named = await page.request.get('/companies?q=dante&indicator=densitate', { maxRedirects: 0 })
    expect(named.status()).toBe(301)
    expect(named.headers().location).toMatch(/\/companies\?indicator=densitate$/u)
  })
})
