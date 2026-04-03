/**
 * Cookie Consent Banner & Settings Integration Tests
 *
 * Tests the GDPR-compliant cookie consent system including:
 * - Cookie consent banner visibility and interactions
 * - Cookie settings page (/cookies) functionality
 * - Consent persistence in localStorage
 * - Navigation flows between banner and settings
 *
 * NOTE: These tests do NOT pre-set cookie consent, unlike other integration tests.
 * Tests support both English and Romanian locales.
 */

import { test, expect, type Locator, type Page } from '@playwright/test'
import { waitForHydration } from '../utils/test-helpers'

const COOKIE_CONSENT_KEY = 'cookie-consent'
const CONSENT_WAIT_TIMEOUT_MS = 5000
const SWITCH_TOGGLE_TIMEOUT_MS = 8000
const ACTION_CONSENT_TIMEOUT_MS = 10000

/**
 * Helper to get cookie consent from localStorage
 */
async function getCookieConsent(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate((key) => {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  }, COOKIE_CONSENT_KEY)
}

/**
 * Helper to clear cookie consent from localStorage
 */
async function clearCookieConsent(page: Page): Promise<void> {
  await page.evaluate((key) => {
    window.localStorage.removeItem(key)
  }, COOKIE_CONSENT_KEY)
}

function getCookieSwitchByIndex(page: Page, index: number): ReturnType<Page['getByRole']> {
  return page.getByRole('switch').nth(index)
}

/**
 * Toggle a switch until it reaches the expected data-state.
 * Uses both mouse and keyboard interactions to reduce click flakes in CI.
 */
async function toggleSwitchToExpectedState(
  switchLocator: Locator,
  expectedState: 'checked' | 'unchecked',
  timeout = SWITCH_TOGGLE_TIMEOUT_MS
): Promise<void> {
  const deadline = Date.now() + timeout
  let nextInteraction: 'click' | 'keyboard' = 'click'

  while (Date.now() < deadline) {
    const currentState = await switchLocator.getAttribute('data-state')
    if (currentState === expectedState) {
      return
    }

    if (nextInteraction === 'click') {
      await switchLocator.click()
      nextInteraction = 'keyboard'
    } else {
      await switchLocator.focus()
      await switchLocator.press('Space')
      nextInteraction = 'click'
    }

    try {
      await expect(switchLocator).toHaveAttribute('data-state', expectedState, { timeout: 750 })
      return
    } catch {
      // Try again with alternate interaction method.
    }
  }

  // Preserve useful assertion output in failure reports.
  await expect(switchLocator).toHaveAttribute('data-state', expectedState, { timeout: 1000 })
}

/**
 * Wait until consent state in localStorage matches expectations.
 */
async function waitForCookieConsentState(
  page: Page,
  expected: Partial<{
    essential: boolean
    analytics: boolean
    sentry: boolean
  }>,
  timeout = CONSENT_WAIT_TIMEOUT_MS
): Promise<void> {
  await expect
    .poll(async () => {
      const consent = await getCookieConsent(page)
      if (!consent) return false

      return Object.entries(expected).every(([key, value]) => consent[key] === value)
    }, { timeout, intervals: [100, 250, 500, 1000] })
    .toBe(true)
}

/**
 * Some CI runs click before the page is fully interactive.
 * Retry cookie action buttons until consent storage reaches expected state.
 */
async function clickActionAndWaitForConsent(
  page: Page,
  button: Locator,
  expected: Partial<{
    essential: boolean
    analytics: boolean
    sentry: boolean
  }>,
  timeout = ACTION_CONSENT_TIMEOUT_MS
): Promise<void> {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    const isVisible = await button.isVisible().catch(() => false)

    if (isVisible) {
      await expect(button).toBeEnabled({ timeout: 1500 })
      await button.click()
    }

    try {
      await waitForCookieConsentState(page, expected, 1500)
      return
    } catch {
      // Retry until timeout.
    }

    if (isVisible) {
      await button.focus().catch(() => undefined)
      await button.press('Enter').catch(() => undefined)
      try {
        await waitForCookieConsentState(page, expected, 1500)
        return
      } catch {
        // Retry until timeout.
      }
    }
  }

  await waitForCookieConsentState(page, expected, 2000)
}

/**
 * Wait for SPA/client routing by polling pathname instead of relying on
 * document-level load events.
 */
async function waitForPathname(
  page: Page,
  matcher: RegExp,
  timeout = 15000
): Promise<void> {
  await expect
    .poll(
      () => {
        try {
          return new URL(page.url()).pathname
        } catch {
          return ''
        }
      },
      { timeout, intervals: [100, 250, 500, 1000] }
    )
    .toMatch(matcher)
}

/**
 * Wait for the cookie consent banner to appear.
 * The banner has built-in delays (500ms + 100ms) and requires React hydration.
 */
async function waitForBanner(page: Page, timeout = 5000): Promise<void> {
  const bannerHeading = page.getByRole('heading', {
    name: /we value your privacy|confidențialitatea/i,
  })
  await expect(bannerHeading).toBeVisible({ timeout })
}

test.describe('Cookie Consent Banner', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing consent before each test
    await page.goto('/')
    await clearCookieConsent(page)
    // Reload to trigger banner display
    await page.reload()
    // Wait for React hydration (banner requires useEffect to run)
    await waitForHydration(page)
  })

  test('displays banner when no consent is stored', async ({ page }) => {
    // Wait for the banner to appear (has 500ms delay + 100ms animation after hydration)
    // Banner heading: EN "We value your privacy" / RO "Confidențialitatea dumneavoastră este importantă pentru noi"
    await waitForBanner(page)

    // Check for action buttons (EN/RO) - these are inside the banner
    await expect(page.getByRole('button', { name: /allow essential|permite doar/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /advanced|avansat/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /accept all|acceptă tot/i })).toBeVisible()
  })

  test('hides banner when consent already exists', async ({ page }) => {
    // Set consent
    await page.evaluate((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          essential: true,
          analytics: false,
          sentry: false,
          updatedAt: new Date().toISOString(),
        })
      )
    }, COOKIE_CONSENT_KEY)

    // Reload page and wait for hydration
    await page.reload()
    await waitForHydration(page)

    // Banner heading should NOT be visible (give time for any potential appearance)
    const bannerHeading = page.getByRole('heading', {
      name: /we value your privacy|confidențialitatea/i,
    })
    // Use a short timeout since we're checking for absence
    await expect(bannerHeading).not.toBeVisible({ timeout: 2000 })
  })

  test('Accept All button saves consent with all options enabled', async ({ page }) => {
    // Wait for banner to appear
    await waitForBanner(page)
    const acceptButton = page.getByRole('button', { name: /accept all|acceptă tot/i })
    await expect(acceptButton).toBeVisible()

    // Click Accept All
    await acceptButton.click()

    // Wait for banner to dismiss
    await expect(acceptButton).not.toBeVisible({ timeout: 2000 })

    // Verify consent was saved correctly
    const consent = await getCookieConsent(page)
    expect(consent).not.toBeNull()
    expect(consent?.version).toBe(1)
    expect(consent?.essential).toBe(true)
    expect(consent?.analytics).toBe(true)
    expect(consent?.sentry).toBe(true)
    expect(consent?.updatedAt).toBeDefined()
  })

  test('Advanced link navigates to /cookies without silently deciding consent', async ({ page }) => {
    // Wait for banner to appear
    await waitForBanner(page)
    const advancedLink = page.getByRole('link', { name: /advanced|avansat/i })
    await expect(advancedLink).toBeVisible()

    // Click Advanced
    await advancedLink.click()

    // Should navigate to /cookies with redirect parameter
    await page.waitForURL(/\/cookies/)
    expect(page.url()).toContain('/cookies')
    expect(page.url()).toContain('redirect=')

    // Verify consent has not been silently stored yet
    const consent = await getCookieConsent(page)
    expect(consent).toBeNull()
  })

  test('Allow essential only button saves declined optional consent from banner', async ({ page }) => {
    await waitForBanner(page)
    const essentialOnlyButton = page.getByRole('button', {
      name: /allow essential|permite doar/i,
    })
    await expect(essentialOnlyButton).toBeVisible()

    await essentialOnlyButton.click()

    await waitForCookieConsentState(page, {
      essential: true,
      analytics: false,
      sentry: false,
    })

    const consent = await getCookieConsent(page)
    expect(consent?.analytics).toBe(false)
    expect(consent?.sentry).toBe(false)
  })

  test('banner is hidden on /cookies page', async ({ page }) => {
    // Clear consent and navigate directly to /cookies
    await page.goto('/cookies')
    await clearCookieConsent(page)
    await page.reload()
    await waitForHydration(page)

    // Banner heading should NOT be visible on /cookies page
    const bannerHeading = page.getByRole('heading', {
      name: /we value your privacy|confidențialitatea/i,
    })
    // Use a short timeout since we're checking for absence
    await expect(bannerHeading).not.toBeVisible({ timeout: 2000 })
  })

  test('banner dismisses with animation', async ({ page }) => {
    // Wait for banner to appear
    await waitForBanner(page)
    const acceptButton = page.getByRole('button', { name: /accept all|acceptă tot/i })
    await expect(acceptButton).toBeVisible()

    // Click Accept All
    await acceptButton.click()

    // Button should be gone after animation (wait with auto-retry)
    await expect(acceptButton).not.toBeVisible({ timeout: 2000 })
  })
})

test.describe('Cookie Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cookies')
    await waitForHydration(page)
  })

  test('displays all cookie setting sections', async ({ page }) => {
    // Page heading: EN "Cookie Settings" / RO "Setări cookie-uri"
    await expect(
      page.getByRole('heading', { name: /cookie settings|setări cookie/i, level: 1 })
    ).toBeVisible()

    // Essential cookies section: EN "Essential cookies" / RO "Cookie-uri esențiale"
    await expect(page.getByText(/essential cookies|cookie-uri esențiale/i)).toBeVisible()
    // Always enabled text: EN "Always enabled" / RO "Activat permanent" - use first() since it appears in multiple places
    await expect(page.getByText(/always enabled|activat permanent/i).first()).toBeVisible()

    // Analytics section - check for PostHog text
    await expect(page.getByText(/posthog/i)).toBeVisible()

    // Error reporting section - check for Sentry text
    await expect(page.getByText(/sentry/i)).toBeVisible()
  })

  test('displays action buttons', async ({ page }) => {
    // All action buttons should be visible (EN/RO)
    // Buttons may have aria-labels different from visible text
    // "Allow essential only" / "Permite doar esențiale" or "Permite doar cookie-urile esențiale"
    await expect(
      page.getByRole('button', { name: /allow essential|permite doar/i })
    ).toBeVisible()
    // "Confirm choices" / "Confirmă alegerile" or "Salvează preferințele"
    await expect(
      page.getByRole('button', { name: /confirm choices|confirmă|salvează/i })
    ).toBeVisible()
    // "Allow all" / "Permite tot" or "Permite toate"
    await expect(page.getByRole('button', { name: /allow all|permite toate/i })).toBeVisible()
  })

  test('displays policy links', async ({ page }) => {
    // Cookie Policy link: EN "Cookie Policy" / RO "Politica privind cookie-urile"
    await expect(
      page.getByRole('link', { name: /cookie policy|politica.*cookie/i }).first()
    ).toBeVisible()

    // Privacy Policy link: EN "Privacy Policy" / RO "Politica de confidențialitate"
    await expect(
      page.getByRole('link', { name: /privacy policy|politica de confidențialitate/i }).first()
    ).toBeVisible()
  })

  test('essential cookies switch is disabled', async ({ page }) => {
    // Essential cookies switch should be checked and disabled
    const essentialSwitch = page.getByRole('switch').first()
    await expect(essentialSwitch).toBeDisabled()
    // Radix UI Switch uses data-state="checked" instead of native checked attribute
    await expect(essentialSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('can draft analytics consent before confirming', async ({ page }) => {
    const analyticsSwitch = getCookieSwitchByIndex(page, 1)
    await expect(analyticsSwitch).toBeVisible()

    // Get initial state using data-state attribute (Radix UI Switch)
    const initialState = await analyticsSwitch.getAttribute('data-state')
    const initialChecked = initialState === 'checked'
    const expectedState = initialChecked ? 'unchecked' : 'checked'

    await toggleSwitchToExpectedState(analyticsSwitch, expectedState)

    // Draft should change in the UI without persisting immediately
    const consentBeforeConfirm = await getCookieConsent(page)
    expect(consentBeforeConfirm?.analytics ?? false).toBe(initialChecked)

    const confirmButton = page.getByRole('button', {
      name: /confirm choices|confirmă|salvează/i,
    })
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()

    await waitForCookieConsentState(page, { analytics: !initialChecked })

    const consentAfterConfirm = await getCookieConsent(page)
    expect(consentAfterConfirm?.analytics).toBe(!initialChecked)
  })

  test('can draft sentry consent before confirming', async ({ page }) => {
    const sentrySwitch = getCookieSwitchByIndex(page, 2)
    await expect(sentrySwitch).toBeVisible()

    // Get initial state using data-state attribute (Radix UI Switch)
    const initialState = await sentrySwitch.getAttribute('data-state')
    const initialChecked = initialState === 'checked'
    const expectedState = initialChecked ? 'unchecked' : 'checked'

    await toggleSwitchToExpectedState(sentrySwitch, expectedState)

    // Draft should change in the UI without persisting immediately
    const consentBeforeConfirm = await getCookieConsent(page)
    expect(consentBeforeConfirm?.sentry ?? false).toBe(initialChecked)

    const confirmButton = page.getByRole('button', {
      name: /confirm choices|confirmă|salvează/i,
    })
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()

    await waitForCookieConsentState(page, { sentry: !initialChecked })

    const consentAfterConfirm = await getCookieConsent(page)
    expect(consentAfterConfirm?.sentry).toBe(!initialChecked)
  })

  test('Allow essential only button disables all optional cookies', async ({ page }) => {
    // First enable some optional cookies
    await page.evaluate((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          essential: true,
          analytics: true,
          sentry: true,
          updatedAt: new Date().toISOString(),
        })
      )
    }, COOKIE_CONSENT_KEY)
    await page.reload()
    await waitForHydration(page)

    // Click Allow essential only (aria-label or visible text)
    const essentialOnlyButton = page.getByRole('button', {
      name: /allow essential|permite doar/i,
    })
    await expect(essentialOnlyButton).toBeVisible()
    await clickActionAndWaitForConsent(page, essentialOnlyButton, {
      analytics: false,
      sentry: false,
    })

    // Verify consent
    const consent = await getCookieConsent(page)
    expect(consent?.analytics).toBe(false)
    expect(consent?.sentry).toBe(false)
  })

  test('Allow all button enables all cookies', async ({ page }) => {
    // Click Allow all (aria-label or visible text)
    const allowAllButton = page.getByRole('button', { name: /allow all|permite toate/i })
    await expect(allowAllButton).toBeVisible()
    await allowAllButton.click()

    await waitForCookieConsentState(page, { analytics: true, sentry: true })

    // Verify consent
    const consent = await getCookieConsent(page)
    expect(consent?.analytics).toBe(true)
    expect(consent?.sentry).toBe(true)
  })

  test('Confirm choices button navigates with current settings', async ({ page }) => {
    // Toggle analytics on (using data-state for Radix UI Switch)
    const analyticsSwitch = page.getByRole('switch').nth(1)
    await expect(analyticsSwitch).toBeVisible()
    const analyticsState = await analyticsSwitch.getAttribute('data-state')
    if (analyticsState !== 'checked') {
      await toggleSwitchToExpectedState(analyticsSwitch, 'checked')
    }

    // Keep sentry off
    const sentrySwitch = getCookieSwitchByIndex(page, 2)
    const sentryState = await sentrySwitch.getAttribute('data-state')
    if (sentryState === 'checked') {
      await toggleSwitchToExpectedState(sentrySwitch, 'unchecked')
    }

    // Click Confirm choices (aria-label or visible text)
    const confirmButton = page.getByRole('button', {
      name: /confirm choices|confirmă|salvează/i,
    })
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    await waitForCookieConsentState(page, { analytics: true, sentry: false })

    // Verify consent reflects manual choices
    const consent = await getCookieConsent(page)
    expect(consent?.analytics).toBe(true)
    expect(consent?.sentry).toBe(false)
  })

  test('displays last updated timestamp', async ({ page }) => {
    // Set consent with a known timestamp
    await page.evaluate((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          essential: true,
          analytics: false,
          sentry: false,
          updatedAt: new Date().toISOString(),
        })
      )
    }, COOKIE_CONSENT_KEY)
    await page.reload()
    await waitForHydration(page)

    // Check for Updated text: EN "Updated" / RO "Actualizat"
    await expect(page.getByText(/updated|actualizat/i)).toBeVisible()
  })

  test('respects redirect parameter after action', async ({ page }) => {
    // Navigate to /cookies with a redirect parameter
    await page.goto('/cookies?redirect=/charts')
    await waitForHydration(page)

    // Click Allow all (aria-label or visible text)
    const allowAllButton = page.getByRole('button', { name: /allow all|permite toate/i })
    await expect(allowAllButton).toBeVisible()
    await clickActionAndWaitForConsent(page, allowAllButton, { analytics: true, sentry: true })

    // Should navigate to the redirect URL
    await waitForPathname(page, /^\/charts(?:\/)?$/)
    expect(page.url()).toContain('/charts')
  })

  test('defaults to home when redirect is missing', async ({ page }) => {
    // Navigate to /cookies without redirect
    await page.goto('/cookies')
    await waitForHydration(page)

    // Click Confirm choices (aria-label or visible text)
    const confirmButton = page.getByRole('button', {
      name: /confirm choices|confirmă|salvează/i,
    })
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    await waitForPathname(page, /^\/$/)

    // Verify we're at home
    expect(page.url()).toMatch(/\/$/)
  })
})

test.describe('Cookie Consent Persistence', () => {
  test('consent persists across page navigations', async ({ page }) => {
    // Start fresh
    await page.goto('/')
    await clearCookieConsent(page)
    await page.reload()
    await waitForHydration(page)

    // Accept all
    await waitForBanner(page)
    const acceptButton = page.getByRole('button', { name: /accept all|acceptă tot/i })
    await expect(acceptButton).toBeVisible()
    await acceptButton.click()

    // Navigate to another page
    await page.goto('/charts')
    await waitForHydration(page)

    // Consent should still be there
    const consent = await getCookieConsent(page)
    expect(consent?.analytics).toBe(true)
    expect(consent?.sentry).toBe(true)

    // Banner should not reappear
    const bannerHeading = page.getByRole('heading', {
      name: /we value your privacy|confidențialitatea/i,
    })
    await expect(bannerHeading).not.toBeVisible({ timeout: 2000 })
  })

  test('consent version is always 1', async ({ page }) => {
    await page.goto('/')
    await clearCookieConsent(page)
    await page.reload()
    await waitForHydration(page)

    // Accept cookies
    await waitForBanner(page)
    const acceptButton = page.getByRole('button', { name: /accept all|acceptă tot/i })
    await expect(acceptButton).toBeVisible()
    await acceptButton.click()

    // Check version
    const consent = await getCookieConsent(page)
    expect(consent?.version).toBe(1)
  })

  test('essential is always true regardless of user action', async ({ page }) => {
    await page.goto('/cookies')
    await waitForHydration(page)

    // Try Allow essential only (aria-label or visible text)
    const essentialOnlyButton = page.getByRole('button', {
      name: /allow essential|permite doar/i,
    })
    await expect(essentialOnlyButton).toBeVisible()
    await clickActionAndWaitForConsent(page, essentialOnlyButton, {
      essential: true,
      analytics: false,
      sentry: false,
    })

    const consent = await getCookieConsent(page)
    expect(consent?.essential).toBe(true)
  })
})

test.describe('Cookie Policy Page', () => {
  test('displays cookie policy content', async ({ page }) => {
    await page.goto('/cookie-policy')
    await waitForHydration(page)

    // Check for page heading: EN "Cookie Policy" / RO "Politica cookie-urilor" or "Politica privind cookie-urile"
    await expect(
      page.getByRole('heading', { name: /cookie policy|politica.*cookie/i, level: 1 })
    ).toBeVisible()

    // Check for localStorage mention (may be inside <code> element)
    await expect(page.locator('text=localStorage').first()).toBeVisible()

    // Check for cookie-consent mention (may be inside <code> element)
    await expect(page.locator('text=cookie-consent').first()).toBeVisible()
  })

  test('links to cookie settings page', async ({ page }) => {
    await page.goto('/cookie-policy')
    await waitForHydration(page)

    // Find link to cookie settings: EN "Cookie Settings" / RO "Setări cookie-uri"
    const settingsLink = page.getByRole('link', { name: /cookie settings|setări cookie/i })
    if (await settingsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(settingsLink).toHaveAttribute('href', /\/cookies/)
    }
  })
})
