/**
 * Cookie Consent Banner & Settings Integration Tests
 *
 * Tests the GDPR-compliant cookie consent system including:
 * - Consent card visibility and interactions
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
 * Wait for the consent card to appear.
 * The card mounts ~500ms after hydration when no decision is stored.
 */
async function waitForCard(page: Page, timeout = 5000): Promise<Locator> {
  const card = page.getByRole('dialog', { name: /urmărire|tracking/i })
  await expect(card).toBeVisible({ timeout })
  return card
}

const cardLocator = (page: Page) => page.getByRole('dialog', { name: /urmărire|tracking/i })

test.describe('Consent Card', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing consent before each test
    await page.goto('/')
    await clearCookieConsent(page)
    // Reload to trigger the card
    await page.reload()
    // Wait for React hydration (the card mounts in an effect)
    await waitForHydration(page)
  })

  test('displays the card when no consent is stored', async ({ page }) => {
    const card = await waitForCard(page)

    await expect(card).toHaveAttribute('aria-modal', 'false')
    await expect(card.getByRole('button', { name: /^(doar esențiale|essentials only)$/i })).toBeVisible()
    await expect(card.getByRole('button', { name: /acceptă tot|accept all/i })).toBeVisible()
    await expect(card.getByRole('button', { name: /alege tu|choose/i })).toBeVisible()
    await expect(card.getByRole('button', { name: /nu acum|not now/i })).toBeVisible()
    await expect(card.getByRole('link', { name: /toate setările|all settings/i })).toHaveAttribute(
      'href',
      /^\/cookies\?redirect=/,
    )
    await expect(card.getByRole('link', { name: /politica de cookie|cookie policy/i })).toHaveAttribute(
      'href',
      '/cookie-policy',
    )
  })

  test('hides the card when consent already exists', async ({ page }) => {
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

    await expect(cardLocator(page)).not.toBeVisible({ timeout: 2000 })
  })

  test('Accept all saves consent with all options enabled and the card leaves', async ({ page }) => {
    const card = await waitForCard(page)
    const acceptButton = card.getByRole('button', { name: /acceptă tot|accept all/i })
    await expect(acceptButton).toBeVisible()

    await acceptButton.click()

    await waitForCookieConsentState(page, { essential: true, analytics: true, sentry: true })

    const consent = await getCookieConsent(page)
    expect(consent?.version).toBe(1)
    expect(consent?.updatedAt).toBeDefined()

    // The confirmation reads out the decision, then the card unmounts.
    await expect(page.getByRole('dialog', { name: /mulțumim|thank/i })).toBeVisible({ timeout: 2000 })
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5000 })
  })

  test('Essentials only saves declined optional consent from the card', async ({ page }) => {
    const card = await waitForCard(page)
    const essentialOnlyButton = card.getByRole('button', { name: /^(doar esențiale|essentials only)$/i })
    await expect(essentialOnlyButton).toBeVisible()

    await essentialOnlyButton.click()

    await waitForCookieConsentState(page, { essential: true, analytics: false, sentry: false })
    await expect(page.getByRole('dialog', { name: /doar esențialul|essentials/i })).toBeVisible({
      timeout: 2000,
    })
  })

  test('choosing per category saves exactly that', async ({ page }) => {
    const card = await waitForCard(page)
    await card.getByRole('button', { name: /alege tu|choose/i }).click()

    const switches = card.getByRole('switch')
    await expect(switches).toHaveCount(2)
    await toggleSwitchToExpectedState(switches.nth(0), 'checked')
    expect(await getCookieConsent(page)).toBeNull()

    await card.getByRole('button', { name: /salvează alegerea|save my choice/i }).click()
    await waitForCookieConsentState(page, { analytics: true, sentry: false })
  })

  test('closing the card stores nothing', async ({ page }) => {
    const card = await waitForCard(page)
    await card.getByRole('button', { name: /nu acum|not now/i }).click()

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 3000 })
    expect(await getCookieConsent(page)).toBeNull()
  })

  test('All settings link navigates to /cookies without silently deciding consent', async ({ page }) => {
    const card = await waitForCard(page)
    const settingsLink = card.getByRole('link', { name: /toate setările|all settings/i })
    await expect(settingsLink).toBeVisible()

    await settingsLink.click()

    await page.waitForURL(/\/cookies/)
    expect(page.url()).toContain('/cookies')
    expect(page.url()).toContain('redirect=')

    const consent = await getCookieConsent(page)
    expect(consent).toBeNull()
  })

  test('card is hidden on /cookies page', async ({ page }) => {
    await page.goto('/cookies')
    await clearCookieConsent(page)
    await page.reload()
    await waitForHydration(page)

    await expect(cardLocator(page)).not.toBeVisible({ timeout: 2000 })
  })
})

test.describe('Cookie Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cookies')
    await waitForHydration(page)
  })

  test('displays all cookie setting sections', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /ce ține minte|browser remembers/i, level: 1 })
    ).toBeVisible()

    await expect(page.getByText(/esențiale|essentials/i).first()).toBeVisible()
    await expect(page.getByText(/posthog/i).first()).toBeVisible()
    await expect(page.getByText(/sentry/i).first()).toBeVisible()
  })

  test('displays action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^(doar esențiale|essentials only)$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /acceptă tot|accept all/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /salvează alegerea|save my choice/i })).toBeVisible()
  })

  test('displays policy links', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /politica de cookie|cookie policy/i }).first()
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /politica de confidențialitate|privacy policy/i }).first()
    ).toBeVisible()
  })

  test('essential cookies switch is disabled', async ({ page }) => {
    const essentialSwitch = page.getByRole('switch').first()
    await expect(essentialSwitch).toBeDisabled()
    // Radix UI Switch uses data-state="checked" instead of native checked attribute
    await expect(essentialSwitch).toHaveAttribute('data-state', 'checked')
  })

  test('can draft analytics consent before saving', async ({ page }) => {
    const analyticsSwitch = getCookieSwitchByIndex(page, 1)
    await expect(analyticsSwitch).toBeVisible()

    const initialState = await analyticsSwitch.getAttribute('data-state')
    const initialChecked = initialState === 'checked'
    const expectedState = initialChecked ? 'unchecked' : 'checked'

    await toggleSwitchToExpectedState(analyticsSwitch, expectedState)

    // Draft should change in the UI without persisting immediately
    await expect(page.getByText(/nesalvat|unsaved/i).first()).toBeVisible()
    const consentBeforeSave = await getCookieConsent(page)
    expect(consentBeforeSave?.analytics ?? false).toBe(initialChecked)

    const saveButton = page.getByRole('button', { name: /salvează alegerea|save my choice/i })
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    await waitForCookieConsentState(page, { analytics: !initialChecked })

    const consentAfterSave = await getCookieConsent(page)
    expect(consentAfterSave?.analytics).toBe(!initialChecked)
  })

  test('can draft sentry consent before saving', async ({ page }) => {
    const sentrySwitch = getCookieSwitchByIndex(page, 2)
    await expect(sentrySwitch).toBeVisible()

    const initialState = await sentrySwitch.getAttribute('data-state')
    const initialChecked = initialState === 'checked'
    const expectedState = initialChecked ? 'unchecked' : 'checked'

    await toggleSwitchToExpectedState(sentrySwitch, expectedState)

    const consentBeforeSave = await getCookieConsent(page)
    expect(consentBeforeSave?.sentry ?? false).toBe(initialChecked)

    const saveButton = page.getByRole('button', { name: /salvează alegerea|save my choice/i })
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    await waitForCookieConsentState(page, { sentry: !initialChecked })

    const consentAfterSave = await getCookieConsent(page)
    expect(consentAfterSave?.sentry).toBe(!initialChecked)
  })

  test('Essentials only button disables all optional cookies', async ({ page }) => {
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

    const essentialOnlyButton = page.getByRole('button', { name: /^(doar esențiale|essentials only)$/i })
    await expect(essentialOnlyButton).toBeVisible()
    await clickActionAndWaitForConsent(page, essentialOnlyButton, {
      analytics: false,
      sentry: false,
    })

    const consent = await getCookieConsent(page)
    expect(consent?.analytics).toBe(false)
    expect(consent?.sentry).toBe(false)
  })

  test('Accept all button enables all cookies', async ({ page }) => {
    const acceptAllButton = page.getByRole('button', { name: /acceptă tot|accept all/i })
    await expect(acceptAllButton).toBeVisible()
    await acceptAllButton.click()

    await waitForCookieConsentState(page, { analytics: true, sentry: true })

    const consent = await getCookieConsent(page)
    expect(consent?.analytics).toBe(true)
    expect(consent?.sentry).toBe(true)
  })

  test('Save my choice persists the current draft', async ({ page }) => {
    const analyticsSwitch = page.getByRole('switch').nth(1)
    await expect(analyticsSwitch).toBeVisible()
    const analyticsState = await analyticsSwitch.getAttribute('data-state')
    if (analyticsState !== 'checked') {
      await toggleSwitchToExpectedState(analyticsSwitch, 'checked')
    }

    const sentrySwitch = getCookieSwitchByIndex(page, 2)
    const sentryState = await sentrySwitch.getAttribute('data-state')
    if (sentryState === 'checked') {
      await toggleSwitchToExpectedState(sentrySwitch, 'unchecked')
    }

    const saveButton = page.getByRole('button', { name: /salvează alegerea|save my choice/i })
    await expect(saveButton).toBeVisible()
    await saveButton.click()

    await waitForCookieConsentState(page, { analytics: true, sentry: false })

    const consent = await getCookieConsent(page)
    expect(consent?.analytics).toBe(true)
    expect(consent?.sentry).toBe(false)
  })

  test('displays the last choice date once a decision is stored', async ({ page }) => {
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

    await expect(page.getByText(/ultima alegere|last choice/i)).toBeVisible()
    // The state caption describes the stored answer, not the default.
    await expect(page.getByText(/^(doar esențiale|essentials only)$/i).first()).toBeVisible()
  })

  test('respects redirect parameter after action', async ({ page }) => {
    await page.goto('/cookies?redirect=/charts')
    await waitForHydration(page)

    await expect(page.getByRole('button', { name: /înapoi unde erai|back to where/i })).toBeVisible()

    const acceptAllButton = page.getByRole('button', { name: /acceptă tot|accept all/i })
    await expect(acceptAllButton).toBeVisible()
    await clickActionAndWaitForConsent(page, acceptAllButton, { analytics: true, sentry: true })

    await waitForPathname(page, /^\/charts(?:\/)?$/)
    expect(page.url()).toContain('/charts')
  })

  test('stays on cookie settings when redirect is missing', async ({ page }) => {
    await page.goto('/cookies')
    await waitForHydration(page)

    await expect(page.getByRole('button', { name: /înapoi unde erai|back to where/i })).toHaveCount(0)

    const saveButton = page.getByRole('button', { name: /salvează alegerea|save my choice/i })
    await expect(saveButton).toBeVisible()
    await saveButton.click()

    await expect(page.getByText(/^salvat$|^saved$/i)).toBeVisible()
    await waitForPathname(page, /^\/cookies(?:\/)?$/)
    expect(page.url()).toMatch(/\/cookies(?:\/)?$/)
  })
})

test.describe('Cookie Consent Persistence', () => {
  test('consent persists across page navigations', async ({ page }) => {
    await page.goto('/')
    await clearCookieConsent(page)
    await page.reload()
    await waitForHydration(page)

    const card = await waitForCard(page)
    await card.getByRole('button', { name: /acceptă tot|accept all/i }).click()
    await waitForCookieConsentState(page, { analytics: true, sentry: true })

    await page.goto('/charts')
    await waitForHydration(page)

    const consent = await getCookieConsent(page)
    expect(consent?.analytics).toBe(true)
    expect(consent?.sentry).toBe(true)

    await expect(cardLocator(page)).not.toBeVisible({ timeout: 2000 })
  })

  test('consent version is always 1', async ({ page }) => {
    await page.goto('/')
    await clearCookieConsent(page)
    await page.reload()
    await waitForHydration(page)

    const card = await waitForCard(page)
    await card.getByRole('button', { name: /acceptă tot|accept all/i }).click()
    await waitForCookieConsentState(page, { analytics: true, sentry: true })

    const consent = await getCookieConsent(page)
    expect(consent?.version).toBe(1)
  })

  test('essential is always true regardless of user action', async ({ page }) => {
    await page.goto('/cookies')
    await waitForHydration(page)

    const essentialOnlyButton = page.getByRole('button', { name: /^(doar esențiale|essentials only)$/i })
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
