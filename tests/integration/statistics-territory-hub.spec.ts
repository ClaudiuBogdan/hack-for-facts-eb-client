/**
 * Integration tests for the territory hub (NEW in the redesign — there was no
 * hub spec before).
 *
 * Route: /statistici/teritorii/$siruta
 * Synthetic native contract fixtures; see the fixture README.
 * The hub is exactly two POSTs: dashboard+identity, then counts+benchmarks.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'
import type { Page } from '@playwright/test'

const ROUTE = '/statistici/teritorii/54975'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('StatisticsTerritoryHub', 'hub-cluj')
  await mockApi.mockGraphQL('StatisticsTerritoryHubContext', 'hub-context-cluj')
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

test.describe('Territory hub', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('renders identity, breadcrumb, tiles, benchmarks, and exact coverage', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(
      page.getByRole('heading', { level: 1, name: /MUNICIPIUL CLUJ-NAPOCA/i }),
    ).toBeVisible({ timeout: 15000 })

    // Hierarchy breadcrumb: comună → județ → România.
    await expect(page.getByText(/județul Cluj/).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'România' })).toBeVisible()

    // Exact counts — never a clamped-page ratio.
    await expect(page.getByText(/1\.898 din 1\.898/)).toBeVisible()

    // Benchmark line on a headline tile (county + national references).
    await expect(page.getByText(/Județ:/).first()).toBeVisible()
    await expect(page.getByText(/România:/).first()).toBeVisible()

    // Per-tile compare affordance.
    await expect(
      page.getByRole('link', { name: /Compară/ }).first(),
    ).toBeVisible()
  })

  test('stays inside the two-POST budget', async ({ page }) => {
    const posts = countGraphQLPosts(page)
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(
      page.getByRole('heading', { level: 1, name: /MUNICIPIUL CLUJ-NAPOCA/i }),
    ).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    expect(posts.count()).toBeLessThanOrEqual(2)
  })

  test('the period filter writes ?period=, shows Filtrat, and clears', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(
      page.getByRole('heading', { level: 1, name: /MUNICIPIUL CLUJ-NAPOCA/i }),
    ).toBeVisible({ timeout: 15000 })

    await page.locator('#statistics-hub-period').click()
    await page.getByRole('option', { name: '2024', exact: true }).click()

    // The URL contract for ?period=.
    await expect
      .poll(
        () =>
          decodeURIComponent(new URL(page.url()).searchParams.get('period') ?? ''),
        { timeout: 5000 },
      )
      .toContain('2024')

    await expect(page.getByText(/Filtrat/)).toBeVisible()
    await page.getByRole('button', { name: /Șterge filtrul/ }).first().click()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('period'), { timeout: 5000 })
      .toBeNull()
  })

  test('a deep-linked period with no matching series shows the honest notice', async ({
    page,
  }) => {
    await page.goto(`${ROUTE}?period=2005`)
    await waitForPageReady(page)

    await expect(
      page.getByText(/Perioada 2005 nu este disponibilă în rezultatele încărcate/),
    ).toBeVisible({ timeout: 15000 })
    await expect(
      page.getByRole('button', { name: /Șterge filtrul de perioadă/ }),
    ).toBeVisible()
  })

  test('a malformed SIRUTA renders not-found without a request', async ({ page }) => {
    const posts = countGraphQLPosts(page)
    await page.goto('/statistici/teritorii/nu-e-siruta')
    await waitForPageReady(page)

    await expect(page.getByText('Teritoriu negăsit')).toBeVisible({ timeout: 15000 })
    expect(posts.count()).toBe(0)
  })
})
