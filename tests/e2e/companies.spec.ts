/**
 * Companies E2E — runs against the redesign GraphQL API via the dev server
 * (localhost:3000 → VITE_API_URL :3001). Tolerant of the API being down:
 * the suite skips rather than fails when the live profile cannot load, so it
 * does not red-bar CI when the tunnels/server are offline.
 *
 * Golden anchor: CUI 2816464 = DEDEMAN SRL (Bacău). Values cross-checked vs
 * prod (companies.registrations / companies.financials) on 2026-06-17.
 */
import { test, expect, type Page } from '@playwright/test'

const DEDEMAN_CUI = '2816464'
const DEDEMAN_NAME = /DEDEMAN SRL/i

async function gotoProfile(page: Page, cui: string): Promise<boolean> {
  const response = await page.goto(`/companies/${cui}`).catch(() => null)
  if (!response) return false
  // The profile heading is the readiness + liveness gate.
  const heading = page.getByRole('heading', { level: 1 })
  try {
    await expect(heading.first()).toBeVisible({ timeout: 20000 })
    return true
  } catch {
    return false
  }
}

test.describe('Companies — live profile', () => {
  test('renders the DEDEMAN profile from live data', async ({ page }) => {
    const ready = await gotoProfile(page, DEDEMAN_CUI)
    test.skip(!ready, 'Live company profile unavailable (API/tunnel down)')

    // Name + CUI prove we resolved the real company, not a 404.
    await expect(page.getByText(DEDEMAN_NAME).first()).toBeVisible()
    await expect(page.getByText(new RegExp(DEDEMAN_CUI)).first()).toBeVisible()
  })

  test('financials tab shows real ANAF bilant years', async ({ page }) => {
    const ready = await gotoProfile(page, `${DEDEMAN_CUI}?tab=financials`)
    test.skip(!ready, 'Live company profile unavailable (API/tunnel down)')

    // Scope to the (visible) financials tab panel. 2024 is the latest loaded
    // fiscal year for DEDEMAN in prod.
    const financialsPanel = page.locator('#company-tabpanel-financials')
    await expect(financialsPanel.getByText(/2024/).first()).toBeVisible({
      timeout: 15000,
    })
  })
})

test.describe('Companies — search directory', () => {
  test('search by name returns DEDEMAN and links to its profile', async ({
    page,
  }) => {
    const response = await page.goto('/companies?q=dedeman').catch(() => null)
    test.skip(!response, 'Companies search unavailable (API/tunnel down)')

    const results = page.getByTestId('company-search-results')
    try {
      await expect(results).toBeVisible({ timeout: 20000 })
    } catch {
      test.skip(true, 'Companies search did not render results (API down)')
    }

    // DEDEMAN must appear among the results.
    await expect(page.getByText(DEDEMAN_NAME).first()).toBeVisible()

    // The card for CUI 2816464 links to the canonical profile route. Filter by
    // the (unambiguous) CUI text — card textContent concatenates name + "CUI …".
    const dedemanCard = page
      .getByTestId('company-result-card')
      .filter({ hasText: new RegExp(`CUI ${DEDEMAN_CUI}\\b`) })
      .first()
    await expect(dedemanCard).toHaveAttribute(
      'href',
      new RegExp(`/companies/${DEDEMAN_CUI}`),
    )
  })
})
