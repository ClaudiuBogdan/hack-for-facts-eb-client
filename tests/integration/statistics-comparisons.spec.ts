/**
 * Integration tests for territory-first comparisons (mixed levels).
 *
 * Route: /statistici/comparatii
 * Fixtures captured from the live API. The RESULTS are always ONE
 * InsObservations POST; picker/metadata requests are separate and declared.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'
import type { Page } from '@playwright/test'

const MIXED_LINK =
  '/statistici/comparatii?cod=FOM104D&teritorii=%5B%22siruta%3A54975%22%2C%22cod%3ACJ%22%2C%22cod%3ARO%22%5D'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  // Most specific first: the same-level example trio, then the mixed link.
  await mockApi.mockGraphQL('InsObservations', 'observations-three-cities', {
    variables: { filter: { territoryCodes: ['54975', '95060', '155243'] } },
  })
  await mockApi.mockGraphQL('InsObservations', 'observations-mixed')
  await mockApi.mockGraphQL('InsDatasetDetails', 'dataset-details-fom104d')
  await mockApi.mockGraphQL('InsDatasetDimensionValues', 'dimension-values-fom104d-3')
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'datasets-available')
  await mockApi.mockGraphQL('InsTerritories', 'territory-identity-cluj', {
    variables: { filter: { sirutaCodes: ['54975'] } },
  })
  await mockApi.mockGraphQL('InsTerritories', 'territories-search-turda')
}

function countOperationPosts(page: Page, operation: string): { readonly count: () => number } {
  let posts = 0
  page.on('request', (request) => {
    if (!request.url().includes('/graphql') || request.method() !== 'POST') return
    try {
      const body = JSON.parse(request.postData() ?? '{}') as { query?: string }
      if (body.query?.includes(`query ${operation}`)) posts += 1
    } catch {
      // Non-JSON bodies are not GraphQL operations.
    }
  })
  return { count: () => posts }
}

test.describe('Comparisons — mixed territory levels', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('a mixed-level deep link renders all three levels from ONE observations POST', async ({
    page,
  }) => {
    const observationPosts = countOperationPosts(page, 'InsObservations')
    await page.goto(MIXED_LINK)
    await waitForPageReady(page)

    // All three levels, and the API's literal TOTAL renders as România.
    await expect(page.getByText(/MUNICIPIUL CLUJ-NAPOCA/i).first()).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText('România').first()).toBeVisible()
    // The table prints the wire's decimal strings VERBATIM (same principle
    // as the detail observations table); formatted numbers live in the charts.
    await expect(page.getByRole('table')).toContainText('195025')
    await expect(page.getByRole('table')).toContainText('261239')
    await expect(page.getByRole('table')).toContainText('5453155')

    await page.waitForTimeout(1500)
    expect(observationPosts.count()).toBe(1)
  })

  test('below two territories the worked example renders LIVE, marked exemplu', async ({
    page,
  }) => {
    await page.goto('/statistici/comparatii')
    await waitForPageReady(page)

    await expect(page.getByText('exemplu live')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('table')).toContainText('195025')
    await expect(
      page.getByRole('button', { name: /Folosește acest exemplu/ }),
    ).toBeVisible()

    // Presets are URL bundles.
    await expect(
      page.getByRole('link', { name: /Cele mai mari 6 orașe/ }),
    ).toBeVisible()
  })

  test('adopting the example writes the URL bundle', async ({ page }) => {
    await page.goto('/statistici/comparatii')
    await waitForPageReady(page)
    await expect(page.getByText('exemplu live')).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /Folosește acest exemplu/ }).click()

    await expect
      .poll(
        () =>
          decodeURIComponent(
            new URL(page.url()).searchParams.get('teritorii') ?? '',
          ),
        { timeout: 5000 },
      )
      .toContain('siruta:54975')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('cod'), { timeout: 5000 })
      .toBe('FOM104D')
  })

  test('the peer chip adds România as a cod: token (URL contract)', async ({
    page,
  }) => {
    await page.goto(
      '/statistici/comparatii?cod=FOM104D&teritorii=%5B%22siruta%3A54975%22%5D',
    )
    await waitForPageReady(page)

    await page.getByRole('button', { name: /România/ }).first().click()

    await expect
      .poll(
        () =>
          decodeURIComponent(
            new URL(page.url()).searchParams.get('teritorii') ?? '',
          ),
        { timeout: 5000 },
      )
      .toContain('cod:RO')
  })

  test('removing a territory chip updates teritorii[]', async ({ page }) => {
    await page.goto(MIXED_LINK)
    await waitForPageReady(page)
    await expect(page.getByText(/MUNICIPIUL CLUJ-NAPOCA/i).first()).toBeVisible({
      timeout: 15000,
    })

    // Remove the county chip.
    await page
      .getByRole('button', { name: /Elimină filtrul|Cluj$/ })
      .filter({ hasText: /^Cluj$/ })
      .first()
      .click()
      .catch(async () => {
        // Chip remove buttons carry the label text; fall back to any chip
        // whose accessible name mentions the county alone.
        await page.getByLabel(/Elimină.*Cluj/).first().click()
      })

    await expect
      .poll(
        () =>
          decodeURIComponent(
            new URL(page.url()).searchParams.get('teritorii') ?? '',
          ),
        { timeout: 5000 },
      )
      .not.toContain('cod:CJ')
  })
})
