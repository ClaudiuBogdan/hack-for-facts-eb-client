/**
 * Integration tests for the member interventii tab — the speech-activity heatmap
 * + filters + free-text search + URL state.
 *
 * Route: /parlament/membri/$memberId/interventii
 * GraphQL is mocked (fixtures under tests/fixtures/member-speeches-filters-flow/).
 * The member shell fires `ParliamentMember`; the tab fires
 * `ParliamentMemberSpeechActivity` (heatmap) + `ParliamentMemberSpeeches` (list).
 * Filtered variants are keyed by the exact `filter`/`q` variable; the unfiltered
 * fallback is registered last.
 */

import { test, expect } from '../utils/integration-base'
import type { Page } from '@playwright/test'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const ROUTE = '/parlament/membri/1%3A2024%3A79/interventii?an=2026'
const DAY_CELL = 'button[aria-label*="20 martie 2026"]:visible'

async function openHeatmap(page: Page): Promise<void> {
  await page
    .locator('summary')
    .filter({ hasText: /Activitatea în plen pe zile/ })
    .click()
}

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('ParliamentMember', 'member')

  // Heatmap aggregate — filtered variants first, unfiltered last.
  await mockApi.mockGraphQL('ParliamentMemberSpeechActivity', 'activity-comun', {
    variables: { filter: { chamber: { eq: 'comun' } } },
  })
  await mockApi.mockGraphQL('ParliamentMemberSpeechActivity', 'activity-q', {
    variables: { q: 'buget' },
  })
  await mockApi.mockGraphQL('ParliamentMemberSpeechActivity', 'activity')

  // Speech list — most-specific filters first, unfiltered fallback last.
  await mockApi.mockGraphQL('ParliamentMemberSpeeches', 'speeches-day', {
    variables: { filter: { spokenAt: { gte: '2026-03-20', lte: '2026-03-20' } } },
  })
  await mockApi.mockGraphQL('ParliamentMemberSpeeches', 'speeches-comun', {
    variables: { filter: { chamber: { eq: 'comun' } } },
  })
  await mockApi.mockGraphQL('ParliamentMemberSpeeches', 'speeches-q', {
    variables: { q: 'buget' },
  })
  await mockApi.mockGraphQL('ParliamentMemberSpeeches', 'speeches')
}

test.describe('Member interventii — heatmap + filters + search', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('renders active-day heatmap cells and the unfiltered count line', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await openHeatmap(page)

    const cells = page.locator('button[aria-label*="intervenți"]:visible')
    await expect(cells.first()).toBeVisible({ timeout: 15000 })
    expect(await cells.count()).toBe(3)
    await expect(page.getByText(/din 83 intervenții/)).toBeVisible({ timeout: 15000 })
  })

  test('clicking a day writes from/to (+ keeps an) and narrows the list', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await openHeatmap(page)
    await expect(page.locator(DAY_CELL).first()).toBeVisible({ timeout: 15000 })

    await page.locator(DAY_CELL).first().click()

    await expect
      .poll(() => {
        const params = new URL(page.url()).searchParams
        return `${params.get('from')}|${params.get('to')}|${params.get('an')}`
      })
      .toBe('2026-03-20|2026-03-20|2026')
    await expect(page.getByText(/din 12 intervenții/)).toBeVisible({ timeout: 15000 })
  })

  test('a free-text query flows URL → list', async ({ page }) => {
    await page.goto(`${ROUTE}&q=buget`)
    await waitForPageReady(page)

    await expect(page.getByText(/din 4 intervenții/)).toBeVisible({ timeout: 15000 })
    // The active-filter chip echoes the query.
    await expect(page.getByText('Conține: buget')).toBeVisible({ timeout: 15000 })
  })

  test('expanding a card reveals the verbatim transcript', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText(/din 83 intervenții/)).toBeVisible({ timeout: 15000 })

    // The first card (a Senate lossy_root turn) carries a transcript. "Doamna
    // senator:" only appears in the verbatim fullText, not the summary snippet.
    const transcript = page.getByText(/Doamna senator:/)
    await expect(transcript).toBeHidden()
    await page.getByText('Transcriere completă').first().click()
    await expect(transcript).toBeVisible({ timeout: 15000 })
  })

  test('a Senate turn links honestly to the stenogram list, not a deep-link', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText(/din 83 intervenții/)).toBeVisible({ timeout: 15000 })

    await expect(
      page.getByRole('link', { name: /Stenogramele Senatului \(senat\.ro\)/ }),
    ).toBeVisible({ timeout: 15000 })
    await page.screenshot({
      path: 'tmp/shots/member-speeches-list.png',
      fullPage: true,
    })
  })
})
