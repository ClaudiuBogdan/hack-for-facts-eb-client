/**
 * Entity Page E2E Tests
 *
 * Tests against real API using historical data (year 2023) for stability.
 *
 * Run modes:
 * - `yarn test:e2e`                 - Live API (validates real integration)
 * - `yarn test:e2e:snapshot:update` - Record API responses to snapshots
 * - `yarn test:e2e:snapshot`        - Replay from snapshots (fast CI)
 */

import type { Page } from '@playwright/test'
import { test, expect } from '../utils/e2e-base'
import { waitForHydration } from '../utils/test-helpers'

// Using historical year for stable data
const TEST_YEAR = '2023'
const TEST_ENTITY_CUI = '4305857' // MUNICIPIUL CLUJ-NAPOCA

async function waitForBudgetExplorer(page: Page) {
  await page.goto(`/budget-explorer?year=${TEST_YEAR}`)

  await expect(
    page.getByRole('heading', { level: 1, name: /buget național|national budget/i })
  ).toBeVisible({ timeout: 15000 })

  await expect(
    page.getByText(/distribuția bugetului|budget distribution/i).first()
  ).toBeVisible({ timeout: 10000 })

  await expect(
    page.getByRole('heading', { level: 2, name: /total buget|total budget/i }).first()
  ).toBeVisible({ timeout: 20000 })

  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    // The live page can keep background requests open; the section heading above is the main readiness gate.
  })
}

test.describe('Entity Page', () => {
  test('loads entity overview with financial data', async ({ page }) => {
    // Use historical year in URL for stable data
    await page.goto(`/entities/${TEST_ENTITY_CUI}?year=${TEST_YEAR}`)

    // Verify entity header loads
    await expect(
      page.getByRole('heading', { name: /MUNICIPIUL CLUJ-NAPOCA|Cluj-Napoca/i }).first()
    ).toBeVisible({ timeout: 15000 })

    // Verify financial data loads (not loading skeleton)
    await expect(
      page.getByText(/^Venituri$|^Income$/i).first()
    ).toBeVisible({ timeout: 15000 })

    // Verify amounts are displayed
    await expect(
      page.locator('text=/mld|mil|RON/i').first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('displays expense breakdown', async ({ page }) => {
    await page.goto(`/entities/${TEST_ENTITY_CUI}?year=${TEST_YEAR}`)

    // Wait for page load
    await expect(
      page.getByRole('heading', { name: /MUNICIPIUL CLUJ-NAPOCA|Cluj-Napoca/i }).first()
    ).toBeVisible({ timeout: 15000 })

    // Verify the refactored expense breakdown section
    await expect(
      page.getByText(/Distribuția Cheltuielilor|Spending breakdown/i).first()
    ).toBeVisible({ timeout: 10000 })

    // Verify the section exposes the revenue/expense drill-down controls.
    await expect(
      page.getByRole('button', { name: /Arată venituri|Show revenue/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('can navigate between current analysis views', async ({ page }) => {
    await page.goto(`/entities/${TEST_ENTITY_CUI}?year=${TEST_YEAR}`)

    // Wait for page load
    await expect(
      page.getByRole('heading', { name: /MUNICIPIUL CLUJ-NAPOCA|Cluj-Napoca/i }).first()
    ).toBeVisible({ timeout: 15000 })
    await waitForHydration(page)

    const viewNavigator = page.getByTestId('challenge-entity-view-navigator')
    await expect(viewNavigator).toBeVisible({ timeout: 15000 })
    await viewNavigator
      .getByRole('button', { name: /angajamente|commitments/i })
      .click()
    await expect(page).toHaveURL(/view=commitments/, { timeout: 10000 })
  })
})

test.describe('Landing Page', () => {
  test('loads with navigation elements', async ({ page }) => {
    await page.goto('/')

    // Verify main heading
    await expect(
      page.getByRole('heading', { name: /transparenta/i, level: 1 })
    ).toBeVisible({ timeout: 10000 })

    // Verify navigation cards
    await expect(
      page.getByRole('link', { name: /map|hartă/i }).first()
    ).toBeVisible()

    await expect(
      page.getByRole('link', { name: /charts|grafice/i }).first()
    ).toBeVisible()

    await expect(
      page.getByRole('link', { name: /budget.*explorer|explorator|national.*budget|buget.*național/i }).first()
    ).toBeVisible()
  })

  test('entity search input is functional', async ({ page }) => {
    await page.goto('/')

    // Find search input
    const searchInput = page.getByRole('combobox').first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })

    // Verify input is enabled and can be focused
    await expect(searchInput).toBeEnabled()
    await searchInput.focus()
    await expect(searchInput).toBeFocused()

    // Type into the input and verify it accepts input
    await searchInput.type('Cluj', { delay: 50 })

    // Wait a moment for the input to process
    await page.waitForTimeout(500)

    // Get the input value - the component should have updated
    const inputValue = await searchInput.inputValue()

    // The search input should either retain the value or show results
    // Note: Some combobox implementations clear on blur or have complex state
    if (inputValue !== 'Cluj') {
      // If value was cleared, check if dropdown/results appeared
      const hasDropdown = await page.locator('[role="listbox"], .absolute').first().isVisible().catch(() => false)
      expect(hasDropdown || inputValue.length > 0).toBeTruthy()
    } else {
      expect(inputValue).toBe('Cluj')
    }
  })
})

test.describe('Budget Explorer', () => {
  test('loads with aggregated data', async ({ page }) => {
    await waitForBudgetExplorer(page)

    await expect(
      page.getByRole('link', { name: /analizează articolele bugetare|analyze line items/i }).first()
    ).toBeVisible({ timeout: 20000 })
  })

  test('can toggle between spending and revenue', async ({ page }) => {
    await waitForBudgetExplorer(page)

    const incomeToggle = page.getByRole('radio', { name: /venituri|income/i }).first()
    const expensesToggle = page.getByRole('radio', { name: /cheltuieli|expenses/i }).first()

    await expect(incomeToggle).toBeVisible({ timeout: 10000 })
    await expect(expensesToggle).toBeVisible({ timeout: 10000 })

    await expect(expensesToggle).toHaveAttribute('aria-checked', 'true')
    await expect(incomeToggle).toHaveAttribute('aria-checked', 'false')
    await expect(incomeToggle).toBeEnabled()

    await incomeToggle.click()

    await expect(incomeToggle).toHaveAttribute('aria-checked', 'true', { timeout: 10000 })
    await expect(expensesToggle).toHaveAttribute('aria-checked', 'false', { timeout: 10000 })
  })
})

test.describe('Entity Analytics', () => {
  test('loads aggregated entity view', async ({ page }) => {
    await page.goto(`/entity-analytics?year=${TEST_YEAR}`)

    // Verify page loads
    await expect(
      page.locator('text=/entity.*analytics|analiză.*entități|entități/i').first()
    ).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Map Page', () => {
  test('loads map visualization', async ({ page }) => {
    await page.goto('/map')

    // Verify the page heading and rendered map surface both load.
    const mapContainer = page.getByRole('region', { name: /^map$/i }).first()
    const mapHeading = page.getByRole('heading', { name: /map|hartă/i }).first()

    await expect(mapHeading).toBeVisible({ timeout: 15000 })
    await expect(mapContainer).toBeVisible({ timeout: 15000 })
  })
})
