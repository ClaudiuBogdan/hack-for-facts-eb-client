/**
 * Integration Test Helpers
 *
 * Provides reliable waiting strategies for flaky-free integration tests.
 * Key principles:
 * 1. Never use waitForTimeout - it's inherently flaky
 * 2. Always wait for specific state changes (URL, attributes, text)
 * 3. Wait for hydration before interacting with elements
 * 4. Use Playwright's auto-retry assertions
 */

import type { Page, Locator, Request } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * React attaches its props to an element when it hydrates it (or renders it). A server-rendered control without
 * them is not React's yet: text typed into it stays in the box but never reaches React (React 19 hydrates an input
 * without a change event), and a click on it does nothing (TEST-003).
 */
const HYDRATED_KEY = '__reactProps$'

/**
 * The page's controls React does not own yet, named for an error message; empty once the page is hydrated. The map
 * libraries build their own controls (Leaflet's and MapLibre's zoom buttons), which React never owns: not counted.
 */
function unhydratedControls(): string[] {
  const owned = (element: Element) => Object.keys(element).some((key) => key.startsWith('__reactProps$'))
  const name = (element: Element) =>
    `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.getAttribute('aria-label') ? `[aria-label="${element.getAttribute('aria-label')}"]` : ''}`
  const stray = [...document.querySelectorAll('input, textarea, select, button')]
    .filter((element) => !element.closest('.leaflet-container, .maplibregl-map') && !owned(element))
    .map(name)
  return owned(document.body) ? stray : ['body', ...stray]
}

/**
 * Why a page may not have hydrated, for the error. It lists the page's uncaught errors and console errors since it was
 * last loaded, and its recent requests that failed or were answered 400 or more (a script chunk that never came, or
 * Chromium's ERR_NETWORK_CHANGED on a busy host). A page that never hydrates looks the same in a snapshot whatever
 * the cause (TEST-003, the open observation of 26 November).
 */
async function whatThePageSaid(page: Page): Promise<string> {
  const [errors, messages, requests] = await Promise.all([
    page.pageErrors({ filter: 'since-navigation' }).catch(() => []),
    page.consoleMessages({ filter: 'since-navigation' }).catch(() => []),
    page.requests().catch(() => []),
  ])
  // A request still open (a stream) has no response yet, and asking for one would wait for it: a second is enough.
  const responseOf = (request: Request) =>
    Promise.race([request.response().catch(() => null), new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))])
  const badRequests = await Promise.all(
    requests.map(async (request) => {
      const failure = request.failure()?.errorText
      const status = failure ? null : ((await responseOf(request))?.status() ?? null)
      const outcome = failure ?? (status !== null && status >= 400 ? `HTTP ${status}` : null)
      return outcome ? `request ${request.method()} ${request.url().split('?')[0]}: ${outcome}` : null
    }),
  )
  // The requests before the console: they name the URL, which the console's "Failed to load resource" leaves out.
  const lines = [
    ...errors.map((pageError) => `page error: ${pageError.message}`),
    ...badRequests.filter((line) => line !== null),
    ...messages.filter((message) => message.type() === 'error').map((message) => `console error: ${message.text()}`),
  ].map((line) => line.slice(0, 300))
  if (lines.length === 0) return '\nThe page reported no error, console error or failed request.'
  const counts = new Map<string, number>()
  for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1)
  const listed = [...counts].slice(0, 12).map(([line, count]) => `  - ${line}${count > 1 ? ` (×${count})` : ''}`)
  return `\nWhat the page reported:\n${listed.join('\n')}`
}

/**
 * Wait for the page to be fully hydrated and interactive: the network idle, the loading skeletons gone, and React
 * owning the page — the body and every form control and button carry React's props (TEST-003), except the controls
 * the map libraries build themselves. The body alone is not enough: React 19 hydrates a page boundary by boundary,
 * and its controls follow. Fails, naming the controls, if React has not taken the page within 15 s.
 */
export async function waitForHydration(page: Page): Promise<void> {
  // Wait for network to settle (API calls complete)
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
    // networkidle might timeout in some cases, continue anyway
  })

  // Wait for any loading skeletons to disappear
  const skeleton = page.locator('.animate-pulse, [class*="skeleton"]').first()
  await skeleton.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
    // Skeleton might not exist, continue
  })

  // Wait for React to own the page (the map libraries' own controls aside, as in unhydratedControls).
  await page.waitForFunction(() => {
    const owned = (element: Element) => Object.keys(element).some((key) => key.startsWith('__reactProps$'))
    const controls = [...document.querySelectorAll('input, textarea, select, button')].filter((element) => !element.closest('.leaflet-container, .maplibregl-map'))
    return owned(document.body) && controls.every(owned)
  }, undefined, { timeout: 15000 }).catch(async (error: unknown) => {
    // A page that failed outright also lands here; its own error is the cause.
    const stray = await page.evaluate(unhydratedControls).catch(() => [])
    throw new Error(`React has not hydrated the page within 15 s (TEST-003); not yet React's: ${stray.slice(0, 8).join(', ') || 'unknown'}${await whatThePageSaid(page)}`, { cause: error })
  })

  // React writes the props key while it renders a boundary and commits it after; listeners added in effects (a
  // keyboard shortcut, say) come later still. Two frames and a task give the last boundary its commit and effects.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0)))))
}

/**
 * Wait until React has hydrated one element (TEST-003): its own props are on it. For a control a test types into
 * or clicks before anything else on a page that is still hydrating.
 */
export async function waitForElementHydration(locator: Locator, timeout = 15000): Promise<void> {
  await expect
    // A reload or a re-render between polls can detach the element: not hydrated yet, poll again.
    .poll(() => locator.evaluate((element, key) => Object.keys(element).some((name) => name.startsWith(key)), HYDRATED_KEY).catch(() => false), { timeout })
    .toBe(true)
}

/**
 * Click a toggle and wait for its state to change.
 * Uses URL as source of truth when urlPattern is provided.
 */
export async function clickToggleAndWait(
  page: Page,
  toggle: Locator,
  options: {
    /** Expected URL pattern after click (regex) */
    expectedUrl?: RegExp
    /** Expected data-state value after click */
    expectedState?: 'on' | 'off'
    /** Timeout for waiting */
    timeout?: number
  } = {}
): Promise<void> {
  const { expectedUrl, expectedState = 'on', timeout = 10000 } = options

  // Ensure toggle is visible and enabled before clicking
  await expect(toggle).toBeVisible({ timeout })
  await expect(toggle).toBeEnabled({ timeout })

  // Get current state to detect change
  const currentState = await toggle.getAttribute('data-state')

  // Perform the click
  await toggle.click()

  // Wait for URL change if pattern provided (URL is source of truth)
  if (expectedUrl) {
    await expect(page).toHaveURL(expectedUrl, { timeout })
  }

  // Wait for toggle state to update
  // Only check if we expect a state change
  if (currentState !== expectedState) {
    await expect(toggle).toHaveAttribute('data-state', expectedState, { timeout })
  }
}

/**
 * Click a toggle that updates URL parameters and verify the change.
 * More reliable than checking element state directly.
 */
export async function clickToggleWithUrlVerification(
  page: Page,
  toggle: Locator,
  urlPattern: RegExp,
  timeout = 10000
): Promise<void> {
  // Wait for toggle to be interactable
  await expect(toggle).toBeVisible({ timeout })
  await expect(toggle).toBeEnabled({ timeout })

  // Click and wait for URL
  await toggle.click()
  await expect(page).toHaveURL(urlPattern, { timeout })

  // After URL updates, the component should re-render with correct state
  // Give React a moment to reconcile state from URL
  await expect(toggle).toHaveAttribute('data-state', 'on', { timeout })
}

/**
 * Select an option from a combobox/select and verify the selection.
 */
export async function selectOptionAndWait(
  page: Page,
  combobox: Locator,
  optionLocator: Locator,
  expectedText: RegExp,
  timeout = 10000
): Promise<void> {
  // Open the combobox
  await expect(combobox).toBeVisible({ timeout })
  await combobox.click()

  // Wait for dropdown to open and option to be visible
  await expect(optionLocator).toBeVisible({ timeout })

  // Click the option
  await optionLocator.click()

  // Verify selection - combobox should now contain the expected text
  await expect(combobox).toContainText(expectedText, { timeout })
}

/**
 * Wait for a specific URL parameter to be present.
 * Useful for verifying state persistence.
 */
export async function waitForUrlParam(
  page: Page,
  paramPattern: RegExp,
  timeout = 10000
): Promise<void> {
  await expect(page).toHaveURL(paramPattern, { timeout })
}

/**
 * Verify a toggle group has the expected item selected.
 */
export async function verifyToggleGroupState(
  page: Page,
  groupSelector: string,
  expectedOnText: RegExp,
  timeout = 10000
): Promise<void> {
  const selectedToggle = page.locator(`${groupSelector} [data-state="on"]`)
  await expect(selectedToggle.filter({ hasText: expectedOnText })).toBeVisible({ timeout })
}

/**
 * Wait for page content to be interactive (not in loading state).
 */
export async function waitForPageReady(page: Page): Promise<void> {
  // Wait for basic load
  await page.waitForLoadState('domcontentloaded')

  // Wait for main content to be present
  await page.waitForSelector('.recharts-responsive-container, [class*="card"]', {
    timeout: 15000,
    state: 'visible',
  }).catch(() => {
    // Content might not have recharts, continue
  })

  // Wait for hydration
  await waitForHydration(page)
}

/**
 * Safely click an element, ensuring it's ready for interaction.
 */
export async function safeClick(
  locator: Locator,
  timeout = 10000
): Promise<void> {
  await expect(locator).toBeVisible({ timeout })
  await expect(locator).toBeEnabled({ timeout })
  await locator.click()
}
