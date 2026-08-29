/**
 * Integration tests for the dataset detail disclosure ladder.
 *
 * Route: /statistici/seturi/$cod
 * Fixtures captured from the live API. In this harness the SSR loader has no
 * API, so POST A (tier 0) and POST B (series+related) fetch client-side and
 * are counted against the two-POST budget.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'
import type { Page } from '@playwright/test'

const ROUTE = '/statistici/seturi/POP107D'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('StatisticsDatasetTier0', 'tier0-catalog-only', {
    variables: { code: 'TUR101C' },
  })
  await mockApi.mockGraphQL('StatisticsDatasetTier0', 'tier0-not-found', {
    variables: { code: 'NUEXISTA' },
  })
  await mockApi.mockGraphQL('StatisticsDatasetTier0', 'tier0-pop107d')

  // Most specific first: the pinned FEMININ scope, then the default cell.
  await mockApi.mockGraphQL('StatisticsDatasetSeries', 'series-pop107d-feminin', {
    variables: {
      filter: {
        territoryLevels: ['NATIONAL'],
        classificationValueCodes: ['FEMININ', 'TOTAL'],
        classificationTypeCodes: ['SEX', 'AGE_GROUP'],
        unitCodes: ['PERSONS'],
      },
    },
  })
  await mockApi.mockGraphQL('StatisticsDatasetSeries', 'series-pop107d')

  await mockApi.mockGraphQL('InsDatasetDimensionValues', 'dimension-values-sex')
}

function countGraphQLPosts(page: Page): { readonly count: () => number } {
  let posts = 0
  page.on('request', (request) => {
    if (request.url().includes('/graphql') && request.method() === 'POST') {
      posts += 1
    }
  })
  return { count: () => posts }
}

test.describe('Dataset detail — the disclosure ladder', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('tier 0 is useful with ZERO interactions', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    // The latest resolved value, LARGE, with unit and period.
    await expect(page.getByText('21.739.373')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('pers.').first()).toBeVisible()

    // Provenance chips: INS Tempo + the matrix code, never in title position.
    await expect(page.getByText('INS Tempo').first()).toBeVisible()
    await expect(page.getByText('POP107D').first()).toBeVisible()

    // The scope sentence marks server-resolved defaults: dotted underline +
    // ONE legend line on desktop; "(implicit)" lives in the aria-label.
    await expect(
      page.getByText(/Valorile subliniate punctat/),
    ).toBeVisible()
    await expect(page.getByLabel(/\(implicit\)/).first()).toBeVisible()

    // Trend chart under the number.
    await expect(page.locator('.recharts-responsive-container')).toBeVisible()

    // Tiers 2–3 are closed accordion rows labeled with their answers.
    await expect(page.getByText(/Tabelul seriei \(/)).toBeVisible()
    await expect(page.getByText(/Dimensiuni și clasificări/)).toBeVisible()
    await expect(page.getByText(/Proveniență și limite/)).toBeVisible()
  })

  test('tier 0 stays inside the two-POST budget', async ({ page }) => {
    const posts = countGraphQLPosts(page)
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText('21.739.373')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    expect(posts.count()).toBeLessThanOrEqual(2)
  })

  test('the observations table mounts on accordion open and prints values verbatim', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText('21.739.373')).toBeVisible({ timeout: 15000 })

    await expect(page.getByRole('table')).toHaveCount(0)
    await page.getByText(/Tabelul seriei \(/).click()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('table')).toContainText('2025')
  })

  test('changing a scope segment writes the URL and re-resolves the series', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText('21.739.373')).toBeVisible({ timeout: 15000 })

    // Desktop: the Sexe segment (3 options) opens a popover holding the C4
    // INLINE list — plain aria-pressed buttons, no combobox. Segment order
    // follows the dims (Vârste first), so nth(1) is Sexe; the wire names are
    // capitalized with a trailing space, hence the /i.
    await page.locator('button', { hasText: /^total/i }).nth(1).click()
    await page.getByRole('button', { name: /Feminin/i }).click()

    // The URL contract: the pin lands in ?clasificari=.
    await expect
      .poll(
        () =>
          decodeURIComponent(
            new URL(page.url()).searchParams.get('clasificari') ?? '',
          ),
        { timeout: 5000 },
      )
      .toContain('SEX:FEMININ')

    // The hero re-resolves to the pinned cell, (implicit) drops for it.
    await expect(page.getByText('11.136.500')).toBeVisible({ timeout: 15000 })
  })

  test('catalog-only datasets keep the request body, never a fake series', async ({
    page,
  }) => {
    await page.goto('/statistici/seturi/TUR101C')
    await waitForPageReady(page)

    await expect(page.getByTestId('catalog-only-body')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'Cere set' })).toBeVisible()
    await expect(page.locator('.recharts-responsive-container')).toHaveCount(0)
  })

  test('an unknown code renders not-found, not an error page', async ({ page }) => {
    await page.goto('/statistici/seturi/NUEXISTA')
    await waitForPageReady(page)

    await expect(page.getByText('Set de date negăsit')).toBeVisible({ timeout: 15000 })
  })
})
