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
  // The hub's field is the landing search pinned to `docTypes: ['company']`.
  await mockApi.mockGraphQL('SearchEntities', 'search-entities-dante')

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
      '3.985.167',
      { timeout: 30000 },
    )
    await expect(page.getByTestId('company-hub-tile-active')).toContainText('1.724.391')
    await expect(page.getByTestId('company-hub-tile-struck-off')).toContainText(
      '2.017.899',
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

  test('discloses the active companies missing from the county ranking', async ({
    page,
  }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    // The unplaced population is the `(none)` bucket of the very grouping the
    // map is drawn from, so the gap is always measured against the counties
    // shown. It is not `coverage.territoryUnmatched`, which counts the
    // different question of which counties resolved to a SIRUTA territory.
    await expect(page.getByTestId('company-hub-county-coverage')).toContainText(
      '593',
      { timeout: 30000 },
    )
    await expect(page.getByTestId('company-hub-computed-at')).toContainText(
      '2026-05-17',
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

  test('the search asks the index for companies only, and typing navigates nowhere', async ({
    page,
  }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-hub-tile-total')).toBeVisible({
      timeout: 30000,
    })

    const requests: string[] = []
    page.on('request', (request) => {
      const body = request.postData()
      if (body?.includes('SearchEntities')) requests.push(body)
    })

    await page.getByRole('combobox').first().fill('dante')
    await expect(page.getByRole('option', { name: /DANTE INTERNATIONAL/ })).toBeVisible({
      timeout: 30000,
    })

    // The scope is sent to the server, not applied to a mixed page of hits.
    expect(requests.some((body) => body.includes('"company"'))).toBe(true)
    // Typing is not a commit: the reader is still on the hub.
    await expect(page).toHaveURL(/\/companies$/)
  })

  test('picking a result opens that company profile', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-hub-tile-total')).toBeVisible({
      timeout: 30000,
    })

    await page.getByRole('combobox').first().fill('dante')
    await page.getByRole('option', { name: /DANTE INTERNATIONAL/ }).click()

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

/**
 * `companyHubStats` is a nullable root field: cold compute is ~30s, so a request
 * that lands while the server cache is warming resolves to null. That must read
 * as "not ready, retry", never as a hub full of zeroes.
 */
test.describe('Companies hub — stats not ready', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mockGraphQL('CompanyHubStats', 'hub-stats-null')
    await mockApi.mockGraphQL('CompanyGroupProfile', 'counties')
    await mockApi.mockGraphQL('SearchEntities', 'search-entities-dante')
    await mockApi.mockGraphQL('CompaniesSearch', 'search')
    await mockApi.mockGraphQL('CompanyResolve', 'resolve')
  })

  test('offers a retry and never renders zeroed tiles', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 30000 })
    await expect(page.getByTestId('company-hub-tile-total')).toHaveCount(0)
  })

  test('still draws the counties, which ride their own query', async ({ page }) => {
    // The county grouping is a separate request from the cached aggregate, so
    // a cold hub cache costs the reader the figures, not the whole page.
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-hub-counties')).toContainText('CLUJ', {
      timeout: 30000,
    })
  })

  test('still renders the shell, the search dock and the investigation cards', async ({
    page,
  }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(
      page.getByRole('heading', { name: /Fiecare firmă/, level: 1 }),
    ).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole('combobox').first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: /insolvență sau faliment/ }).first(),
    ).toBeVisible()
  })
})
