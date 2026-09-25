/**
 * Integration tests for the territory hub (NEW in the redesign — there was no
 * hub spec before).
 *
 * Route: /ins/teritorii/$siruta
 * Synthetic native contract fixtures; see the fixture README.
 * The hub is exactly two POSTs: dashboard+identity, then counts+benchmarks.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'
import type { Page } from '@playwright/test'

const ROUTE = '/ins/teritorii/54975'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('StatisticsTerritoryHub', 'hub-cluj')
  await mockApi.mockGraphQL('StatisticsTerritoryHubContext', 'hub-context-cluj')
  // The place, its county and Romania: one recorded payload answers all three.
  await mockApi.mockGraphQL('TerritoryDerivedIndicators', 'derived-cluj')
}

/** GraphQL POSTs by operation, so the hub's own budget is not charged for the sections below it. */
function countGraphQLPosts(page: Page): {
  readonly count: (operations?: readonly string[]) => number
} {
  const posts: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/graphql') && request.method() === 'POST') {
      const body = request.postDataJSON() as { operationName?: string; query?: string } | null
      posts.push(body?.operationName ?? /query\s+(\w+)/.exec(body?.query ?? '')?.[1] ?? '')
    }
  })
  return {
    count: (operations) =>
      operations ? posts.filter((name) => operations.includes(name)).length : posts.length,
  }
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

    // „MUNICIPIUL CLUJ-NAPOCA" on the wire; the place, then its kind, on the page.
    await expect(
      page.getByRole('heading', { level: 1, name: 'Cluj-Napoca' }),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('municipiu', { exact: true })).toBeVisible()

    // Hierarchy breadcrumb: comună → județ → România.
    await expect(page.getByText(/județul Cluj/).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'România' })).toBeVisible()

    // What the page holds for THIS place, never a fact about the whole catalog.
    await expect(page.getByText(/\d+ indicatori cu date/)).toBeVisible()
    await expect(page.getByText(/date până în/)).toBeVisible()

    // The references close a headline tile as two rows: the county, then Romania.
    const headline = page.locator('article').first()
    await expect(headline.getByText('Județul Cluj')).toBeVisible()
    await expect(headline.getByText('România', { exact: true })).toBeVisible()

    // The source is said once, in the header — no per-tile source button.
    await expect(page.getByRole('link', { name: /INS Tempo/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sursă/ })).toHaveCount(0)

    // Per-tile compare affordance: an icon named for what it compares.
    await expect(
      page.getByRole('link', { name: /^Compară cu/ }).first(),
    ).toBeVisible()
  })

  test('stays inside the two-POST budget', async ({ page }) => {
    const posts = countGraphQLPosts(page)
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Cluj-Napoca' }),
    ).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    expect(
      posts.count(['StatisticsTerritoryHub', 'StatisticsTerritoryHubContext']),
    ).toBeLessThanOrEqual(2)
  })

  test('the indicators per inhabitant read the place, its county and Romania, all shown', async ({
    page,
  }) => {
    const posts = countGraphQLPosts(page)
    // Which scope each read asks for: every alias of one document shares it.
    const scopes: string[] = []
    page.on('request', (request) => {
      if (!request.url().includes('/graphql') || request.method() !== 'POST') return
      const body = request.postDataJSON() as {
        operationName?: string
        query?: string
        variables?: Record<string, { sirutaCodes?: string[]; territoryCodes?: string[] }>
      } | null
      const operation = body?.operationName ?? /query\s+(\w+)/.exec(body?.query ?? '')?.[1]
      if (operation !== 'TerritoryDerivedIndicators') return
      const filters = Object.values(body?.variables ?? {})
      const place = [...new Set(filters.map((f) => JSON.stringify(f.sirutaCodes ?? f.territoryCodes)))]
      scopes.push(`${filters[0]?.sirutaCodes ? 'siruta' : 'territory'}:${place.join('|')}`)
    })
    await page.goto(ROUTE)
    await waitForPageReady(page)
    const section = page.getByRole('region', { name: 'Indicatori raportați la populație' })
    await section.scrollIntoViewIfNeeded()

    // Eight tiles, the first the birth rate over three years; nothing folded.
    await expect(section.getByRole('heading', { name: 'Născuți-vii' })).toBeVisible({ timeout: 15000 })
    await expect(section.locator('article')).toHaveCount(8)
    expect(posts.count(['TerritoryDerivedIndicators'])).toBe(3)
    // The place by SIRUTA, its county and Romania by code — never the place three times.
    expect(scopes.sort()).toEqual(['siruta:["54975"]', 'territory:["CJ"]', 'territory:["RO"]'])

    // Every indicator in one dropdown, open, each with how it is computed.
    await expect(
      section.getByRole('button', { name: /Toți indicatorii, cu județul și țara/ }),
    ).toHaveAttribute('aria-expanded', 'true')
    await section.getByRole('button', { name: 'Cum se calculează: Născuți-vii' }).click()
    await expect(section.getByText('Σ POP201D / Σ POP108D × 1.000')).toBeVisible()
  })

  test('the period filter writes ?period=, shows Filtrat, and clears', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Cluj-Napoca' }),
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
    await page.goto('/ins/teritorii/nu-e-siruta')
    await waitForPageReady(page)

    await expect(page.getByText('Teritoriu negăsit')).toBeVisible({ timeout: 15000 })
    expect(posts.count()).toBe(0)
  })
})
