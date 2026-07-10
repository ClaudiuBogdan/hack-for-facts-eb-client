/**
 * Integration tests for the dataset detail page.
 *
 * Route: /statistici/seturi/$cod
 * GraphQL is mocked (fixtures under tests/fixtures/statistics-dataset-detail-flow/).
 *
 * The load-bearing test is `does not fire InsObservations before a territory is
 * pinned`. `insObservations` scans 23.6M rows and an unscoped call is a
 * 30-second server timeout, so the assertion is made on **request
 * interception**, not on UI text: a page that renders a prompt while quietly
 * issuing the query would still pass a text-only check.
 *
 * POP107D is fixtured with two classification dimensions — `SEXE` (which has a
 * "Total" option and therefore auto-pins) and `VARSTA` (which has none). That
 * asymmetry is deliberate: if every classification auto-pinned, the guard's
 * "all classifications pinned" branch would open the query on first paint and
 * the prompt would be unreachable.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'
import type { Page, Request } from '@playwright/test'

/**
 * The first navigation of a worker pays for a cold Vite compile of this lazy
 * route, which pulls in Recharts and papaparse.
 */
const FIRST_PAINT_TIMEOUT = 45000

const POP107D_ROUTE = '/statistici/seturi/POP107D'
const TUR101C_ROUTE = '/statistici/seturi/TUR101C'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('InsDatasetDetails', 'dataset-pop107d', {
    variables: { code: 'POP107D' },
  })
  await mockApi.mockGraphQL('InsDatasetDetails', 'dataset-tur101c', {
    variables: { code: 'TUR101C' },
  })

  // Dimension option pages, keyed by the dimension they belong to.
  await mockApi.mockGraphQL('InsDatasetDimensionValues', 'dim-territory', {
    variables: { datasetCode: 'POP107D', dimensionIndex: 1 },
  })
  await mockApi.mockGraphQL('InsDatasetDimensionValues', 'dim-sexe', {
    variables: { datasetCode: 'POP107D', dimensionIndex: 2 },
  })
  await mockApi.mockGraphQL('InsDatasetDimensionValues', 'dim-varsta', {
    variables: { datasetCode: 'POP107D', dimensionIndex: 3 },
  })

  await mockApi.mockGraphQL('InsObservations', 'observations-cluj')
}

/** Counts GraphQL POSTs carrying the `InsObservations` operation. */
function trackObservationRequests(page: Page): { count: () => number } {
  let count = 0
  page.on('request', (request: Request) => {
    if (request.method() !== 'POST') return
    if (!request.url().includes('/graphql')) return
    const body = request.postData() ?? ''
    if (body.includes('query InsObservations')) count += 1
  })
  return { count: () => count }
}

function searchParam(page: Page, key: string): string | null {
  return new URL(page.url()).searchParams.get(key)
}

async function pinClujNapoca(page: Page): Promise<void> {
  // The controls only exist once InsDatasetDetails resolves; waiting for the
  // trigger explicitly keeps a slow cold compile from reading as a click bug.
  const trigger = page.getByRole('combobox', { name: 'Localități' })
  await expect(trigger).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT })
  await trigger.click()
  await page.getByRole('option', { name: 'Municipiul Cluj-Napoca' }).click()
}

test.describe('Dataset detail — scope guard, filters, table, export', () => {
  test.slow()
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('does not fire InsObservations before a territory is pinned', async ({ page }) => {
    const observations = trackObservationRequests(page)

    await page.goto(POP107D_ROUTE)
    await waitForPageReady(page)

    // The prompt naming the missing pins stands in for the table.
    await expect(page.getByText('Alege ce vrei să vezi')).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT })

    // Give any stray query a chance to fire before asserting it did not.
    await page.waitForTimeout(1000)
    expect(observations.count()).toBe(0)
  })

  test('auto-pins the Total option of the SEXE dimension into the URL', async ({ page }) => {
    await page.goto(POP107D_ROUTE)
    await waitForPageReady(page)

    await expect
      .poll(() => searchParam(page, 'clasificari'), { timeout: FIRST_PAINT_TIMEOUT })
      .toContain('SEXE:total')

    // VARSTA has no Total, so it stays unpinned and the prompt names it.
    expect(searchParam(page, 'clasificari')).not.toContain('VARSTA')
    await expect(page.getByText(/Grupe de vârstă/).first()).toBeVisible()
  })

  test('picking a territory writes teritoriu and loads the observations', async ({
    page,
  }) => {
    const observations = trackObservationRequests(page)

    await page.goto(POP107D_ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText('Alege ce vrei să vezi')).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT })

    await pinClujNapoca(page)

    await expect
      .poll(() => searchParam(page, 'teritoriu'), { timeout: FIRST_PAINT_TIMEOUT })
      .toBe('siruta:54975')

    await expect(page.getByRole('table')).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT })
    expect(observations.count()).toBeGreaterThan(0)
  })

  test('the 2019 gap is a gap: the table skips it rather than filling it', async ({
    page,
  }) => {
    await page.goto(POP107D_ROUTE)
    await waitForPageReady(page)
    await pinClujNapoca(page)

    await expect(page.getByRole('table')).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT })

    const periodCell = (period: string) =>
      page.getByRole('cell', { name: period, exact: true })

    await expect(periodCell('2018')).toBeVisible()
    await expect(periodCell('2020')).toBeVisible()
    await expect(periodCell('2019')).toHaveCount(0)
  })

  test('a value_status row carries its marker and the legend explains it', async ({
    page,
  }) => {
    await page.goto(POP107D_ROUTE)
    await waitForPageReady(page)
    await pinClujNapoca(page)

    await expect(page.getByRole('table')).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT })
    await expect(page.getByLabel('date estimate')).toBeVisible()
    await expect(page.getByText('Marcaje de calitate INS')).toBeVisible()
  })

  test('exporting downloads a CSV', async ({ page }) => {
    await page.goto(POP107D_ROUTE)
    await waitForPageReady(page)
    await pinClujNapoca(page)

    await expect(page.getByRole('table')).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT })

    const downloadPromise = page.waitForEvent('download', { timeout: FIRST_PAINT_TIMEOUT })
    await page.getByRole('button', { name: 'Descarcă CSV' }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^POP107D-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  test('a deep link restores the selection without any clicking', async ({ page }) => {
    await page.goto(
      `${POP107D_ROUTE}?teritoriu=siruta%3A54975&clasificari=%5B%22SEXE%3Atotal%22%5D`,
    )
    await waitForPageReady(page)

    await expect(page.getByRole('table')).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT })
    await expect(page.getByRole('cell', { name: '2020', exact: true })).toBeVisible()
  })
})

test.describe('Dataset detail — catalog-only', () => {
  test.slow()
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('shows the request action and no observations UI', async ({ page }) => {
    const observations = trackObservationRequests(page)

    await page.goto(TUR101C_ROUTE)
    await waitForPageReady(page)

    await expect(page.getByText('Doar catalog')).toBeVisible({ timeout: FIRST_PAINT_TIMEOUT })
    await expect(page.getByRole('button', { name: 'Cere set' })).toBeVisible()

    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Descarcă CSV' })).toHaveCount(0)

    await page.waitForTimeout(500)
    expect(observations.count()).toBe(0)
  })
})
