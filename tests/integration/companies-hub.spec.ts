/**
 * Integration tests for the /companies hub — stat tiles, the search dock and
 * the county/CAEN blocks, plus the legacy `/companies?q=` redirect.
 *
 * GraphQL is mocked (fixtures under tests/fixtures/companies-hub-flow/). The
 * hub fires a single `CompanyHubStats`; navigating into the directory fires
 * `CompaniesSearch` + `CompanyGroupProfile`. Variables-specific fixtures are
 * registered first, the unfiltered fallback last.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const ACTIVE_FILTER = { status: { eq: '1048' } }

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('CompanyHubStats', 'hub-stats')
  await mockApi.mockGraphQL('CompanyGroupProfile', 'counties')

  await mockApi.mockGraphQL('CompaniesSearch', 'search-cluj', {
    variables: { filter: { county: { eq: 'CLUJ' }, ...ACTIVE_FILTER } },
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

  test('renders the stat tiles from the hub aggregate', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-hub-tile-total')).toContainText(
      '3.994.112',
      { timeout: 30000 },
    )
    await expect(page.getByTestId('company-hub-tile-active')).toContainText('1.402.887')
    await expect(page.getByTestId('company-hub-tile-struck-off')).toContainText(
      '2.100.004',
    )
    // Insolvency (30.000) + bankruptcy (41.219) are summed into one tile.
    await expect(page.getByTestId('company-hub-tile-distress')).toContainText('71.219')
  })

  test('renders the county and CAEN blocks', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-hub-counties')).toBeVisible({
      timeout: 30000,
    })
    await expect(page.getByTestId('company-hub-counties')).toContainText('CLUJ')
    await expect(page.getByTestId('company-hub-caen')).toContainText(
      'Comerț cu amănuntul',
    )
  })

  test('a county row deep-links into the pre-filtered directory', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    const countyRow = page
      .getByTestId('company-hub-counties')
      .getByRole('link', { name: /CLUJ/ })
    await expect(countyRow).toBeVisible({ timeout: 30000 })
    await countyRow.click()

    await expect(page).toHaveURL(/\/companies\/search/, { timeout: 30000 })
    expect(searchParam(page.url(), 'county')).toBe('["CLUJ"]')
    expect(searchParam(page.url(), 'status')).toBe('["1048"]')
    await expect(page.getByTestId('company-search-results')).toContainText(
      'POPA IOANA PFA',
    )
  })

  test('a stat tile deep-links into the directory with its status applied', async ({
    page,
  }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-hub-tile-active')).toBeVisible({
      timeout: 30000,
    })
    await page.getByTestId('company-hub-tile-active').click()

    await expect(page).toHaveURL(/\/companies\/search/, { timeout: 30000 })
    expect(searchParam(page.url(), 'status')).toBe('["1048"]')
  })

  test('Enter in the search dock searches; it does not navigate while typing', async ({
    page,
  }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-hub-tile-total')).toBeVisible({
      timeout: 30000,
    })

    const dock = page.getByTestId('company-search-input')
    await dock.fill('dante')
    // The dock commits on Enter only — typing must leave us on the hub.
    await expect(page).toHaveURL(/\/companies$/)

    await dock.press('Enter')
    await expect(page).toHaveURL(/\/companies\/search/, { timeout: 30000 })
    expect(searchParam(page.url(), 'q')).toBe('dante')
  })

  test('picking a suggestion jumps straight to the company profile', async ({
    page,
  }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-hub-tile-total')).toBeVisible({
      timeout: 30000,
    })

    await page.getByTestId('company-search-input').fill('dante')
    const suggestions = page.getByTestId('company-search-suggestions')
    await expect(suggestions).toBeVisible({ timeout: 30000 })

    await suggestions.getByRole('option', { name: /DANTE INTERNATIONAL/ }).click()
    await expect(page).toHaveURL(/\/companies\/14399840/, { timeout: 30000 })
  })

  test('a legacy /companies?q= deep link redirects to the directory', async ({
    page,
  }) => {
    await page.goto('/companies?q=dante')

    await expect(page).toHaveURL(/\/companies\/search/, { timeout: 30000 })
    expect(searchParam(page.url(), 'q')).toBe('dante')
    await expect(page.getByTestId('company-search-results')).toContainText(
      'DANTE INTERNATIONAL SA',
    )
  })
})
