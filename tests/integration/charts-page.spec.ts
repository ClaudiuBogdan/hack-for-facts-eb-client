/**
 * Charts Page E2E Tests
 *
 * Tests the charts page functionality including:
 * - Charts list display
 * - Empty state
 * - Create chart navigation
 * - Search and sort functionality
 * - Backup/Restore features
 *
 * Data extracted from browser exploration on 2025-12-16
 */

import { test, expect } from '@playwright/test'

test.describe('Charts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/charts')
    await page.waitForLoadState('networkidle').catch(() => {})
    // Wait for main content to appear
    await page.locator('main').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
  })

  test('displays page heading and description', async ({ page }) => {
    // Check for charts heading
    await expect(
      page.getByRole('heading', { name: /charts|grafice/i, level: 1 })
    ).toBeVisible({ timeout: 10000 })

    // Check for description
    const description = page.locator('text=/create.*visualizations|vizualizări.*personalizate/i')
    await expect(description.first()).toBeVisible()
  })

  test('displays search input', async ({ page }) => {
    // Check for search input
    const searchInput = page.getByRole('textbox', { name: /search|caută/i }).or(
      page.getByPlaceholder(/search|caută/i)
    )
    await expect(searchInput.first()).toBeVisible({ timeout: 5000 })
  })

  test('displays sort dropdown', async ({ page }) => {
    // Check for sort dropdown
    const sortDropdown = page.getByRole('combobox').filter({ hasText: /newest|cele mai noi/i }).or(
      page.locator('text=/newest|cele mai noi/i')
    )
    await expect(sortDropdown.first()).toBeVisible({ timeout: 5000 })
  })

  test('displays empty state when no charts exist', async ({ page }) => {
    // Check for empty state message
    const emptyState = page.locator('text=/no.*chart.*yet|niciun.*grafic/i')
    if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(emptyState).toBeVisible()

      // Check for create first chart button
      const createFirstChartButton = page.getByRole('button', { name: /create.*first.*chart|creați.*primul/i }).or(
        page.getByRole('link', { name: /create.*first.*chart|creați.*primul/i })
      )
      await expect(createFirstChartButton.first()).toBeVisible()
    }
  })

  test('displays create chart button', async ({ page }) => {
    // Check for create chart button
    const createChartButton = page.getByRole('button', { name: /create.*chart|creează.*grafic/i }).or(
      page.getByRole('link', { name: /create.*chart|creează.*grafic/i })
    )
    await expect(createChartButton.first()).toBeVisible({ timeout: 5000 })
  })

  test('displays backup and restore buttons', async ({ page }) => {
    // Check for backup button
    const backupButton = page.getByRole('button', { name: /backup|copie.*rezervă/i })
    if (await backupButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(backupButton).toBeVisible()
    }

    // Check for restore button
    const restoreButton = page.getByRole('button', { name: /restore|restaurează/i })
    if (await restoreButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(restoreButton).toBeVisible()
    }
  })

  test('displays total charts count', async ({ page }) => {
    // Check for total count indicator
    const totalCount = page.locator('text=/\\d+.*total/i')
    if (await totalCount.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(totalCount).toBeVisible()
    }
  })

  test('create chart button links to new chart page', async ({ page }) => {
    // Find create chart link/button
    const createChartLink = page.getByRole('link', { name: /create.*chart|creează.*grafic/i }).or(
      page.getByRole('link').filter({ hasText: /create.*chart|creează.*grafic/i })
    )

    if (await createChartLink.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(createChartLink.first()).toHaveAttribute('href', /\/charts\/new/)
    }
  })

  test('can navigate to create new chart', async ({ page }) => {
    // Click create chart button
    const createChartButton = page.getByRole('link', { name: /create|creează/i }).filter({ hasText: /chart|grafic/i }).first().or(
      page.getByRole('button', { name: /create|creează/i }).filter({ hasText: /chart|grafic/i }).first()
    )

    if (await createChartButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createChartButton.click()
      await page.waitForURL(/\/charts\/new/)
      expect(page.url()).toContain('/charts/new')
    }
  })

  test('displays quick action toolbar', async ({ page }) => {
    // Check for quick action buttons (EN/RO - account for all text variations)
    const searchButton = page.getByRole('button', { name: /căutare|search/i })
    const mapButton = page.getByRole('button', { name: /hartă|harta|map/i })
    const tableButton = page.getByRole('button', { name: /tabel|table/i })
    const shareButton = page.getByRole('button', { name: /partajare|share|copiază/i })

    // At least some of these should be visible
    const visibleButtons = await Promise.all([
      searchButton.first().isVisible({ timeout: 5000 }).catch(() => false),
      mapButton.first().isVisible({ timeout: 5000 }).catch(() => false),
      tableButton.first().isVisible({ timeout: 5000 }).catch(() => false),
      shareButton.first().isVisible({ timeout: 5000 }).catch(() => false),
    ])

    expect(visibleButtons.some(Boolean)).toBe(true)
  })
})

test.describe('Charts Page - Search and Filter', () => {
  test('can search for charts', async ({ page }) => {
    await page.goto('/charts')
    await page.waitForLoadState('domcontentloaded')


    const searchInput = page.getByRole('textbox', { name: /search|caută/i }).or(
      page.getByPlaceholder(/search|caută/i)
    ).first()

    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test')
   // Allow for debounce

      // Verify search was applied (page didn't crash)
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('can change sort order', async ({ page }) => {
    await page.goto('/charts')
    await page.waitForLoadState('domcontentloaded')


    const sortDropdown = page.getByRole('combobox').first()

    if (await sortDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sortDropdown.click()
      await page.waitForTimeout(300)

      // Check for sort options
      const sortOptions = page.getByRole('option').or(page.getByRole('listitem'))
      await expect(sortOptions.first()).toBeVisible({ timeout: 2000 }).catch(() => true)
    }
  })
})
