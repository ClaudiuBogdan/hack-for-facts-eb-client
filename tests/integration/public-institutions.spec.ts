/**
 * /public-institutions: the ranking first, the breakdown under it, the filters
 * on request (owner, 25 November 2026).
 *
 * The server render reads the API it is given (CI: the dev API), so what the
 * first HTML holds is real data; reads made in the browser (a change of
 * selection, the year before, the breakdown) answer from this flow's
 * fixtures. The assertions hold for both: structure and behaviour, not
 * amounts.
 */

import { test, expect } from '../utils/ssr-api/test'
import { waitForHydration } from '../utils/test-helpers'

const HEADLINE = { level: 1 } as const

test.describe('Public institutions page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mockGraphQL('EntityAnalytics', 'entity-analytics')
    await mockApi.mockGraphQL('AggregatedLineItems', 'aggregated-line-items')
    await mockApi.mockGraphQL('GetExecutionLineItemsAnalytics', 'execution-analytics')
  })

  test('says the selection as its headline and ranks the institutions', async ({ page }) => {
    await page.goto('/public-institutions')
    await waitForHydration(page)
    await expect(page.getByRole('heading', { ...HEADLINE, name: /cheltuielile instituțiilor publice|public institutions' spending/i })).toBeVisible()
    const ranking = page.getByRole('region', { name: /clasament|ranking/i })
    await expect(ranking.locator('tbody tr').first()).toBeVisible()
    await expect(ranking.locator('tbody tr a[href^="/entities/"]').first()).toBeVisible()
    await expect(page.getByRole('region', { name: /cifre-cheie|key figures/i })).toBeVisible()
  })

  test('changes the headline and reads again when the reader picks income', async ({ page }) => {
    await page.goto('/public-institutions')
    await waitForHydration(page)
    await page.getByRole('group', { name: /cheltuieli sau venituri|spending or revenue/i }).getByRole('button', { name: /^(venituri|revenue)$/i }).click()
    await expect(page.getByRole('heading', { ...HEADLINE, name: /veniturile instituțiilor publice|public institutions' revenue/i })).toBeVisible()
    await expect(page).toHaveURL(/account_category.*vn/)
    await expect(page.getByRole('region', { name: /clasament|ranking/i }).locator('tbody tr').first()).toBeVisible()
  })

  test('shows the per-inhabitant column when the reader measures per inhabitant', async ({ page }) => {
    await page.goto('/public-institutions')
    await waitForHydration(page)
    await page.getByRole('group', { name: /cum se măsoară|how it is measured/i }).getByRole('button', { name: /^(pe locuitor|per resident)$/i }).click()
    await expect(page.getByRole('columnheader', { name: /pe locuitor|per resident/i })).toBeVisible()
  })

  test('opens every filter in a sheet', async ({ page }) => {
    await page.goto('/public-institutions')
    await waitForHydration(page)
    await page.getByRole('button', { name: /^filtre|^filters/i }).first().click()
    await expect(page.getByRole('dialog').getByRole('heading', { name: /toate filtrele|all filters/i })).toBeVisible()
  })

  test('opens an old line-items link at the breakdown', async ({ page }) => {
    await page.goto('/public-institutions?view=line-items')
    await waitForHydration(page)
    const breakdown = page.getByRole('region', { name: /pe ce se cheltuie banii|what the money is spent on/i })
    await expect(breakdown).toBeInViewport({ timeout: 15000 })
  })
})

// The first mock registered for an operation answers it, so the failure is registered before the others.
test.describe('Public institutions page, when the API fails', () => {
  test('says when the ranking cannot be read, with a way to try again', async ({ page, mockApi }) => {
    await mockApi.mockGraphQL('EntityAnalytics', 'entity-analytics', { status: 500 })
    await mockApi.mockGraphQL('AggregatedLineItems', 'aggregated-line-items')
    await mockApi.mockGraphQL('GetExecutionLineItemsAnalytics', 'execution-analytics')
    await page.goto('/public-institutions')
    await waitForHydration(page)
    // A change of selection reads in the browser, where the API now fails.
    await page.getByRole('group', { name: /rapoartele|the reports/i }).getByRole('button', { name: /detaliat|detailed/i }).click()
    await expect(page.getByRole('alert').filter({ hasText: /clasamentul nu a putut fi citit|ranking could not be read/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /încearcă din nou|try again/i }).first()).toBeVisible()
  })

  test('explains a selection the API cannot answer, as the old page did', async ({ page, mockApi }) => {
    await mockApi.mockGraphQL('AggregatedLineItems', 'aggregated-line-items')
    await mockApi.mockGraphQL('GetExecutionLineItemsAnalytics', 'execution-analytics')
    await page.route('**/api/v1/graphql', async (route) => {
      if (!route.request().postDataJSON()?.query?.includes('query EntityAnalytics')) return route.fallback()
      await route.fulfill({ json: { errors: [{ message: 'CPI is unavailable for 2025', extensions: { code: 'SERVICE_UNAVAILABLE' } }] } })
    })
    await page.goto('/public-institutions')
    await waitForHydration(page)
    await page.getByRole('group', { name: /rapoartele|the reports/i }).getByRole('button', { name: /detaliat|detailed/i }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'CPI is unavailable for 2025' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('alert').filter({ hasText: /nominal RON|valori nominale în lei/ })).toBeVisible()
  })
})
