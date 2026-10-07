/**
 * Integration tests for the experimental global entity-search page.
 *
 * Route: /experimental/search
 * Focus: the redesign `searchEntities` UI — results + type badges + deep-links,
 * facet chips, keyboard nav, and the empty / zero / error / degraded states,
 * on both desktop and mobile viewports. GraphQL is mocked (fixtures under
 * tests/fixtures/experimental-search-flow/, written from the server SDL and the
 * shared-search contract r4: every answer carries its company contribution,
 * generation, company scope and continuation; a refusal is a null root with
 * SERVICE_UNAVAILABLE).
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
  await mockApi.mockGraphQL(SEARCH_OP, 'refused', { variables: { q: 'retras' } })
  // First match wins: the next page is registered before the first.
  await mockApi.mockGraphQL(SEARCH_OP, 'withheld-next', { variables: { q: 'spital', offset: 20 } })
  await mockApi.mockGraphQL(SEARCH_OP, 'withheld-first', { variables: { q: 'spital', offset: 0 } })
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

    await expect(listbox.locator('a[href="/companies/2816464"]')).toHaveCount(1)
    // public_enterprise → internal /public-enterprises/$cui (by cuis[0]). Its
    // docKey is the namespaced `core:10020943:2019`, not a CUI, so this link
    // proves routing reads the dedicated cuis[] field, not docKey or the
    // contract's CUI-first identifiers[].
    await expect(
      listbox.locator('a[href="/public-enterprises/10020943"]'),
    ).toHaveCount(1)
    // The identity-collapsed palette keeps organizations on the CUI spine and
    // routes legal acts through the internal reader using the numeric act ID.
    await expect(listbox.locator('a[href="/entities/4278337"]')).toHaveCount(1)
    await expect(listbox.locator('a[href="/legislation/acts/1"]')).toHaveCount(1)
    await expect(listbox.locator('a[target="_blank"]')).toHaveCount(0)

    // titles render as plain text
    await expect(page.getByText('DEDEMAN SRL')).toBeVisible()
    // The company's activity is known false; the others are known true.
    await expect(listbox.getByText(/inactiv/i)).toHaveCount(1)
    await expect(listbox.getByText('activitate necunoscută')).toHaveCount(0)
    // The company's values come from its fresh company part, attributed.
    await expect(listbox.getByText(/denumire din ediția ONRC publicată/)).toHaveCount(1)
    // Palette hits map snippet = subtitle; render the line once.
    await expect(listbox.getByText('Municipiu · beneficiar PNRR')).toHaveCount(1)
    // A current answer says so, and its counts are labelled estimates.
    await expect(page.getByText(/Firme: la zi\./)).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toContainText('~312 candidați estimați în index')

    await page.screenshot({ path: 'tmp/shots/desktop-results.png', fullPage: true })
  })

  test('facet chips render with counts and toggle the URL', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await page.getByRole('combobox').fill('dedeman')
    await expect(page.locator(LISTBOX)).toBeVisible({ timeout: 15000 })

    const chips = page.locator('button[aria-pressed]')
    await expect(chips).toHaveCount(5)

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
    // A current initial page with no next page is the only real "no match".
    await expect(page.getByText(/niciun rezultat/i)).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: 'tmp/shots/desktop-zero.png', fullPage: true })
  })

  test('a refused answer is withheld with a retry, never a zero', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await page.getByRole('combobox').fill('retras')

    await expect(page.getByText('Răspunsul căutării a fost reținut.')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'Încearcă din nou' })).toBeVisible()
    await expect(page.getByText(/niciun rezultat/i)).toHaveCount(0)
    await expect(page.locator(`${LISTBOX} [role="option"]`)).toHaveCount(0)
  })

  test('an empty withheld page is no zero and pages on with its own next offset', async ({ page }) => {
    const offsets: unknown[] = []
    page.on('request', (request) => {
      const body = request.postData()
      if (!body?.includes(SEARCH_OP)) return
      const parsed = JSON.parse(body) as { variables?: { q?: string; offset?: unknown } }
      if (parsed.variables?.q === 'spital') offsets.push(parsed.variables.offset)
    })
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await page.getByRole('combobox').fill('spital')

    // Every CUI identity was withheld: nothing is shown, and nothing is claimed.
    await expect(
      page.getByText('Nu putem spune că nu există rezultate pentru "spital".'),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Firme: indisponibile\./)).toBeVisible()
    await expect(page.getByText(/niciun rezultat/i)).toHaveCount(0)
    // No count is shown for a non-current answer.
    await expect(page.getByText(/~\d/)).toHaveCount(0)

    await page.getByRole('button', { name: 'Încarcă mai mult' }).click()
    const listbox = page.locator(LISTBOX)
    await expect(listbox.getByRole('option')).toHaveCount(1, { timeout: 15000 })
    await expect(listbox.locator('a[href="/legislation/acts/95"]')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Încarcă mai mult' })).toHaveCount(0)
    // The server's offset, exactly: never hits.length arithmetic.
    expect(offsets).toEqual([0, 20])
  })

  test('error state surfaces an alert', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await page.getByRole('combobox').fill('boom')

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20000 })
    await page.screenshot({ path: 'tmp/shots/desktop-error.png', fullPage: true })
  })

  test('degraded engine shows a hint and claims no zero', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await page.getByRole('combobox').fill('fallback')

    // Under the contract a degraded answer is UNAVAILABLE and serves no hit:
    // the engine did not look, so the page says so instead of "no results".
    await expect(page.getByText('Căutare limitată')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Căutarea este momentan limitată.')).toBeVisible()
    await expect(page.locator(`${LISTBOX} [role="option"]`)).toHaveCount(0)
    await expect(page.getByText(/niciun rezultat/i)).toHaveCount(0)
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
