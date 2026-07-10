/**
 * Integration tests for the statistics landing territory search.
 *
 * Route: /statistici
 * GraphQL is mocked (fixtures under tests/fixtures/statistics-landing-search-flow/).
 * The landing fires `InsDatasets` (catalog + coverage ribbon) and, once the
 * search input has been debounced, `InsTerritories`. Term-matched variants are
 * registered most-specific-first; the empty-result fallback is registered last.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const ROUTE = '/statistici'
const SEARCH_INPUT = '#statistics-territory-search'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('InsDatasets', 'datasets-catalog')
  await mockApi.mockGraphQL('InsDatasetsByCodes', 'datasets-catalog')

  await mockApi.mockGraphQL('InsTerritories', 'territories-cluj', {
    variables: { filter: { search: 'cluj' } },
  })
  await mockApi.mockGraphQL('InsTerritories', 'territories-empty')
}

test.describe('Statistics landing — territory search', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('does not search below the minimum term length', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await page.locator(SEARCH_INPUT).fill('c')
    await expect(
      page.getByText('Scrie cel puțin două caractere pentru a căuta.'),
    ).toBeVisible()
    await expect(page).not.toHaveURL(/q=/)
  })

  test('writes ?q= only after the debounce, then renders results', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await page.locator(SEARCH_INPUT).fill('cluj')

    // The URL must not update on the keystroke itself.
    await expect(page).not.toHaveURL(/q=cluj/, { timeout: 200 })
    await expect(page).toHaveURL(/q=cluj/, { timeout: 5000 })

    await expect(page.getByText('Municipiul Cluj-Napoca')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Municipiul Turda')).toBeVisible()
  })

  test('navigates to the territory hub on a result click', async ({ page }) => {
    await page.goto(`${ROUTE}?q=cluj`)
    await waitForPageReady(page)

    await page.getByRole('link', { name: /Municipiul Cluj-Napoca/ }).click()
    await expect(page).toHaveURL(/\/statistici\/teritorii\/54975/)
  })

  test('shows county rows as non-navigable, since they carry no SIRUTA', async ({
    page,
  }) => {
    await page.goto(`${ROUTE}?q=cluj`)
    await waitForPageReady(page)

    await expect(
      page.getByText('Nu are cod SIRUTA — hub-ul teritorial nu este disponibil.'),
    ).toBeVisible({ timeout: 15000 })
  })

  test('reports no matches rather than an empty page', async ({ page }) => {
    await page.goto(`${ROUTE}?q=zzzz`)
    await waitForPageReady(page)

    await expect(
      page.getByText('Niciun teritoriu nu se potrivește cu acest termen.'),
    ).toBeVisible({ timeout: 15000 })
  })

  test('restores the search term from a deep link', async ({ page }) => {
    await page.goto(`${ROUTE}?q=cluj`)
    await waitForPageReady(page)

    await expect(page.locator(SEARCH_INPUT)).toHaveValue('cluj')
  })
})
