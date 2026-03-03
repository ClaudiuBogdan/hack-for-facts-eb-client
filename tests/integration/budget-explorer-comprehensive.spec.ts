/**
 * National Budget Page Integration Tests
 *
 * Route: /budget-explorer
 * Focus: sector segmentation, disclaimer/source messaging, deep links.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady, clickToggleWithUrlVerification } from '../utils/test-helpers'

const SELECTORS = {
  nationalBudgetHeading: /national budget|buget național/i,
  budgetDistribution: /budget distribution|distribuția bugetului/i,
  disclaimer: /data is informational, not official consolidated publication|datele sunt informative/i,
  discrepancy: /discrepancies may exist|pot exista discrepanțe/i,
  sourceLink: /ministerul finanțelor/i,
  executionReferenceLink: /informații execuție bugetară|budget execution information/i,
  totalDisclaimer: /total buget is a merged informational treemap|total buget este o agregare informativă/i,
  analyzeLineItems: /analyze line items/i,
  incomeLabel: /^income$|^venituri$/i,
  expensesLabel: /^expenses$|^cheltuieli$/i,
  dismissDisclaimer: /dismiss disclaimer/i,
}

test.describe('National Budget Page', () => {
  test.beforeEach(async ({ mockApi }) => {
    await mockApi.mockGraphQL('BudgetSectors', 'budget-sectors')
    await mockApi.mockGraphQL('NationalBudgetFundingSources', 'funding-sources')
    await mockApi.mockGraphQL('AggregatedLineItems', [
      'aggregated-line-items',
      'aggregated-line-items',
      'aggregated-line-items',
      'aggregated-line-items',
      'aggregated-line-items',
    ])
  })

  test('loads segmented national budget sections with disclaimer', async ({ page }) => {
    await page.goto('/budget-explorer')
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: SELECTORS.nationalBudgetHeading })).toBeVisible()
    await expect(page.getByText(SELECTORS.budgetDistribution)).toBeVisible()
    await expect(page.getByText(SELECTORS.disclaimer)).toBeVisible()
    await expect(page.getByText(SELECTORS.discrepancy)).toBeVisible()
    await expect(page.getByText(SELECTORS.totalDisclaimer)).toBeVisible()
    await expect(page.locator('a[href="#budget-explanations"]').first()).toBeVisible()

    const sourceLink = page.getByRole('link', { name: SELECTORS.sourceLink }).first()
    await expect(sourceLink).toBeVisible()
    await expect(sourceLink).toHaveAttribute('href', 'https://mfinante.gov.ro/transparenta-bugetara')

    const executionReferenceLink = page.getByRole('link', { name: SELECTORS.executionReferenceLink }).first()
    await expect(executionReferenceLink).toBeVisible()
    await expect(executionReferenceLink).toHaveAttribute('href', 'https://mfinante.gov.ro/domenii/bugetul-de-stat/informatii-executie-bugetara')
  })

  test('persists collapsed top disclaimer and moves it to disclaimer section', async ({ page }) => {
    await page.goto('/budget-explorer')
    await waitForPageReady(page)

    await page.getByRole('button', { name: SELECTORS.dismissDisclaimer }).click()
    await expect(page.locator('a[href="#budget-explanations"]')).toHaveCount(0)

    await page.locator('#budget-explanations').scrollIntoViewIfNeeded()
    await expect(page.locator('#budget-explanations').getByText(SELECTORS.disclaimer)).toBeVisible()

    await page.reload()
    await waitForPageReady(page)
    await expect(page.locator('a[href="#budget-explanations"]')).toHaveCount(0)
    await expect(page.locator('#budget-explanations').getByText(SELECTORS.disclaimer)).toBeVisible()
  })

  test('renders sector and document budget sections in expected order', async ({ page }) => {
    await page.goto('/budget-explorer')
    await waitForPageReady(page)

    const sectorCards = page.locator('[id^="sector-"]')
    expect(await sectorCards.count()).toBeGreaterThanOrEqual(9)
    await expect(sectorCards.nth(0)).toHaveAttribute('id', 'sector-total-budget')
    await expect(sectorCards.nth(1)).toHaveAttribute('id', 'sector-1')
    await expect(sectorCards.nth(2)).toHaveAttribute('id', 'sector-2')
    await expect(sectorCards.nth(3)).toHaveAttribute('id', 'sector-3')
    await expect(sectorCards.nth(4)).toHaveAttribute('id', 'sector-4')
    await expect(sectorCards.nth(5)).toHaveAttribute('id', 'sector-5')

    await expect(page.getByRole('heading', { name: /total buget/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /bugetul de stat/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /bugetul local/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /asigurarilor sociale/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /fondului de somaj/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /fnuass|fondului de sanatate/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /institu.*venituri proprii/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /fonduri externe nerambursabile/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /trezoreriei statului/i })).toBeVisible()
    await expect(page.getByText(/main categories|categorii principale/i).first()).toBeVisible()
  })

  test('shows deep links to entity analytics line items for each section', async ({ page }) => {
    await page.goto('/budget-explorer')
    await waitForPageReady(page)

    const analyzeLinks = page.getByRole('link', { name: SELECTORS.analyzeLineItems })
    await expect(analyzeLinks.first()).toBeVisible()
    expect(await analyzeLinks.count()).toBeGreaterThanOrEqual(5)

    const totalHref = await page.locator('#sector-total-budget').getByRole('link', { name: SELECTORS.analyzeLineItems }).first().getAttribute('href')
    const decodedHref = decodeURIComponent(totalHref ?? '')

    expect(totalHref ?? '').toContain('/entity-analytics')
    expect(decodedHref).toContain('line-items')
    expect(decodedHref).toContain('budget_sector_ids')
    expect(decodedHref).toMatch(/"account_category":"ch"|account_category=ch/i)

    const parsedTotalUrl = new URL(totalHref ?? '', 'https://transparenta.eu')
    const parsedTotalFilter = JSON.parse(decodeURIComponent(parsedTotalUrl.searchParams.get('filter') ?? '{}'))
    expect(parsedTotalFilter.budget_sector_ids).toEqual(['1', '2', '3', '4', '5'])
    expect(parsedTotalUrl.searchParams.get('transferFilter')).toBe('all')

    const expectedFundingSourcesBySector: Record<string, string[] | undefined> = {
      '1': ['1'],
      '2': ['1', '6', '5', '7'],
      '3': ['1'],
      '4': undefined,
      '5': undefined,
    }
    for (const [sectorId, expectedFundingSourceIds] of Object.entries(expectedFundingSourcesBySector)) {
      const sectionHref = await page.locator(`#sector-${sectorId}`).getByRole('link', { name: SELECTORS.analyzeLineItems }).first().getAttribute('href')
      expect(sectionHref).toBeTruthy()

      const sectionUrl = new URL(sectionHref!, 'https://transparenta.eu')
      const sectionFilter = JSON.parse(decodeURIComponent(sectionUrl.searchParams.get('filter') ?? '{}'))
      expect(sectionFilter.budget_sector_ids).toEqual([sectorId])
      if (expectedFundingSourceIds) {
        expect(sectionFilter.funding_source_ids).toEqual(expectedFundingSourceIds)
      } else {
        expect(sectionFilter.funding_source_ids).toBeUndefined()
      }
      expect(sectionUrl.searchParams.get('transferFilter')).toBe('all')
    }
  })

  test('switches to income mode and keeps segmented layout', async ({ page }) => {
    await page.goto('/budget-explorer')
    await waitForPageReady(page)

    const incomeToggle = page.locator('button[role="radio"]').filter({ hasText: SELECTORS.incomeLabel }).first()
    await clickToggleWithUrlVerification(page, incomeToggle, /budget-explorer/)

    await expect(page.getByRole('heading', { name: /bugetul de stat/i })).toBeVisible()
    await expect(page.getByText(/main categories|categorii principale/i).first()).toBeVisible()
    await expect(page.getByRole('radio', { name: /^economic$/i })).toBeDisabled()

    const expectedFundingSourcesBySector: Record<string, string[]> = {
      '1': ['1'],
      '2': ['1', '4', '6'],
      '3': ['1'],
      '4': ['1'],
      '5': ['1', '4'],
    }
    for (const sectorId of ['1', '2', '3', '4', '5']) {
      const href = await page.locator(`#sector-${sectorId}`).getByRole('link', { name: SELECTORS.analyzeLineItems }).first().getAttribute('href')
      expect(decodeURIComponent(href ?? '')).toMatch(/"account_category":"vn"|account_category=vn/i)

      const parsedUrl = new URL(href ?? '', 'https://transparenta.eu')
      const parsedFilter = JSON.parse(decodeURIComponent(parsedUrl.searchParams.get('filter') ?? '{}'))
      const parsedSectorId = String(parsedFilter.budget_sector_ids?.[0] ?? '')
      if (expectedFundingSourcesBySector[parsedSectorId]) {
        expect(parsedFilter.funding_source_ids).toEqual(expectedFundingSourcesBySector[parsedSectorId])
      }
      expect(parsedFilter.exclude ?? {}).toEqual({})
      expect(parsedUrl.searchParams.get('transferFilter')).toBeNull()
    }
  })

  test('keeps expenses selected by default', async ({ page }) => {
    await page.goto('/budget-explorer')
    await waitForPageReady(page)

    const expensesToggle = page.locator('[data-state="on"]').filter({ hasText: SELECTORS.expensesLabel }).first()
    await expect(expensesToggle).toBeVisible()
    const includeTransfersToggle = page.locator('[data-state="on"]').filter({ hasText: /include transferuri/i }).first()
    await expect(includeTransfersToggle).toBeVisible()
  })

  test('updates URL when treemap grouping and detail controls change', async ({ page }) => {
    await page.goto('/budget-explorer')
    await waitForPageReady(page)

    const economicToggle = page.getByRole('radio', { name: /^economic$/i }).first()
    await economicToggle.click()
    await expect(page).toHaveURL(/primary=ec/, { timeout: 10000 })

    const subchapterToggle = page.getByRole('radio', { name: /^subchapter$/i }).first()
    await subchapterToggle.click()
    await expect(page).toHaveURL(/depth=subchapter/, { timeout: 10000 })

    const excludeTransfersToggle = page.getByRole('radio', { name: /exclude transferuri/i }).first()
    await excludeTransfersToggle.click()
    await expect(page).toHaveURL(/transferFilter=no-transfers/, { timeout: 10000 })

    const sectorOneHref = await page.locator('#sector-1').getByRole('link', { name: SELECTORS.analyzeLineItems }).first().getAttribute('href')
    const parsedSectorOneUrl = new URL(sectorOneHref ?? '', 'https://transparenta.eu')
    const parsedSectorOneFilter = JSON.parse(decodeURIComponent(parsedSectorOneUrl.searchParams.get('filter') ?? '{}'))
    expect(parsedSectorOneUrl.searchParams.get('transferFilter')).toBe('no-transfers')
    expect(parsedSectorOneFilter.exclude?.economic_prefixes).toEqual(['51.01', '51.02'])
  })

  test('shows quick switch button before explanation cards', async ({ page }) => {
    await page.goto('/budget-explorer')
    await waitForPageReady(page)

    await page.locator('#budget-explanations').scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: /vezi venituri|vezi cheltuieli/i })).toBeVisible()
  })

  test('keeps legacy URL params compatible', async ({ page }) => {
    await page.goto('/budget-explorer?view=treemap&primary=ec&depth=subchapter&treemapPrimary=ec&treemapPath=65&year=2024')
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: SELECTORS.nationalBudgetHeading })).toBeVisible()
    await expect(page.locator('[id^="sector-"]').first()).toBeVisible()
  })

  test('renders stacked sections on mobile without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/budget-explorer')
    await waitForPageReady(page)

    const sectorCards = page.locator('[id^="sector-"]')
    expect(await sectorCards.count()).toBeGreaterThanOrEqual(9)
    await expect(sectorCards.first()).toBeVisible()
    await expect(sectorCards.nth(8)).toBeVisible()
    await expect(page.getByRole('link', { name: SELECTORS.analyzeLineItems }).first()).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 4)
    expect(hasHorizontalOverflow).toBe(false)
  })
})
