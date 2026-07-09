/**
 * Integration tests for the procurement search tab — debounced auto-applying
 * search (no submit button), the filter sheet's active-count badge + chips, and
 * grain switching.
 *
 * Route: /procurement/search
 *
 * NOTE ON MOCKING: unlike the parliament specs, this file registers no
 * `mockApi.mockGraphQL(...)`. The procurement facade is mock-forced
 * (`PROCUREMENT_LIVE_API_READY = false` in `src/features/procurement/lib/
 * mock-mode.ts`), so `fetchProcurementSearch` resolves from the in-process
 * fixtures in `src/features/procurement/mocks/fixtures.ts` and never issues a
 * `POST /graphql`. Registering GraphQL mocks here would silently match nothing.
 * We still use the integration `test` fixture for its cookie-consent init
 * script, and we assert against the mock adapter's data. When the feature flips
 * to live, add the `ProcurementContracts` / `ProcurementAggregates` mocks here.
 *
 * The search box's debounce is 300 ms; every assertion below waits on the URL
 * or on a rendered chip via Playwright's auto-retrying matchers, never a bare
 * `waitForTimeout`.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { Page } from '@playwright/test'

const ROUTE = '/procurement/search'

/**
 * The app defaults to Romanian. Pin `en` so the role names below match the
 * English Lingui *source* strings rather than whichever msgids happen to have a
 * ro translation today. SSR reads the `user-locale` cookie; the client reads
 * localStorage first (`src/lib/i18n.tsx`, `src/routes/__root.tsx`).
 */
async function useEnglishLocale(page: Page): Promise<void> {
  await page.context().addCookies([
    { name: 'user-locale', value: 'en', url: 'http://localhost:3000' },
  ])
  await page.addInitScript(() => {
    window.localStorage.setItem('user-locale', 'en')
  })
}

const searchForm = (page: Page) => page.locator('form[role="search"]')
const searchBox = (page: Page) =>
  page.getByRole('searchbox', { name: 'Search procurement records' })

/** The `q` search param, or null when absent. */
const queryParam = (page: Page) => new URL(page.url()).searchParams.get('q')
const pageParam = (page: Page) => new URL(page.url()).searchParams.get('page')

test.describe('Procurement search — debounced query, filters, grain', () => {
  test.beforeEach(async ({ page }) => {
    await useEnglishLocale(page)
  })

  test('typing commits ?q= to the URL after the debounce, with no button click', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await searchBox(page).fill('spital')

    // Auto-waits through the 300 ms debounce.
    await expect.poll(() => queryParam(page)).toBe('spital')
  })

  test('the search form has no submit button', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(searchBox(page)).toBeVisible()

    await expect(searchForm(page).locator('button[type="submit"]')).toHaveCount(0)
    await expect(
      searchForm(page).getByRole('button', { name: 'Search', exact: true }),
    ).toHaveCount(0)
  })

  test('the clear button drops ?q= from the URL', async ({ page }) => {
    await page.goto(`${ROUTE}?q=spital`)
    await waitForPageReady(page)
    await expect(searchBox(page)).toHaveValue('spital')

    await page.getByRole('button', { name: 'Clear search' }).click()

    await expect.poll(() => queryParam(page)).toBeNull()
    await expect(searchBox(page)).toHaveValue('')
  })

  test('an externally-removed query syncs back into the box', async ({ page }) => {
    await page.goto(`${ROUTE}?q=spital`)
    await waitForPageReady(page)
    await expect(searchBox(page)).toHaveValue('spital')

    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(searchBox(page)).toHaveValue('')
  })

  test('the filter trigger badges the active count, chips render and clear-all resets', async ({
    page,
  }) => {
    // `q` is not a facet: it carries no chip and clear-all keeps it.
    await page.goto(`${ROUTE}?q=spital&source=seap&year=2024`)
    await waitForPageReady(page)

    const trigger = page.getByRole('button', { name: /Filters/ })
    await expect(trigger).toContainText('2')

    await expect(
      page.getByRole('button', { name: 'Remove filter Year: 2024' }),
    ).toBeVisible()
    const sourceChip = page.getByRole('button', {
      name: 'Remove filter Source: SEAP / SICAP',
    })
    await expect(sourceChip).toBeVisible()

    // Removing one chip leaves the other and keeps `q`.
    await sourceChip.click()
    await expect.poll(() => new URL(page.url()).searchParams.get('source')).toBeNull()
    await expect(trigger).toContainText('1')
    expect(queryParam(page)).toBe('spital')

    await page.getByRole('button', { name: 'Clear all' }).click()

    await expect.poll(() => new URL(page.url()).searchParams.get('year')).toBeNull()
    await expect(
      page.getByRole('button', { name: /^Remove filter/ }),
    ).toHaveCount(0)
    expect(queryParam(page)).toBe('spital')
  })

  test('changing grain resets page to 1', async ({ page }) => {
    await page.goto(`${ROUTE}?page=2`)
    await waitForPageReady(page)
    expect(pageParam(page)).toBe('2')

    await page.getByRole('radio', { name: 'Direct acquisitions' }).click()

    await expect
      .poll(() => new URL(page.url()).searchParams.get('grain'))
      .toBe('direct_acquisitions')
    // `page: 1` is the default, so `cleanProcurementSearch` strips it entirely.
    await expect.poll(() => pageParam(page)).toBeNull()
  })
})
