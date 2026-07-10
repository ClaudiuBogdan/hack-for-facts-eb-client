/**
 * Integration tests for /companies/search — the debounced auto-applying
 * autocomplete (no submit button), the filter sheet, chips, sort and
 * deep-link hydration.
 *
 * GraphQL is mocked (fixtures under tests/fixtures/companies-search-flow/).
 * Variables-specific `CompaniesSearch` fixtures are registered first; the
 * unfiltered fallback is registered last so any unlisted filter combination
 * still resolves.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('CompanyGroupProfile', 'counties')

  await mockApi.mockGraphQL('CompaniesSearch', 'search-cluj', {
    variables: { filter: { county: { eq: 'CLUJ' } } },
  })
  await mockApi.mockGraphQL('CompaniesSearch', 'search-cluj', {
    variables: {
      filter: {
        county: { eq: 'CLUJ' },
        status: { eq: '1048' },
        vatPayer: { eq: true },
      },
    },
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

function searchParam(url: string, key: string): string | null {
  return new URL(url).searchParams.get(key)
}

const filterTrigger = /Filtre/

test.describe('Companies directory search', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('typing commits to the URL after the debounce and swaps the results', async ({
    page,
  }) => {
    await page.goto('/companies/search')
    await waitForPageReady(page)
    await expect(page.getByTestId('company-search-results')).toContainText(
      'ANTIBIOTICE SA',
      { timeout: 30000 },
    )

    await page.getByTestId('company-search-input').fill('dante')

    await expect(page).toHaveURL(/q=dante/, { timeout: 30000 })
    const results = page.getByTestId('company-search-results')
    await expect(results).toContainText('DANTE INTERNATIONAL SA')
    await expect(results).not.toContainText('ANTIBIOTICE SA')
  })

  test('there is no submit button — the results follow the committed query', async ({
    page,
  }) => {
    await page.goto('/companies/search')
    await waitForPageReady(page)
    await expect(page.getByTestId('company-search-input')).toBeVisible({
      timeout: 30000,
    })
    await expect(page.getByTestId('company-search-submit')).toHaveCount(0)
  })

  test('the sheet applies a county, badging the trigger and showing a chip', async ({
    page,
  }) => {
    await page.goto('/companies/search')
    await waitForPageReady(page)
    await expect(page.getByTestId('company-search-results')).toBeVisible({
      timeout: 30000,
    })

    await page.getByRole('button', { name: filterTrigger }).click()
    const sheet = page.getByTestId('company-filter-sheet')
    await expect(sheet).toBeVisible()

    await sheet.getByRole('checkbox', { name: /CLUJ/ }).check()
    await page.getByTestId('company-filter-apply').click()

    await expect(page).toHaveURL(/county=/, { timeout: 30000 })
    await expect(page.getByTestId('company-filter-chip-county:CLUJ')).toBeVisible()
    await expect(page.getByRole('button', { name: filterTrigger })).toContainText('1')
    await expect(page.getByTestId('company-search-results')).toContainText(
      'POPA IOANA PFA',
    )
  })

  test('a deep link hydrates chips and the active-filter badge', async ({ page }) => {
    // Old-style scalar params must still parse into the multi-value facets.
    await page.goto('/companies/search?county=CLUJ&status=1048&vat=true')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-filter-chip-county:CLUJ')).toBeVisible({
      timeout: 30000,
    })
    await expect(page.getByTestId('company-filter-chip-status:1048')).toBeVisible()
    await expect(page.getByTestId('company-filter-chip-vat')).toBeVisible()
    // county + status + vat = 3 active filters.
    await expect(page.getByRole('button', { name: filterTrigger })).toContainText('3')
    await expect(page.getByTestId('company-search-results')).toContainText(
      'POPA IOANA PFA',
    )
  })

  test('removing a chip drops exactly one param', async ({ page }) => {
    await page.goto('/companies/search?county=CLUJ&status=1048&vat=true')
    await waitForPageReady(page)
    await expect(page.getByTestId('company-filter-chip-vat')).toBeVisible({
      timeout: 30000,
    })

    await page.getByTestId('company-filter-chip-vat').click()

    await expect(page.getByTestId('company-filter-chip-vat')).toHaveCount(0)
    expect(searchParam(page.url(), 'vat')).toBeNull()
    // Re-serialized by `clean`, so the scalar deep-link form widens to an array.
    expect(searchParam(page.url(), 'county')).toBe('["CLUJ"]')
    expect(searchParam(page.url(), 'status')).toBe('["1048"]')
  })

  test('clear-all drops the filters but keeps the query', async ({ page }) => {
    await page.goto('/companies/search?q=dante&county=CLUJ&status=1048')
    await waitForPageReady(page)
    await expect(page.getByTestId('company-clear-all-filters')).toBeVisible({
      timeout: 30000,
    })

    await page.getByTestId('company-clear-all-filters').click()

    await expect(page.getByTestId('company-active-filters')).toHaveCount(0)
    expect(searchParam(page.url(), 'q')).toBe('dante')
    expect(searchParam(page.url(), 'county')).toBeNull()
    expect(searchParam(page.url(), 'status')).toBeNull()
  })

  test('the sort select writes the sort param', async ({ page }) => {
    await page.goto('/companies/search')
    await waitForPageReady(page)
    await expect(page.getByTestId('company-sort-select')).toBeVisible({
      timeout: 30000,
    })

    await page.getByTestId('company-sort-select').selectOption('name')

    await expect(page).toHaveURL(/sort=name/, { timeout: 30000 })
  })

  test('the autocomplete supports arrow-key navigation and Enter', async ({ page }) => {
    await page.goto('/companies/search')
    await waitForPageReady(page)
    await expect(page.getByTestId('company-search-results')).toBeVisible({
      timeout: 30000,
    })

    const input = page.getByTestId('company-search-input')
    await input.fill('dante')
    await expect(page.getByTestId('company-search-suggestions')).toBeVisible({
      timeout: 30000,
    })

    await input.press('ArrowDown')
    const option = page.getByRole('option').first()
    await expect(option).toHaveAttribute('aria-selected', 'true')
    await expect(input).toHaveAttribute('aria-activedescendant', /option-0$/)

    await input.press('Enter')
    await expect(page).toHaveURL(/\/companies\/14399840/, { timeout: 30000 })
  })

  test('Escape closes the suggestion list', async ({ page }) => {
    await page.goto('/companies/search')
    await waitForPageReady(page)
    await expect(page.getByTestId('company-search-results')).toBeVisible({
      timeout: 30000,
    })

    const input = page.getByTestId('company-search-input')
    await input.fill('dante')
    await expect(page.getByTestId('company-search-suggestions')).toBeVisible({
      timeout: 30000,
    })

    await input.press('Escape')
    await expect(page.getByTestId('company-search-suggestions')).toBeHidden()
  })
})
