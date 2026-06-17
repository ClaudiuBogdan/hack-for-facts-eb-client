import { test, expect } from '@playwright/test'

/**
 * Live-data guard: fails when the app serves mock company fixtures instead of
 * the live redesign GraphQL API (e.g. when the dev server was started with
 * VITE_USE_MOCK_DATA=true). Modeled on feat/unified-explorer's guard, adapted
 * to companies + GraphQL.
 *
 * Strategy: the mock company registry never contains DEDEMAN (CUI 2816464);
 * its fixtures are DANTE INTERNATIONAL / ANTIBIOTICE / EXEMPLU REGISTRU. So a
 * DEDEMAN profile that renders DEDEMAN proves live data, and a DEDEMAN URL that
 * renders a mock company name proves the app is on fixtures → fail loudly.
 *
 * If the live profile cannot load at all (API/tunnel down), we skip — the guard
 * catches "served mock instead of live", not "API offline".
 */
const MOCK_COMPANY_NAMES = [
  'DANTE INTERNATIONAL',
  'ANTIBIOTICE SA',
  'EXEMPLU REGISTRU CULTURAL',
]

test.describe('Live-data guard (companies)', () => {
  test('DEDEMAN profile renders live data, not mock fixtures', async ({
    page,
  }) => {
    const response = await page.goto('/companies/2816464').catch(() => null)
    test.skip(!response, 'Company profile route unavailable')

    const heading = page.getByRole('heading', { level: 1 }).first()
    const ready = await heading
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live company profile unavailable (API/tunnel down)')

    const bodyText = (await page.locator('body').textContent()) ?? ''

    // The page must NOT contain any mock company name.
    for (const mockName of MOCK_COMPANY_NAMES) {
      expect(bodyText).not.toContain(mockName)
    }

    // And it MUST contain the live company name.
    expect(bodyText).toContain('DEDEMAN')
  })
})
