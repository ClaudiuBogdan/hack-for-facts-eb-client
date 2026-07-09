/**
 * Integration tests for the proiecte (laws) tab's PNRR-style search — the
 * debounced auto-applying input (no submit button), the side filter sheet with
 * chips, and legacy-URL compatibility.
 *
 * Route: /parlament?tab=proiecte
 * GraphQL is mocked (fixtures under tests/fixtures/parliament-bills-search-flow/).
 * `ParliamentBills` variants are keyed by the exact `filter` variable
 * (buildBillsFilter tokens: q → {q:{contains}}, billType guvern → 'government').
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const ROUTE = '/parlament?tab=proiecte'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('ParliamentBills', 'bills-q', {
    variables: { filter: { q: { contains: 'buget' } } },
  })
  await mockApi.mockGraphQL('ParliamentBills', 'bills-guvern', {
    variables: { filter: { billType: { eq: 'government' } } },
  })
  await mockApi.mockGraphQL('ParliamentBills', 'bills')
}

test.describe('Laws tab — debounced search + filter sheet', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('typing auto-applies after the debounce — no search button', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(
      page.getByText('Proiect de Lege privind educația națională'),
    ).toBeVisible({ timeout: 15000 })
    // The old submit-driven form is gone.
    await expect(page.getByRole('button', { name: 'Caută' })).toHaveCount(0)

    await page.locator('#bills-q').fill('buget')

    await expect
      .poll(() => new URL(page.url()).searchParams.get('q'))
      .toBe('buget')
    await expect(
      page.getByText('Proiect de Lege privind bugetul de stat pe anul 2027'),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Conține: buget')).toBeVisible()
  })

  test('the filter sheet applies immediately and chips are removable', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(
      page.getByText('Proiect de Lege privind educația națională'),
    ).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /Filtre/ }).click()
    await page.getByRole('radio', { name: 'Proiect al Guvernului' }).click()

    await expect
      .poll(() => new URL(page.url()).searchParams.get('billType'))
      .toBe('guvern')

    // Two buttons are named "Închide" (footer + the sheet's built-in X).
    await page.keyboard.press('Escape')
    await expect(
      page.getByText('Tip: Proiect al Guvernului'),
    ).toBeVisible({ timeout: 15000 })

    await page
      .getByRole('button', { name: /Elimină filtrul Tip: Proiect al Guvernului/ })
      .click()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('billType'))
      .toBeNull()
  })

  test('a legacy URL with filter params still filters (byte-compatible schema)', async ({
    page,
  }) => {
    await page.goto(`${ROUTE}&billType=guvern`)
    await waitForPageReady(page)

    await expect(page.getByText('Tip: Proiect al Guvernului')).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByText('Proiect de Lege privind educația națională'),
    ).toBeVisible({ timeout: 15000 })
    await page.screenshot({
      path: 'tmp/shots/parliament-bills-search.png',
      fullPage: true,
    })
  })
})
