/**
 * Integration tests for the dataset detail disclosure ladder.
 *
 * Route: /statistici/seturi/$cod
 * Synthetic native contract fixtures; see the fixture README. Tier zero,
 * one complete source page and the related catalog are separate operations.
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
  await mockApi.mockGraphQL('InsSourceObservations', 'series-pop107d-feminin', {
    variables: {
      filter: {
        territoryLevels: ['NATIONAL'],
        classificationValueCodes: ['100', '107', '931', '932'],
        classificationTypeCodes: ['D0', 'D1', 'D2', 'D3'],
        unitCodes: ['0'],
      },
    },
  })
  await mockApi.mockGraphQL('InsSourceObservations', 'series-pop107d')

  await mockApi.mockGraphQL('StatisticsRelatedDatasets', 'related-pop107d')

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

  test('tier 0 stays inside the three-operation single-page budget', async ({ page }) => {
    const posts = countGraphQLPosts(page)
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText('21.739.373')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    expect(posts.count()).toBe(3)
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
      .toContain('D1:107')

    // The hero re-resolves to the pinned cell, (implicit) drops for it.
    await expect(page.getByText('11.136.500')).toBeVisible({ timeout: 15000 })
  })

  test('an unknown code renders not-found, not an error page', async ({ page }) => {
    await page.goto('/statistici/seturi/NUEXISTA')
    await waitForPageReady(page)

    await expect(page.getByText('Set de date negăsit')).toBeVisible({ timeout: 15000 })
  })
})
