/**
 * Integration tests for local comparisons.
 *
 * Route: /statistici/comparatii
 * GraphQL is mocked (fixtures under tests/fixtures/statistics-comparisons-flow/).
 *
 * The page fires:
 * - `InsDatasetsExplorer` — the dataset picker list;
 * - `InsDatasetDetails` + `InsDatasetDimensionValues` — the pinnable dimensions;
 * - `InsObservations` — exactly ONE call per (dataset × territories × pins).
 *
 * `InsDatasetDimensionValues` variants are keyed on `dimensionIndex` and
 * registered most-specific-first, as the fixture matcher does partial variable
 * matching in registration order.
 *
 * The load-bearing assertion is the last one: `perioada` is derived from data
 * already in memory, so changing it must not produce a second `InsObservations`
 * request.
 */

import type { Page } from '@playwright/test'
import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const ROUTE = '/statistici/comparatii'

/** Cluj-Napoca, Turda, Dej. Dej has no 2024 observation in the fixture. */
const THREE_TERRITORIES = ['54975', '54984', '54993']

const DEEP_LINK = `${ROUTE}?cod=POP107D&teritorii=${encodeURIComponent(
  JSON.stringify(THREE_TERRITORIES),
)}`

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'datasets')
  await mockApi.mockGraphQL('InsDatasetDetails', 'dataset-details')
  await mockApi.mockGraphQL('InsTerritories', 'territories')

  // Dimension values, keyed by dimension index. Most specific first.
  await mockApi.mockGraphQL('InsDatasetDimensionValues', 'dimension-values-unit', {
    variables: { dimensionIndex: 3 },
  })
  await mockApi.mockGraphQL('InsDatasetDimensionValues', 'dimension-values-sex', {
    variables: { dimensionIndex: 2 },
  })

  // A pin the fixture data does not carry → the honest "no data" state.
  await mockApi.mockGraphQL('InsObservations', 'observations-empty', {
    variables: { filter: { sirutaCodes: THREE_TERRITORIES, territoryLevels: ['LAU'], classificationValueCodes: ['SEX_M'] } },
  })
  await mockApi.mockGraphQL('InsObservations', 'observations')
}

/** Table body rows, one per selected territory. */
function territoryRows(page: Page) {
  return page.getByRole('table').locator('tbody tr')
}

/**
 * Counts `InsObservations` POSTs. Registered before `mockApi`'s own route so it
 * observes the request and passes it along to the fixture handler.
 */
async function countObservationRequests(page: Page): Promise<() => number> {
  let count = 0

  page.on('request', (request) => {
    if (request.method() !== 'POST' || !request.url().includes('/graphql')) return
    const body = request.postData() ?? ''
    if (body.includes('InsObservations')) count += 1
  })

  return () => count
}

test.describe('Local comparisons — deep link, missing cells, single fetch', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })


  test('a deep-linked URL with three territories renders three rows', async ({ page }) => {
    await page.goto(DEEP_LINK)
    await waitForPageReady(page)

    await expect(territoryRows(page).first()).toBeVisible({ timeout: 15000 })
    expect(await territoryRows(page).count()).toBe(3)

    await expect(page.getByRole('cell', { name: 'Municipiul Cluj-Napoca' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Municipiul Turda' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Municipiul Dej' })).toBeVisible()
  })

  test('the territory missing the latest year shows an em-dash, not a borrowed value', async ({
    page,
  }) => {
    await page.goto(DEEP_LINK)
    await waitForPageReady(page)
    await expect(territoryRows(page).first()).toBeVisible({ timeout: 15000 })

    const dejRow = territoryRows(page).filter({ hasText: 'Municipiul Dej' })
    await expect(dejRow).toHaveCount(1)

    // Columns: territory, 2022, 2023, 2024. The 2024 cell is missing.
    const latestCell = dejRow.locator('td').nth(3)
    await expect(latestCell).toHaveText('—')
    await expect(latestCell.getByLabel('Fără date pentru 2024')).toBeVisible()

    // The bar chart names it rather than drawing a zero-height bar.
    await expect(
      page.getByText(/Fără date raportate pentru această perioadă: Municipiul Dej/),
    ).toBeVisible()
  })

  test('changing perioada triggers no additional InsObservations request', async ({ page }) => {
    const observationRequests = await countObservationRequests(page)

    await page.goto(DEEP_LINK)
    await waitForPageReady(page)
    await expect(territoryRows(page).first()).toBeVisible({ timeout: 15000 })

    // Settle: no further requests are in flight before we take the baseline.
    await expect.poll(observationRequests, { timeout: 10000 }).toBeGreaterThan(0)
    const baseline = observationRequests()
    expect(baseline).toBe(1)

    // 2024 is the default (latest). Switch to 2022 through the period select.
    await page.getByLabel('Perioadă').click()
    await page.getByRole('option', { name: '2022' }).click()

    // The router stringifies search values with `JSON.stringify`, so a string
    // param arrives quoted.
    await expect.poll(() => new URL(page.url()).searchParams.get('perioada')).toBe('"2022"')

    // The bar chart re-rendered from data already in memory: Dej is no longer
    // the territory without a value, because it has a 2022 figure.
    await expect(page.getByText(/Fără date raportate pentru această perioadă/)).toHaveCount(0)

    // Give any stray refetch a chance to fire before asserting it did not.
    await page.waitForTimeout(1000)
    expect(observationRequests()).toBe(baseline)
  })

  test('below two territories the guided empty state replaces the results', async ({ page }) => {
    await page.goto(
      `${ROUTE}?cod=POP107D&teritorii=${encodeURIComponent(JSON.stringify(['54975']))}`,
    )
    await waitForPageReady(page)

    await expect(
      page.getByRole('heading', { name: 'Alege cel puțin două teritorii pentru a compara' }),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('table')).toHaveCount(0)
  })

  test('a pin with no matching observations shows "no data", not an error', async ({ page }) => {
    await page.goto(`${DEEP_LINK}&clasificari=${encodeURIComponent(JSON.stringify(['SEX:SEX_M']))}`)
    await waitForPageReady(page)

    await expect(
      page.getByRole('heading', { name: 'Nu există date pentru această combinație' }),
    ).toBeVisible({ timeout: 15000 })
  })
})
