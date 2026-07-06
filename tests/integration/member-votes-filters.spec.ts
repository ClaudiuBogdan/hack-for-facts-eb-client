/**
 * Integration tests for the member voting-history tab — the vote-activity
 * heatmap + advanced filters + URL state.
 *
 * Route: /parlament/membri/$memberId/voturi
 * GraphQL is mocked (fixtures under tests/fixtures/member-votes-flow/). The
 * member shell fires `ParliamentMember`; the tab fires `ParliamentMemberVoteActivity`
 * (heatmap) + `ParliamentMemberVotes` (list). Filtered variants are keyed by the
 * exact `filter` variable; the unfiltered fallback is registered last.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const ROUTE = '/parlament/membri/1%3A2024%3A1/voturi?an=2026'
const DAY_CELL = 'button[aria-label*="20 martie 2026"]'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('ParliamentMember', 'member')

  // Heatmap aggregate — impotriva-filtered variant first, unfiltered last.
  await mockApi.mockGraphQL('ParliamentMemberVoteActivity', 'activity-impotriva', {
    variables: { filter: { choice: { in: ['impotriva'] } } },
  })
  await mockApi.mockGraphQL('ParliamentMemberVoteActivity', 'activity')

  // Votes list — most-specific filters first, unfiltered fallback last.
  await mockApi.mockGraphQL('ParliamentMemberVotes', 'votes-day', {
    variables: { filter: { voteDate: { gte: '2026-03-20', lte: '2026-03-20' } } },
  })
  await mockApi.mockGraphQL('ParliamentMemberVotes', 'votes-impotriva', {
    variables: { filter: { choice: { in: ['impotriva'] } } },
  })
  await mockApi.mockGraphQL('ParliamentMemberVotes', 'votes')
}

test.describe('Member votes — heatmap + filters', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('renders active-day heatmap cells and the unfiltered count line', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    const cells = page.locator('button[aria-label*="voturi"]')
    await expect(cells.first()).toBeVisible({ timeout: 15000 })
    expect(await cells.count()).toBe(3)
    await expect(page.getByText(/din 1110 voturi/)).toBeVisible({ timeout: 15000 })
  })

  test('clicking a day sets from/to in the URL and narrows the list', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.locator(DAY_CELL).first()).toBeVisible({ timeout: 15000 })

    await page.locator(DAY_CELL).first().click()

    await expect
      .poll(() => {
        const params = new URL(page.url()).searchParams
        return `${params.get('from')}|${params.get('to')}`
      })
      .toBe('2026-03-20|2026-03-20')
    await expect(page.getByText(/din 280 voturi/)).toBeVisible({ timeout: 15000 })
  })

  test('opening the sheet and picking Împotrivă filters the URL + list', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText(/din 1110 voturi/)).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /Filtre/ }).first().click()
    await page.getByRole('button', { name: 'Împotrivă' }).click()

    await expect
      .poll(() => new URL(page.url()).searchParams.get('choice'))
      .toContain('impotriva')
    await expect(page.getByText(/din 240 voturi/)).toBeVisible({ timeout: 15000 })
  })

  test('a chip removes its filter and restores the unfiltered list', async ({
    page,
  }) => {
    await page.goto(`${ROUTE}&choice=impotriva`)
    await waitForPageReady(page)
    await expect(page.getByText(/din 240 voturi/)).toBeVisible({ timeout: 15000 })

    // The "Vot: Împotrivă" chip carries a remove button.
    await page
      .getByRole('button', { name: /Elimină filtrul Vot: Împotrivă/ })
      .click()

    await expect
      .poll(() => new URL(page.url()).searchParams.has('choice'))
      .toBe(false)
    await expect(page.getByText(/din 1110 voturi/)).toBeVisible({ timeout: 15000 })
  })

  test('deep-link ?choice=impotriva pre-applies the filter', async ({ page }) => {
    await page.goto(`${ROUTE}&choice=impotriva`)
    await waitForPageReady(page)

    await expect(page.getByText(/din 240 voturi/)).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: 'tmp/shots/member-votes-deeplink.png', fullPage: true })
  })
})
