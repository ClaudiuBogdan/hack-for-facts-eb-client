/**
 * Integration tests for the INS dataset explorer.
 *
 * Route: /ins/seturi (the catalog always reads both data statuses)
 * GraphQL is mocked (fixtures under tests/fixtures/statistics-dataset-explorer-flow/).
 * The list is one operation, `InsDatasetsExplorer`, whose `filter`
 * variable is built by `buildDatasetFilterInput`; the rail reads the theme
 * counts from `StatisticsLandingCatalog` and the INS domain tree from
 * `StatisticsContextTree`. Variable-matched variants are registered
 * most-specific-first; the unfiltered fallback is registered last.
 *
 * The list fixtures predate the context tree, so their `context_*` fields
 * carry an older API shape than `context-tree.json`; nothing asserts on them.
 *
 * `filter` keys must be listed in the order `buildDatasetFilterInput` inserts
 * them (dataStatus, search, rootContextCode or contextCode, periodicity,
 * hasUatData, hasCountyData) — the fixture matcher compares `JSON.stringify`
 * output.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const ROUTE = '/ins/seturi'
const BOTH_STATUSES = ['AVAILABLE', 'CATALOG_ONLY']

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  // The rail counts themes from the catalog summary and draws the INS
  // hierarchy from the context tree (the live 340 nodes, recorded).
  await mockApi.mockGraphQL('StatisticsLandingCatalog', 'catalog')
  await mockApi.mockGraphQL('StatisticsContextTree', 'context-tree')

  // Page 2 keys on the offset, not the filter.
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'page-2', {
    variables: { offset: 25 },
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

  // A subdomain filters on the exact context the datasets hang from.
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'context-subdomain', {
    variables: { filter: { dataStatus: BOTH_STATUSES, contextCode: '1508' } },
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

test.describe('Dataset explorer — search, filters, pagination', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('renders a full page of rows with the catalog total', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })
    expect(await resultRows(page).count()).toBe(25)
    await expect(page.getByText(/1[.,]898 de seturi de date/)).toBeVisible()

    // The matrix code is provenance next to the name, which is the link.
    await expect(
      page.getByRole('link', {
        name: 'Populația după domiciliu pe sexe și grupe de vârstă',
      }),
    ).toBeVisible()
    await expect(page.getByText('POP107D')).toBeVisible()

    // The honesty badge marks only the rows without observations; an
    // „available" badge on every other row would be noise.
    await expect(page.getByText('Doar catalog').first()).toBeVisible()
    await expect(page.getByText('Date disponibile')).toHaveCount(0)
  })

  test('the header leads back to the INS hub, and carries nothing else', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })

    // The catalog is one population, and the address bar is the share
    // affordance: neither control returns without this failing.
    await expect(page.getByRole('radio', { name: 'Cu date' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Copiază link' })).toHaveCount(0)

    await page.getByRole('link', { name: 'Înapoi la statistici' }).click()

    await expect.poll(() => new URL(page.url()).pathname).toBe('/ins')
  })

  test('rail selections write params and become chips', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })

    const rail = page.getByRole('complementary', { name: 'Filtrează seturile de date' })
    await rail.getByText(/^Finanțe$/).click()
    // Strings that parse as JSON round-trip quoted; `3` alone would come back a number.
    await expect.poll(() => searchParam(page, 'context')).toBe('"3"')

    await rail.getByRole('checkbox', { name: 'Anual' }).click()
    await expect.poll(() => searchParam(page, 'frecventa')).toBe('["ANNUAL"]')

    await expect(page.getByRole('button', { name: 'Elimină filtrul Domeniu: Finanțe' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'Elimină filtrul Periodicitate: Anual' })).toBeVisible()
    await expect(page.getByText(/^un set de date$/)).toBeVisible()
  })

  test('the rail opens the INS hierarchy and filters on a subdomain', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })

    const rail = page.getByRole('complementary', { name: 'Filtrează seturile de date' })

    // A domain filters and opens; the group under it only opens, because the
    // server has no filter between a domain and an exact context.
    // Clicks go through the row text: a treeitem's box wraps its open subtree,
    // so the centre of an open row belongs to one of its children.
    await rail.getByText(/^Social$/).click()
    const group = rail.getByRole('treeitem', { name: /^A\.4 FORTA DE MUNCA/ })
    await expect(group).toBeVisible({ timeout: 15000 })
    await expect(group).not.toHaveAttribute('aria-selected')

    await rail.getByText(/^A\.4 FORTA DE MUNCA$/).click()
    await rail.getByText('4. SOMERI INREGISTRATI').click()

    await expect.poll(() => searchParam(page, 'context')).toBe('"1508"')
    await expect(
      page.getByRole('button', { name: 'Elimină filtrul Domeniu: 4. SOMERI INREGISTRATI' }),
    ).toBeVisible({ timeout: 15000 })
    // The count is the proof the `contextCode` filter reached the server: the
    // unfiltered fallback fixture would answer 1,898 and still carry this row.
    await expect(page.getByText(/^3 seturi de date$/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Șomerii înregistrați pe sexe' })).toBeVisible()
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('the sheet holds the same controls and the trigger counts them', async ({ page }) => {
      await page.goto(ROUTE)
      await waitForPageReady(page)
      await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })

      await page.getByRole('button', { name: 'Filtre', exact: true }).click()
      const sheet = page.getByRole('dialog', { name: 'Filtre' })
      await sheet.getByText(/^Finanțe$/).click()
      await expect.poll(() => searchParam(page, 'context')).toBe('"3"')
      await sheet.getByRole('checkbox', { name: 'Anual' }).click()
      await expect.poll(() => searchParam(page, 'frecventa')).toBe('["ANNUAL"]')

      await page.keyboard.press('Escape')
      await expect(page.getByRole('button', { name: 'Filtre (2 active)' })).toBeVisible({ timeout: 15000 })
      await expect(page.getByText(/^un set de date$/)).toBeVisible()
    })
  })

  test('removing a chip clears exactly that filter and refires', async ({
    page,
  }) => {
    // String params round-trip as JSON, which is how the app itself writes them.
    const search = new URLSearchParams({ context: '"3"', frecventa: '["ANNUAL"]' })
    await page.goto(`${ROUTE}?${search.toString()}`)
    await waitForPageReady(page)
    await expect(page.getByText(/^un set de date$/)).toBeVisible({
      timeout: 15000,
    })

    await page.getByRole('button', { name: 'Elimină filtrul Domeniu: Finanțe' }).click()

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
      context: '"2"',
      frecventa: '["ANNUAL"]',
      uat: 'true',
      judet: 'true',
    })
    await page.goto(`${ROUTE}?${search.toString()}`)
    await waitForPageReady(page)
    await expect(resultRows(page).first()).toBeVisible({ timeout: 15000 })

    await expect(page.getByLabel('Caută seturi de date')).toHaveValue('populatie')
    // One chip per removable filter.
    for (const label of [
      'Conține: populatie',
      'Domeniu: Economic',
      'Periodicitate: Anual',
      'Acoperire: UAT',
      'Acoperire: județ',
    ]) {
      await expect(page.getByRole('button', { name: `Elimină filtrul ${label}` })).toBeVisible()
    }

    // The rail reflects the URL too.
    const rail = page.getByRole('complementary', { name: 'Filtrează seturile de date' })
    await expect(rail.getByRole('treeitem', { name: /^Economic/ })).toHaveAttribute('aria-selected', 'true')
    await expect(rail.getByRole('checkbox', { name: 'Anual' })).toBeChecked()
    await expect(rail.getByRole('checkbox', { name: 'Date la nivel de localitate' })).toBeChecked()
    await expect(rail.getByRole('checkbox', { name: 'Date la nivel de județ' })).toBeChecked()
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
    await expect(page.getByText(/1[.,]898 de seturi de date/)).toBeVisible()
  })
})
