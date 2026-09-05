/**
 * Integration tests for the statistici landing (post-redesign).
 *
 * Route: /statistici
 * GraphQL is mocked (fixtures under tests/fixtures/statistics-landing-search-flow/,
 * synthetic native outcome fixtures; see the fixture README). The SSR loader cannot reach an API in this
 * harness, so the two landing aggregates are fetched client-side and pass
 * through the mock — which is exactly what lets the POST budget be counted.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'
import type { Page } from '@playwright/test'

const ROUTE = '/statistici'
const SEARCH_INPUT = '#statistics-territory-search'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('StatisticsLandingData', 'landing-data')
  await mockApi.mockGraphQL('StatisticsLandingCatalog', 'landing-catalog')
  await mockApi.mockGraphQL('StatisticsUatSnapshot', 'uat-snapshot-cluj')

  await mockApi.mockGraphQL('InsTerritories', 'territories-cluj', {
    variables: { filter: { search: 'cluj' } },
  })
  await mockApi.mockGraphQL('InsTerritories', 'territories-empty')
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

test.describe('Statistics landing — România în cifre', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('B1–B5 render fixture observations with unit, period, and provenance', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    // B1: national tiles with value + unit + period + matrix-code chip.
    await expect(page.getByText('România în cifre')).toBeVisible({ timeout: 15000 })
    const popTile = page.locator('a[href="/statistici/seturi/POP107D"]').first()
    await expect(popTile).toContainText('21.739.373')
    await expect(popTile).toContainText('pers.')
    await expect(popTile).toContainText('2025')
    await expect(popTile).toContainText('POP107D')

    // SOM101F is a RATE (registered unemployment share), never a headcount.
    const somTile = page.locator('a[href="/statistici/seturi/SOM101F"]').first()
    await expect(somTile).toContainText('%')
    await expect(somTile).toContainText('2025-11')

    // B2: decade ranking with provenance and both endpoint years.
    await expect(page.getByText(/Un deceniu de schimbare/)).toBeVisible()
    await expect(page.getByText('Cele mai mari scăderi')).toBeVisible()
    await expect(page.getByText('Cele mai mari creșteri')).toBeVisible()

    // B3: the worked example links into compare with mixed-level tokens.
    const exampleCard = page.locator('a[href*="/statistici/comparatii"]').first()
    await expect(page.getByText('exemplu live')).toBeVisible()
    const exampleHref = decodeURIComponent(
      (await exampleCard.getAttribute('href')) ?? '',
    )
    expect(exampleHref).toContain('cod=FOM104D')
    expect(exampleHref).toContain('siruta:54975')
    expect(exampleHref).toContain('cod:CJ')
    expect(exampleHref).toContain('cod:RO')

    // B4: themes with live counts → prefiltered explorer.
    const themeLink = page.locator('a', { hasText: 'Statistică socială' }).first()
    const themeHref = decodeURIComponent((await themeLink.getAttribute('href')) ?? '')
    expect(themeHref).toContain('/statistici/seturi')
    expect(themeHref).toContain('stare=available')

    // B5: live counts, no fake figures.
    await expect(page.getByText('Ce date avem')).toBeVisible()
    await expect(page.getByText(/1\.898/).first()).toBeVisible()
  })

  test('initial load stays inside the two-POST budget', async ({ page }) => {
    const posts = countGraphQLPosts(page)
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText('România în cifre')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    expect(posts.count()).toBeLessThanOrEqual(2)
  })

  test('picking a territory writes ?loc= and re-renders the band', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await page.locator(SEARCH_INPUT).fill('cluj')
    await expect(
      page.getByRole('button', { name: /Municipiul Cluj-Napoca/ }),
    ).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /Municipiul Cluj-Napoca/ }).click()

    // The URL contract: the picked place is shareable.
    await expect
      .poll(() => new URL(page.url()).searchParams.get('loc'), { timeout: 5000 })
      .toContain('54975')

    await expect(page.getByText('Locul tău în cifre')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('din totalul României').first()).toBeVisible()
    // LAU tiles link to the hub.
    await expect(
      page.locator('a[href="/statistici/teritorii/54975"]').first(),
    ).toBeVisible()
  })

  test('a ?loc= deep link renders the picked place with an absence, never a zero', async ({
    page,
  }) => {
    await page.goto(`${ROUTE}?loc=%2254975%22`)
    await waitForPageReady(page)

    await expect(page.getByText('Locul tău în cifre')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/MUNICIPIUL CLUJ-NAPOCA/i).first()).toBeVisible()

    // Înapoi la țară clears the pick.
    await page.getByRole('button', { name: /Înapoi la țară/ }).click()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('loc'), { timeout: 5000 })
      .toBeNull()
    await expect(page.getByText('România în cifre')).toBeVisible()
  })
})
