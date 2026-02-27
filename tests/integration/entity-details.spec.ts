/**
 * Entity Details Page Integration Tests
 *
 * Tests the entity details page functionality including:
 * - Entity header and metadata
 * - Financial summary cards
 * - Financial evolution chart
 * - Budget distribution
 * - Navigation tabs
 */

import { test, expect } from '@playwright/test'

const TEST_ENTITY_CUI = '4305857'

test.describe('Entity Details Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/entities/${TEST_ENTITY_CUI}`)
    // Wait for entity heading to appear (indicates page loaded)
    await expect(
      page.getByRole('heading', { name: /MUNICIPIUL CLUJ-NAPOCA/i, level: 1 })
    ).toBeVisible({ timeout: 15000 })
  })

  test('displays entity header with name and CUI', async ({ page }) => {
    // Check entity name heading
    await expect(
      page.getByRole('heading', { name: /MUNICIPIUL CLUJ-NAPOCA/i, level: 1 })
    ).toBeVisible()

    // Check CUI is displayed
    await expect(page.locator('code').filter({ hasText: TEST_ENTITY_CUI })).toBeVisible()
  })

  test('displays entity metadata', async ({ page }) => {
    // Check for address information
    await expect(page.getByText(/adresă/i)).toBeVisible({ timeout: 5000 })

    // Check for UAT information with population
    await expect(page.getByText(/populație/i)).toBeVisible()

    // Check for county link
    await expect(
      page.getByRole('link', { name: /JUDETUL CLUJ/i })
    ).toBeVisible()
  })

  test('displays navigation tabs', async ({ page }) => {
    // Scope to header to avoid matching sidebar links
    const header = page.locator('header')

    // Check for main navigation links
    await expect(
      header.getByRole('link', { name: /prezentare generală/i })
    ).toBeVisible({ timeout: 5000 })

    await expect(
      header.getByRole('link', { name: /evoluția cheltuielilor/i })
    ).toBeVisible()

    await expect(
      header.getByRole('link', { name: /evoluția veniturilor/i })
    ).toBeVisible()

    await expect(
      header.getByRole('link', { name: /hartă/i })
    ).toBeVisible()

    await expect(
      header.getByRole('link', { name: /contracte/i })
    ).toBeVisible()

    await expect(
      header.getByRole('link', { name: /angajamente/i })
    ).toBeVisible()

    await expect(
      header.getByRole('link', { name: 'Rapoarte', exact: true })
    ).toBeVisible()
  })

  test('displays financial summary cards', async ({ page }) => {
    // Check for Total Income card
    await expect(
      page.getByText('Total Venituri (2025)')
    ).toBeVisible({ timeout: 10000 })

    // Check for Total Expenses card
    await expect(
      page.getByText('Total Cheltuieli (2025)')
    ).toBeVisible()

    // Check for Balance card (Income - Expenses)
    await expect(
      page.getByText('Venituri - Cheltuieli (2025)')
    ).toBeVisible()

    // Verify amounts are displayed (RON currency values)
    await expect(
      page.getByText(/mld\.\s*RON/i).first()
    ).toBeVisible()
  })

  test('displays financial evolution chart', async ({ page }) => {
    // In CI/live data, this section may render either a chart or an explicit empty state.
    const chartTitle = page.locator('text=/evoluție.*financiară|financial.*evolution/i').first()
    await expect(chartTitle).toBeVisible({ timeout: 10000 })

    const emptyStateMessage = page
      .locator('text=/nu există date disponibile pentru a afișa evoluția financiară|no data available to display financial evolution/i')
      .first()

    const hasEmptyState = await emptyStateMessage.isVisible({ timeout: 3000 }).catch(() => false)
    if (hasEmptyState) {
      await expect(emptyStateMessage).toBeVisible()
      return
    }

    const chartContainer = page.locator('.recharts-responsive-container').first()
    await expect(chartContainer).toBeVisible({ timeout: 10000 })

    // Validate legend structure without coupling to translated labels.
    const legendItems = page.locator('.recharts-legend-item')
    await expect(legendItems).toHaveCount(3, { timeout: 10000 })
  })

  test('displays budget distribution section', async ({ page }) => {
    // Check for budget distribution title
    await expect(
      page.getByRole('heading', { name: /distribuția.*bugetului/i })
    ).toBeVisible({ timeout: 10000 })

    // Check for Income/Expense toggle
    await expect(page.getByRole('radio', { name: /venituri/i }).first()).toBeVisible()
    await expect(page.getByRole('radio', { name: /cheltuieli/i }).first()).toBeVisible()

    // Check for classification type toggle (Functional/Economic)
    await expect(page.getByRole('radio', { name: /funcțional/i }).first()).toBeVisible()
    await expect(page.getByRole('radio', { name: /economic/i }).first()).toBeVisible()
  })

  test('displays income and expense line items headers', async ({ page }) => {
    // Check for income section header
    await expect(
      page.getByRole('heading', { name: /venituri.*\(2025\)/i })
    ).toBeVisible({ timeout: 10000 })

    // Check for expense section header
    await expect(
      page.getByRole('heading', { name: /cheltuieli.*\(2025\)/i })
    ).toBeVisible()
  })

  test('displays reporting period selector', async ({ page }) => {
    // Check for reporting period button
    await expect(
      page.getByRole('button', { name: /perioada.*raportare/i })
    ).toBeVisible({ timeout: 10000 })
  })

  test('displays quick actions toolbar', async ({ page }) => {
    // Check for quick action buttons
    await expect(
      page.getByRole('button', { name: /căutare.*entități/i })
    ).toBeVisible({ timeout: 5000 })

    await expect(
      page.getByRole('button', { name: /vezi.*harta/i })
    ).toBeVisible()

    await expect(
      page.getByRole('button', { name: /vezi.*tabel/i })
    ).toBeVisible()

    await expect(
      page.getByRole('button', { name: /copiază.*partajare/i })
    ).toBeVisible()
  })

  test('displays link to county entity', async ({ page }) => {
    // Check for link to county (JUDETUL CLUJ)
    const countyLink = page.getByRole('link', { name: /JUDETUL CLUJ/i })
    await expect(countyLink).toBeVisible({ timeout: 5000 })
    await expect(countyLink).toHaveAttribute('href', /\/entities\/\d+/)
  })
})

test.describe('Entity Details - Navigation', () => {
  test('can navigate to expense trends view', async ({ page }) => {
    await page.goto(`/entities/${TEST_ENTITY_CUI}`)
    await expect(
      page.getByRole('heading', { name: /MUNICIPIUL CLUJ-NAPOCA/i, level: 1 })
    ).toBeVisible({ timeout: 15000 })

    const expenseTrendsLink = page.getByRole('link', { name: /evoluția cheltuielilor/i })
    await expect(expenseTrendsLink).toBeVisible()
    await expenseTrendsLink.click()

    await page.waitForURL(/view=expense-trends/)
    expect(page.url()).toContain('view=expense-trends')
  })

  test('can navigate to income trends view', async ({ page }) => {
    await page.goto(`/entities/${TEST_ENTITY_CUI}`)
    await expect(
      page.getByRole('heading', { name: /MUNICIPIUL CLUJ-NAPOCA/i, level: 1 })
    ).toBeVisible({ timeout: 15000 })

    const incomeTrendsLink = page.getByRole('link', { name: /evoluția veniturilor/i })
    await expect(incomeTrendsLink).toBeVisible()
    await incomeTrendsLink.click()

    await page.waitForURL(/view=income-trends/)
    expect(page.url()).toContain('view=income-trends')
  })

  test('can navigate to reports view', async ({ page }) => {
    await page.goto(`/entities/${TEST_ENTITY_CUI}`)
    await expect(
      page.getByRole('heading', { name: /MUNICIPIUL CLUJ-NAPOCA/i, level: 1 })
    ).toBeVisible({ timeout: 15000 })

    // Use exact match to avoid matching "Vezi toate rapoartele"
    const reportsLink = page.getByRole('link', { name: 'Rapoarte', exact: true })
    await expect(reportsLink).toBeVisible()
    await reportsLink.click()

    await page.waitForURL(/view=reports/)
    expect(page.url()).toContain('view=reports')
  })
})

test.describe('Entity Details - SSR Metadata and Share Image', () => {
  test('returns entity-specific SSR meta tags with dynamic image URL', async ({ request }) => {
    const response = await request.get(`/entities/${TEST_ENTITY_CUI}?year=2025&period=YEAR&normalization=total&currency=RON`)
    expect(response.ok()).toBeTruthy()

    const html = await response.text()

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
    expect(titleMatch?.[1]).toContain('Transparenta.eu')
    expect(titleMatch?.[1]).toContain('Buget')

    const descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
    expect(descriptionMatch?.[1]).toBeTruthy()
    expect(descriptionMatch?.[1]).toContain('MUNICIPIUL CLUJ-NAPOCA')

    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
    expect(ogTitleMatch?.[1]).toContain('Transparenta.eu')

    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
    expect(ogImageMatch?.[1]).toContain(`/entities/${TEST_ENTITY_CUI}/share-image.png?`)

    const twitterImageMatch = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i)
    expect(twitterImageMatch?.[1]).toContain(`/entities/${TEST_ENTITY_CUI}/share-image.png?`)
  })

  test('serves share image endpoint as PNG', async ({ request }) => {
    const imageResponse = await request.get(
      `/entities/${TEST_ENTITY_CUI}/share-image.png?year=2025&period=YEAR&normalization=total&currency=RON`,
    )

    expect(imageResponse.status()).toBe(200)

    const contentType = imageResponse.headers()['content-type']
    expect(contentType).toContain('image/png')

    const cacheControl = imageResponse.headers()['cache-control']
    expect(cacheControl).toContain('max-age=86400')
    expect(cacheControl).toContain('s-maxage=86400')

    const body = await imageResponse.body()
    expect(body.length).toBeGreaterThan(100)

    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    expect(Buffer.from(body).subarray(0, 8).equals(pngSignature)).toBe(true)
  })
})
