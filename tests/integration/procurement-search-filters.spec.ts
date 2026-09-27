/**
 * Integration tests for the procurement explorer's list — Enter-committed
 * search, active filter chips, grain switching — and for the addresses that
 * lead to it: the explorer lives at `/procurement/search` since the front door
 * took `/procurement`, and an old `/procurement` link carrying an explorer
 * choice is redirected there.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { Page } from '@playwright/test'

const ROUTE = '/procurement/search'

/** The explorer's list view, with more of its address after it. */
const list = (params = '') => `${ROUTE}?view=list${params ? `&${params}` : ''}`

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

test.describe('Procurement search — unified hub query, filters, grain', () => {
  test.beforeEach(async ({ page }) => {
    await useEnglishLocale(page)
  })

  test('typing stays local until Enter commits ?q= to the URL', async ({
    page,
  }) => {
    await page.goto(list())
    await waitForPageReady(page)

    await searchBox(page).fill('spital')
    expect(queryParam(page)).toBeNull()
    await searchBox(page).press('Enter')
    await expect.poll(() => queryParam(page)).toBe('spital')
  })

  test('an old /procurement link carrying an explorer choice lands in the explorer', async ({
    page,
  }) => {
    await page.goto('/procurement?view=list&q=spital')
    await waitForPageReady(page)

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe('/procurement/search')
    await expect
      .poll(() => new URL(page.url()).searchParams.get('view'))
      .toBe('list')
    expect(queryParam(page)).toBe('spital')
    await expect(searchBox(page)).toHaveValue('spital')
  })

  test('/procurement is the front door', async ({ page }) => {
    await page.goto('/procurement')
    await expect(
      page.getByRole('heading', { level: 1, name: /What the state buys/ }),
    ).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/procurement')
  })

  test('the search form has no submit button', async ({ page }) => {
    await page.goto(list())
    await waitForPageReady(page)
    await expect(searchBox(page)).toBeVisible()

    await expect(searchForm(page).locator('button[type="submit"]')).toHaveCount(0)
    await expect(
      searchForm(page).getByRole('button', { name: 'Search', exact: true }),
    ).toHaveCount(0)
  })

  test('clearing the draft and pressing Enter drops ?q= from the URL', async ({
    page,
  }) => {
    await page.goto(list('q=spital'))
    await waitForPageReady(page)
    await expect(searchBox(page)).toHaveValue('spital')

    await searchBox(page).fill('')
    await searchBox(page).press('Enter')

    await expect.poll(() => queryParam(page)).toBeNull()
    await expect(searchBox(page)).toHaveValue('')
  })

  test('an externally-removed query syncs back into the box', async ({ page }) => {
    await page.goto(list('q=spital'))
    await waitForPageReady(page)
    await expect(searchBox(page)).toHaveValue('spital')

    await page.goto(list())
    await waitForPageReady(page)

    await expect(searchBox(page)).toHaveValue('')
  })

  test('the filter trigger badges the active count, chips render and clear-all resets', async ({
    page,
  }) => {
    await page.goto(list('q=spital&source=seap&year=2024'))
    await waitForPageReady(page)

    const trigger = page.getByRole('button', { name: /Filters/ })
    await expect(trigger).toContainText('4')

    const periodChip = page.getByRole('button', {
      name: 'Remove filter Period',
    })
    const queryChip = page.getByRole('button', {
      name: 'Remove filter Query',
    })
    const metricChip = page.getByRole('button', {
      name: 'Remove filter Metric',
    })
    const sourceChip = page.getByRole('button', {
      name: 'Remove filter Source',
    })
    await expect(periodChip).toBeVisible()
    await expect(queryChip).toBeVisible()
    await expect(metricChip).toBeVisible()
    await expect(sourceChip).toBeVisible()

    await sourceChip.click()
    await expect.poll(() => new URL(page.url()).searchParams.get('source')).toBeNull()
    await expect(trigger).toContainText('3')
    expect(queryParam(page)).toBe('spital')

    await page.getByRole('button', { name: 'Clear all' }).click()

    await expect.poll(() => new URL(page.url()).searchParams.get('year')).toBeNull()
    await expect.poll(() => queryParam(page)).toBeNull()
    await expect(
      page.getByRole('button', { name: 'Remove filter Query' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Remove filter Source' }),
    ).toHaveCount(0)
    // Clearing restores the default period and metric rather than hiding the
    // hub's active analytics scope.
    await expect(
      page.getByRole('button', { name: 'Remove filter Period' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Remove filter Metric' }),
    ).toBeVisible()
    await expect(trigger).toContainText('2')
  })

  test('changing grain resets page to 1', async ({ page }) => {
    await page.goto(list('page=2'))
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
