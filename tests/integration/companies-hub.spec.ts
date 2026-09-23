/**
 * Integration tests for the /companies hub: the figures are the client's
 * snapshot, so the page asks the API for nothing but the search; its choices
 * are in the URL; its links open the directory and the profiles; and the
 * legacy `/companies?q=` deep link still reaches the directory.
 *
 * GraphQL is mocked (fixtures under tests/fixtures/companies-hub-flow/). The
 * directory, once navigated to, fires `CompaniesSearch` + `CompanyGroupProfile`.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const ACTIVE_FILTER = { status: { eq: '1048' } }

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('CompanyGroupProfile', 'counties')
  // The hub's field is the landing search pinned to `docTypes: ['company']`.
  await mockApi.mockGraphQL('SearchEntities', 'search-entities-dante')

  await mockApi.mockGraphQL('CompaniesSearch', 'search-cluj', {
    variables: { filter: { county: { eq: 'Cluj' }, ...ACTIVE_FILTER } },
  })
  await mockApi.mockGraphQL('CompaniesSearch', 'search-dante', {
    variables: { q: 'dante' },
  })
  await mockApi.mockGraphQL('CompaniesSearch', 'search')

  await mockApi.mockGraphQL('CompanyResolve', 'resolve-dante', {
    variables: { q: 'dante' },
  })
  await mockApi.mockGraphQL('CompanyResolve', 'resolve')
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
    await expect(page.getByTestId('company-hub-sectors')).toContainText('Comerț cu ridicata')
    await expect(page.getByTestId('company-hub-sizes')).toBeVisible()
    await expect(page.getByTestId('company-hub-new-sectors')).toBeVisible()

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

  test('a county row opens the directory on its companies in business', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await page.locator('#judete').getByRole('link', { name: /^01\s*Bucure/ }).waitFor({ timeout: 30000 })
    await page.locator('#judete ol').getByRole('link', { name: /Cluj/ }).first().click()

    await expect(page).toHaveURL(/\/companies\/search/, { timeout: 30000 })
    expect(searchParam(page.url(), 'county')).toBe('["Cluj"]')
    expect(searchParam(page.url(), 'status')).toBe('["1048"]')
    await expect(page.getByTestId('company-search-results')).toContainText('POPA IOANA PFA')
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

  test('a largest company opens its profile', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-hub-leaders').getByRole('link', { name: /OMV PETROM SA/ }).first()).toHaveAttribute(
      'href',
      '/companies/1590082',
    )
  })

  test('the companies-in-business figure opens the directory with its status applied', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await page.getByRole('link', { name: 'Firme în funcțiune' }).first().click()

    await expect(page).toHaveURL(/\/companies\/search/, { timeout: 30000 })
    expect(searchParam(page.url(), 'status')).toBe('["1048"]')
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

  test('a legacy /companies?q= deep link redirects to the directory', async ({ page }) => {
    await page.goto('/companies?q=dante')

    await expect(page).toHaveURL(/\/companies\/search/, { timeout: 30000 })
    expect(searchParam(page.url(), 'q')).toBe('dante')
    await expect(page.getByTestId('company-search-results')).toContainText('DANTE INTERNATIONAL SA')
  })
})
