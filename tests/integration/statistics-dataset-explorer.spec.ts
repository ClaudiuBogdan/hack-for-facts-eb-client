/**
 * Integration tests for the INS dataset explorer.
 *
 * Route: /statistici/seturi
 * GraphQL is mocked (fixtures under tests/fixtures/statistics-dataset-explorer-flow/).
 * The page fires a single operation, `InsDatasetsExplorer`, whose `filter`
 * variable is built by `buildDatasetFilterInput`. Variable-matched variants are
 * registered most-specific-first; the unfiltered fallback is registered last.
 *
 * `filter` keys must be listed in the order `buildDatasetFilterInput` inserts
 * them (dataStatus, search, rootContextCode, periodicity, hasUatData,
 * hasCountyData) — the fixture matcher compares `JSON.stringify` output.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const ROUTE = '/statistici/seturi'
const BOTH_STATUSES = ['AVAILABLE', 'CATALOG_ONLY']

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  // Page 2 keys on the offset, not the filter.
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'page-2', {
    variables: { offset: 25 },
  })

  // Status segmented control.
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'available', {
    variables: { filter: { dataStatus: ['AVAILABLE'] } },
  })

  // Sheet filters.
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'context-annual', {
    variables: {
      filter: {
        dataStatus: BOTH_STATUSES,
        rootContextCode: '3',
        periodicity: ['ANNUAL'],
      },
    },
  })
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'context', {
    variables: { filter: { dataStatus: BOTH_STATUSES, rootContextCode: '3' } },
  })
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'annual', {
    variables: { filter: { dataStatus: BOTH_STATUSES, periodicity: ['ANNUAL'] } },
  })

  // A search term that matches nothing.
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'empty', {
    variables: { filter: { dataStatus: BOTH_STATUSES, search: 'zzzz' } },
  })

  // Unfiltered fallback — must stay last.
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'page-1')
}

function resultRows(page: import('@playwright/test').Page) {
  return page.getByRole('list', { name: 'Rezultate' }).getByRole('listitem')
}

function searchParam(page: import('@playwright/test').Page, key: string) {
  return new URL(page.url()).searchParams.get(key)
}

test.describe('Dataset explorer — search, status, filters, pagination', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('renders a full page of rows with the catalog total', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })
    expect(await resultRows(page).count()).toBe(25)
    await expect(page.getByText(/1[.,]898 seturi de date/)).toBeVisible()

    // The matrix code is provenance next to the name, which is the link.
    await expect(
      page.getByRole('link', {
        name: 'Populația după domiciliu pe sexe și grupe de vârstă',
      }),
    ).toBeVisible()
    await expect(page.getByText('POP107D')).toBeVisible()

    // Honesty badges, both flavours, on the same page.
    await expect(page.getByText('Date disponibile').first()).toBeVisible()
    await expect(page.getByText('Doar catalog').first()).toBeVisible()
  })

  test('the status control writes ?stare= and refires the query', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })

    await page.getByRole('radio', { name: 'Cu date', exact: true }).click()

    await expect.poll(() => searchParam(page, 'stare')).toBe('available')
    await expect(page.getByText(/^27 seturi de date$/)).toBeVisible({
      timeout: 15000,
    })
    expect(await resultRows(page).count()).toBe(10)
    // Catalog-only rows are gone, so no "Cere set" affordance remains.
    await expect(page.getByRole('button', { name: 'Cere set' })).toHaveCount(0)
  })

  test('sheet selections write params and the trigger badge counts them', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'Filtre', exact: true }).click()

    await page.getByRole('combobox', { name: 'Temă' }).click()
    await page.getByRole('option', { name: 'Finanțe' }).click()
    // Strings that parse as JSON round-trip quoted; `3` alone would come back a number.
    await expect.poll(() => searchParam(page, 'context')).toBe('"3"')

    await page.getByRole('checkbox', { name: 'Anual' }).click()
    await expect.poll(() => searchParam(page, 'frecventa')).toBe('["ANNUAL"]')

    await page.keyboard.press('Escape')

    await expect(
      page.getByRole('button', { name: 'Filtre (2 active)' }),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/^1 seturi de date$/)).toBeVisible()
  })

  test('removing a chip clears exactly that filter and refires', async ({
    page,
  }) => {
    // String params round-trip as JSON, which is how the app itself writes them.
    const search = new URLSearchParams({ context: '"3"', frecventa: '["ANNUAL"]' })
    await page.goto(`${ROUTE}?${search.toString()}`)
    await waitForPageReady(page)
    await expect(page.getByText(/^1 seturi de date$/)).toBeVisible({
      timeout: 15000,
    })

    await page.getByRole('button', { name: 'Elimină filtrul Temă: Finanțe' }).click()

    await expect.poll(() => searchParam(page, 'context')).toBeNull()
    await expect.poll(() => searchParam(page, 'frecventa')).toBe('["ANNUAL"]')
    await expect(page.getByText(/1[.,]412 seturi de date/)).toBeVisible({
      timeout: 15000,
    })
  })

  test('?pagina=2 requests the next offset', async ({ page }) => {
    await page.goto(`${ROUTE}?pagina=2`)
    await waitForPageReady(page)

    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })
    expect(await resultRows(page).count()).toBe(25)
    await expect(page.getByText('CTB026X')).toBeVisible()
    await expect(page.getByText('Pagina 2 din 76')).toBeVisible()

    await page.getByRole('button', { name: 'Anterioară' }).click()
    await expect.poll(() => searchParam(page, 'pagina')).toBeNull()
    await expect(page.getByText('POP107D')).toBeVisible({ timeout: 15000 })
  })

  test('a deep-linked URL restores every control', async ({ page }) => {
    const search = new URLSearchParams({
      q: 'populatie',
      stare: 'catalog-only',
      context: '"2"',
      frecventa: '["ANNUAL"]',
      uat: 'true',
      judet: 'true',
    })
    await page.goto(`${ROUTE}?${search.toString()}`)
    await waitForPageReady(page)
    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })

    await expect(page.getByLabel('Caută seturi de date')).toHaveValue('populatie')
    await expect(
      page.getByRole('radio', { name: 'Doar catalog', exact: true }),
    ).toHaveAttribute('data-state', 'on')
    await expect(
      page.getByRole('button', { name: 'Filtre (4 active)' }),
    ).toBeVisible()

    // One chip per removable filter; `stare` has a visible control instead.
    for (const label of [
      'Conține: populatie',
      'Temă: Economic',
      'Periodicitate: Anual',
      'Acoperire: UAT',
      'Acoperire: județ',
    ]) {
      await expect(page.getByRole('button', { name: `Elimină filtrul ${label}` })).toBeVisible()
    }

    // The sheet reflects the URL too.
    await page.getByRole('button', { name: 'Filtre (4 active)' }).click()
    await expect(page.getByRole('combobox', { name: 'Temă' })).toHaveText('Economic')
    await expect(page.getByRole('checkbox', { name: 'Anual' })).toBeChecked()
    await expect(
      page.getByRole('checkbox', { name: 'Date la nivel de UAT' }),
    ).toBeChecked()
    await expect(
      page.getByRole('checkbox', { name: 'Date la nivel de județ' }),
    ).toBeChecked()
  })

  test('a no-match filter shows an empty state with a clear-filters escape', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })

    // Debounced and auto-applying — there is no search button to press.
    await page.getByLabel('Caută seturi de date').fill('zzzz')
    await expect.poll(() => searchParam(page, 'q')).toBe('zzzz')

    await expect(page.getByText('Niciun set nu corespunde filtrelor')).toBeVisible({
      timeout: 15000,
    })

    await page.getByRole('button', { name: 'Șterge filtrele' }).click()
    await expect.poll(() => searchParam(page, 'q')).toBeNull()
    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })
  })

  test('a 500 renders the alert, and Reîncearcă recovers', async ({ page }) => {
    // The query client retries once, so both the initial call and its retry must
    // fail before the alert appears. Registered after the fixture route, so this
    // handler wins until it stops failing and falls through.
    let failures = 0
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() ?? ''
      if (body.includes('InsDatasetsExplorer') && failures < 2) {
        failures += 1
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'boom' }] }),
        })
      }
      return route.fallback()
    })

    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(
      page.getByText('Nu am putut încărca seturile de date'),
    ).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'Reîncearcă' }).click()

    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/1[.,]898 seturi de date/)).toBeVisible()
  })
})
