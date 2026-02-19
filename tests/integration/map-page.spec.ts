/**
 * Map Page Integration Tests
 *
 * Tests the map page functionality including:
 * - Map display with Leaflet
 * - Filters panel
 * - View type toggles
 * - Legend display
 */

import { test, expect, type Page } from '@playwright/test'
import { waitForHydration } from '../utils/test-helpers'

function getGraphQLOperationName(postData: string | null): string | null {
  if (!postData) return null

  try {
    const body = JSON.parse(postData) as {
      operationName?: string
      query?: string
    }

    if (body.operationName) return body.operationName
    if (!body.query) return null

    const queryOperationMatch = body.query.match(/(?:query|mutation|subscription)\s+(\w+)/)
    return queryOperationMatch?.[1] ?? null
  } catch {
    return null
  }
}

async function registerDelayedHeatmapRoute(page: Page, delayMs = 1500): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.fallback()

    const operationName = getGraphQLOperationName(request.postData())
    const isHeatmapOperation = operationName === 'GetHeatmapUATData' || operationName === 'GetHeatmapCountyData'

    if (isHeatmapOperation) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    return route.fallback()
  })
}

async function switchDataView(page: Page, viewLabel: RegExp): Promise<void> {
  const dataViewGroup = page.getByRole('group', { name: /vizualizare.*date|data.*view/i })
  await dataViewGroup.getByText(viewLabel).click()
}

async function triggerHeatmapRefetch(page: Page): Promise<void> {
  const incomeExpensesGroup = page.getByRole('group', { name: /venituri.*cheltuieli|income.*expenses/i })
  await incomeExpensesGroup.getByText(/venituri|income/i).click()
}

test.describe('Map Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/map')
		// Wait for filters region to be visible (indicates page loaded)
		await expect(
			page.getByRole('region', { name: /filtre.*hartă/i })
		).toBeVisible({ timeout: 15000 })
		await expect(page.getByTestId('leaflet-map')).toBeVisible({ timeout: 15000 })
		await waitForHydration(page)
	})

  test('displays map filters region with title', async ({ page }) => {
    // Check for filters region
    await expect(
      page.getByRole('region', { name: /filtre.*hartă/i })
    ).toBeVisible()

    // Check for clear filters button
    await expect(
      page.getByRole('button', { name: /șterge.*filtre/i })
    ).toBeVisible()
  })

  test('displays data view toggle (Map/Table/Chart)', async ({ page }) => {
    // Check for view type heading
    await expect(
      page.getByRole('heading', { name: /vizualizare.*date/i, level: 4 })
    ).toBeVisible({ timeout: 5000 })

    // Check for radio buttons
    await expect(page.getByRole('radio', { name: /hartă/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /tabel/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /grafic/i })).toBeVisible()

    // Map should be selected by default
    await expect(page.getByRole('radio', { name: /hartă/i })).toBeChecked()
  })

  test('displays map view toggle (UAT/County)', async ({ page }) => {
    // Check for map view heading
    await expect(
      page.getByRole('heading', { name: /vizualizare.*hartă/i, level: 4 })
    ).toBeVisible({ timeout: 5000 })

    // Check for radio buttons
    await expect(page.getByRole('radio', { name: /uat/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /județ/i })).toBeVisible()

    // UAT should be selected by default
    await expect(page.getByRole('radio', { name: /uat/i })).toBeChecked()
  })

  test('displays income/expenses toggle', async ({ page }) => {
    // Check for income/expenses heading
    await expect(
      page.getByRole('heading', { name: /venituri.*cheltuieli/i, level: 4 })
    ).toBeVisible({ timeout: 5000 })

    // Check for radio buttons
    await expect(page.getByRole('radio', { name: /cheltuieli/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /venituri/i })).toBeVisible()

    // Expenses should be selected by default
    await expect(page.getByRole('radio', { name: /cheltuieli/i })).toBeChecked()
  })

  test('displays normalization selector', async ({ page }) => {
    // Check for normalization heading
    await expect(
      page.getByRole('heading', { name: /normalizare/i, level: 4 })
    ).toBeVisible({ timeout: 5000 })

    // Check for combobox
    const normalizationSelect = page.getByTestId('map-normalization-select')
    await expect(normalizationSelect).toBeVisible({ timeout: 5000 })
  })

  test('displays period filter with year selected', async ({ page }) => {
    // Check for period button
    const periodButton = page.getByRole('button', { name: /perioadă/i })
    await expect(periodButton).toBeVisible({ timeout: 5000 })

    // Check for year tag within filters region (exclude footer)
    const filtersRegion = page.getByRole('region', { name: /filtre.*hartă/i })
    await expect(filtersRegion.getByText('2025')).toBeVisible()
  })

  test('displays entity filter sections', async ({ page }) => {
    // Check for Entities filter
    await expect(
      page.getByRole('button', { name: /^entități$/i })
    ).toBeVisible({ timeout: 5000 })

    // Check for Creditor filter (exact match to avoid "Exclude Creditor Principal")
    await expect(
      page.getByRole('button', { name: 'Creditor Principal', exact: true })
    ).toBeVisible()

    // Check for UAT filter (exact match to avoid "Exclude UAT-uri")
    await expect(
      page.getByRole('button', { name: 'UAT-uri', exact: true })
    ).toBeVisible()

    // Check for Counties filter (exact match to avoid "Exclude Județe")
    await expect(
      page.getByRole('button', { name: 'Județe', exact: true })
    ).toBeVisible()
  })

  test('displays classification filter sections', async ({ page }) => {
    // Check for Functional Classification filter
    await expect(
      page.getByRole('button', { name: /clasificație.*funcțională/i }).first()
    ).toBeVisible({ timeout: 5000 })

    // Check for Economic Classification filter
    await expect(
      page.getByRole('button', { name: /clasificație.*economică/i }).first()
    ).toBeVisible()
  })

  test('displays report type filter', async ({ page }) => {
    // Check for Report Type filter button
    await expect(
      page.getByRole('button', { name: /tip.*raportare/i })
    ).toBeVisible({ timeout: 5000 })

    // Check for selected report type
    await expect(
      page.getByText(/executie.*bugetara.*agregata/i)
    ).toBeVisible()
  })

  test('displays exclusion filters section', async ({ page }) => {
    // Check for exclusion filters button
    await expect(
      page.getByRole('button', { name: /filtre.*excludere/i })
    ).toBeVisible({ timeout: 5000 })
  })

  test('displays map zoom controls', async ({ page }) => {
    // Check for zoom in button
    await expect(
      page.getByTestId('map-zoom-in')
    ).toBeVisible({ timeout: 5000 })

    // Check for zoom out button
    await expect(
      page.getByTestId('map-zoom-out')
    ).toBeVisible()
  })

  test('displays map legend', async ({ page }) => {
    // Check for legend heading
    await expect(
      page.getByRole('heading', { name: /legendă/i, level: 4 })
    ).toBeVisible({ timeout: 5000 })

    // Check for value range in legend (RON values)
    await expect(
      page.getByText(/mil\.\s*RON/i).first()
    ).toBeVisible()
  })

  test('displays Leaflet attribution', async ({ page }) => {
    // Check for Leaflet link in attribution
    await expect(
      page.getByTestId('map-attribution-link')
    ).toBeVisible({ timeout: 5000 })
	  })
	})

test.describe('Map Page - Loading Overlays', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/map')
		await expect(
			page.getByRole('region', { name: /filtre.*hartă|map.*filters/i })
		).toBeVisible({ timeout: 15000 })
		await expect(page.getByTestId('leaflet-map')).toBeVisible({ timeout: 15000 })
		await waitForHydration(page)
	})

  test('shows and hides shared loading overlay in table view during heatmap refetch', async ({ page }) => {
    await registerDelayedHeatmapRoute(page)

    await switchDataView(page, /tabel|table/i)
    await expect(page.getByRole('radio', { name: /tabel|table/i })).toBeChecked()

    const overlay = page.getByTestId('map-active-view-loading-overlay')
    await triggerHeatmapRefetch(page)

    await expect(overlay).toBeVisible({ timeout: 5000 })
    await expect(overlay).toBeHidden({ timeout: 15000 })
  })

  test('shows and hides shared loading overlay in chart view during heatmap refetch', async ({ page }) => {
    await registerDelayedHeatmapRoute(page)

    await switchDataView(page, /grafic|chart/i)
    await expect(page.getByRole('radio', { name: /grafic|chart/i })).toBeChecked()

    const overlay = page.getByTestId('map-active-view-loading-overlay')
    await triggerHeatmapRefetch(page)

    await expect(overlay).toBeVisible({ timeout: 5000 })
    await expect(overlay).toBeHidden({ timeout: 15000 })
  })

  test('keeps map overlay behavior during map-view heatmap refetch', async ({ page }) => {
    await registerDelayedHeatmapRoute(page)

    await switchDataView(page, /hartă|map/i)
    await expect(page.getByRole('radio', { name: /hartă|map/i })).toBeChecked()

    const overlay = page.getByTestId('map-active-view-loading-overlay')
    await triggerHeatmapRefetch(page)

    await expect(overlay).toBeVisible({ timeout: 5000 })
    await expect(overlay).toBeHidden({ timeout: 15000 })
  })
})

test.describe('Map Page - Interactions', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/map')
		await expect(
			page.getByRole('region', { name: /filtre.*hartă/i })
		).toBeVisible({ timeout: 15000 })
		await expect(page.getByTestId('leaflet-map')).toBeVisible({ timeout: 15000 })
		await waitForHydration(page)
	})

	test('can switch between map views (UAT/County)', async ({ page }) => {
    // Verify UAT is selected by default
    const uatRadio = page.getByRole('radio', { name: /uat/i })
    await expect(uatRadio).toBeChecked()

		// Click County within the map view group (radio is sr-only)
		const mapViewGroup = page.getByRole('group', { name: /vizualizare.*hartă/i })
		await mapViewGroup.getByText(/județ/i).click()

		// Verify County is now selected
		const countyRadio = page.getByRole('radio', { name: /județ/i })
		await expect(page).toHaveURL(/mapViewType=County/, { timeout: 10000 })
		await expect(countyRadio).toBeChecked({ timeout: 10000 })
	})

	test('can switch between income and expenses', async ({ page }) => {
    // Verify Expenses is selected by default
    const expensesRadio = page.getByRole('radio', { name: /cheltuieli/i })
    await expect(expensesRadio).toBeChecked()

		// Click Income within the income/expenses group (radio is sr-only)
		const incomeGroup = page.getByRole('group', { name: /venituri.*cheltuieli/i })
		await incomeGroup.getByText(/venituri/i).click()

		// Verify Income is now selected
		const incomeRadio = page.getByRole('radio', { name: /venituri/i })
		await expect(incomeRadio).toBeChecked({ timeout: 10000 })
	})

  test('can use zoom controls', async ({ page }) => {
    // Click zoom in
    const zoomInButton = page.getByTestId('map-zoom-in')
    await expect(zoomInButton).toBeVisible({ timeout: 5000 })
    await zoomInButton.click()

    // Verify button still visible after click
    await expect(zoomInButton).toBeVisible()

    // Click zoom out
    const zoomOutButton = page.getByTestId('map-zoom-out')
    await zoomOutButton.click()
    await expect(zoomOutButton).toBeVisible()
  })

  test('filter sections are expandable', async ({ page }) => {
    // Verify filter section buttons exist
    const entitiesButton = page.getByRole('button', { name: /^entități$/i })
    await expect(entitiesButton).toBeVisible({ timeout: 5000 })

    await expect(
      page.getByRole('button', { name: 'Județe', exact: true })
    ).toBeVisible()

    // Click to expand entities section
    await entitiesButton.click()

    // Verify accordion expanded (check for expanded state)
    await expect(entitiesButton).toHaveAttribute('data-state', 'open')
  })
})
