/**
 * Integration tests for the experimental global entity-search page.
 *
 * Route: /experimental/search
 * Focus: the redesign `searchEntities` UI — results + type badges + deep-links,
 * facet chips, keyboard nav, and the empty / zero / error / degraded states,
 * on both desktop and mobile viewports. GraphQL is mocked (fixtures under
 * tests/fixtures/experimental-search-flow/).
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const SEARCH_OP = 'SearchEntities'
const ROUTE = '/experimental/search'
const LISTBOX = '#es-listbox'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL(SEARCH_OP, 'results', { variables: { q: 'dedeman' } })
  await mockApi.mockGraphQL(SEARCH_OP, 'zero', { variables: { q: 'zzzqqq' } })
  await mockApi.mockGraphQL(SEARCH_OP, 'error', { variables: { q: 'boom' } })
  await mockApi.mockGraphQL(SEARCH_OP, 'postgres', { variables: { q: 'fallback' } })
}

test.describe('Experimental entity search — desktop', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('initial state shows the search box and no results listbox', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(page.getByRole('combobox')).toBeVisible()
    await expect(page.locator(LISTBOX)).toHaveCount(0)
  })

  test('typing returns badged results with correct deep-links', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await page.getByRole('combobox').fill('dedeman')

    const listbox = page.locator(LISTBOX)
    await expect(listbox).toBeVisible({ timeout: 15000 })
    await expect(listbox.getByRole('option')).toHaveCount(4)

    // company → internal /companies/$cui (by cuis[0])
    await expect(page.locator('a[href="/companies/2816464"]')).toBeVisible()
    // public_enterprise → internal /entities/$cui (by cuis[0])
    await expect(page.locator('a[href="/entities/10020943"]')).toBeVisible()
    // legal_act + procurement_contract → external (new tab)
    await expect(listbox.locator('a[target="_blank"]')).toHaveCount(2)
    await expect(
      listbox.locator('a[target="_blank"][rel*="noopener"]').first(),
    ).toBeVisible()

    // titles render as plain text
    await expect(page.getByText('DEDEMAN SRL')).toBeVisible()

    await page.screenshot({ path: 'tmp/shots/desktop-results.png', fullPage: true })
  })

  test('facet chips render with counts and toggle the URL', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await page.getByRole('combobox').fill('dedeman')
    await expect(page.locator(LISTBOX)).toBeVisible({ timeout: 15000 })

    const chips = page.locator('button[aria-pressed]')
    expect(await chips.count()).toBeGreaterThan(1)

    // Click the first non-"all" facet chip → URL gains a types param.
    const legalChip = page.locator('button[aria-pressed]', { hasText: /legi|legisla/i }).first()
    await legalChip.click()
    await expect.poll(() => new URL(page.url()).searchParams.has('types')).toBe(true)
  })

  test('keyboard navigation drives aria-activedescendant', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    const input = page.getByRole('combobox')
    await input.fill('dedeman')
    await expect(page.locator(LISTBOX)).toBeVisible({ timeout: 15000 })

    // first result auto-active on fresh results
    await expect(input).toHaveAttribute('aria-activedescendant', 'es-opt-0')
    await input.press('ArrowDown')
    await expect(input).toHaveAttribute('aria-activedescendant', 'es-opt-1')
    await input.press('ArrowUp')
    await expect(input).toHaveAttribute('aria-activedescendant', 'es-opt-0')
  })

  test('zero-results state', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await page.getByRole('combobox').fill('zzzqqq')

    await expect(page.locator(`${LISTBOX} [role="option"]`)).toHaveCount(0)
    await expect(page.getByText(/niciun rezultat/i)).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: 'tmp/shots/desktop-zero.png', fullPage: true })
  })

  test('error state surfaces an alert', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await page.getByRole('combobox').fill('boom')

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20000 })
    await page.screenshot({ path: 'tmp/shots/desktop-error.png', fullPage: true })
  })

  test('degraded engine (postgres) shows a hint', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await page.getByRole('combobox').fill('fallback')

    await expect(page.locator(LISTBOX)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/simpl/i)).toBeVisible()
  })
})

test.describe('Experimental entity search — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('renders results on a narrow viewport', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(page.getByRole('combobox')).toBeVisible()
    await page.getByRole('combobox').fill('dedeman')

    const listbox = page.locator(LISTBOX)
    await expect(listbox).toBeVisible({ timeout: 15000 })
    await expect(listbox.getByRole('option')).toHaveCount(4)
    await expect(page.getByText('DEDEMAN SRL')).toBeVisible()
    await expect(page.locator('a[href="/companies/2816464"]')).toBeVisible()

    await page.screenshot({ path: 'tmp/shots/mobile-results.png', fullPage: true })
  })
})
