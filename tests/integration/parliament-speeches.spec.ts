/**
 * Integration tests for the GLOBAL stenograme page — heatmap + side filters +
 * debounced search with the honest depth notice + the speech detail route.
 *
 * Route: /parlament/stenograme (list), /parlament/stenograme/$speechKey (detail)
 * GraphQL is mocked (fixtures under tests/fixtures/parliament-speeches-flow/).
 * The page fires `ParliamentSpeechActivity` (heatmap) + `ParliamentSpeeches`
 * (list); the speaker combobox fires `ParliamentMembers`; the speaker chip
 * resolves via `ParliamentMember`; the detail route fires `ParliamentSpeech`.
 * Filtered variants are keyed by exact `filter`/`q` variables, most specific
 * first; unfiltered fallbacks are registered last.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const ROUTE = '/parlament/stenograme?an=2026&view=interventii'
const DAY_CELL = 'button[aria-label*="20 martie 2026"]:visible'
const SPEAKER = '1:2024:79'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  // Heatmap aggregate — q variant first, default last.
  await mockApi.mockGraphQL('ParliamentSpeechActivity', 'activity-q', {
    variables: { q: 'buget' },
  })
  await mockApi.mockGraphQL('ParliamentSpeechActivity', 'activity')

  // Global list — most-specific variants first, year-window default last.
  await mockApi.mockGraphQL('ParliamentSpeeches', 'speeches-speaker-q', {
    variables: { filter: { mandateKey: { eq: SPEAKER } }, q: 'buget' },
  })
  await mockApi.mockGraphQL('ParliamentSpeeches', 'speeches-day', {
    variables: { filter: { spokenAt: { gte: '2026-03-20', lte: '2026-03-20' } } },
  })
  await mockApi.mockGraphQL('ParliamentSpeeches', 'speeches-q', {
    variables: { q: 'buget' },
  })
  await mockApi.mockGraphQL('ParliamentSpeeches', 'speeches')

  // Detail route + speaker lookup surfaces.
  await mockApi.mockGraphQL('ParliamentSpeech', 'speech-detail')
  await mockApi.mockGraphQL('ParliamentMembers', 'members')
  await mockApi.mockGraphQL('ParliamentMember', 'member')
}

test.describe('Global stenograme — heatmap + filters + honest search', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('renders the heatmap, the Stenograme tab and the capped count line', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    const cells = page.locator('button[aria-label*="intervenți"]:visible')
    await expect(cells.first()).toBeVisible({ timeout: 15000 })
    expect(await cells.count()).toBe(3)
    await expect(page.getByText(/din 120 intervenții/)).toBeVisible({
      timeout: 15000,
    })
    // The dedicated page participates in the parliament tab nav.
    await expect(
      page.getByRole('navigation', { name: 'Secțiuni Parlament' }).getByText('Stenograme'),
    ).toBeVisible()
    // Every global card carries a speaker line.
    await expect(
      page.getByRole('link', { name: 'Luminiţa Păucean-Fernandes' }),
    ).toBeVisible()
    // Exact match: the transcript body repeats the name with a colon.
    await expect(
      page.getByText('Domnul Prim-Ministru', { exact: true }),
    ).toBeVisible()
  })

  test('clicking a day writes from/to (+ keeps an) and narrows the list', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.locator(DAY_CELL).first()).toBeVisible({ timeout: 15000 })

    await page.locator(DAY_CELL).first().click()

    await expect
      .poll(() => {
        const params = new URL(page.url()).searchParams
        return `${params.get('from')}|${params.get('to')}|${params.get('an')}`
      })
      .toBe('2026-03-20|2026-03-20|2026')
    await expect(page.getByText(/din 5 intervenții/)).toBeVisible({
      timeout: 15000,
    })
  })

  test('typing in the debounced search auto-applies and shows the honest TITLE_SUMMARY notice', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText(/din 120 intervenții/)).toBeVisible({
      timeout: 15000,
    })

    await page.locator('#parliament-stenograme-q').fill('buget')

    // No submit button: the URL updates after the 300ms debounce.
    await expect
      .poll(() => new URL(page.url()).searchParams.get('q'))
      .toBe('buget')
    await expect(page.getByText('Conține: buget')).toBeVisible({ timeout: 15000 })
    // Unbounded (year-wide) search → titles+summaries only, said plainly.
    await expect(page.getByRole('note')).toContainText(
      'titlurilor și rezumatelor',
      { timeout: 15000 },
    )
    await expect(page.getByText(/din 7 intervenții/)).toBeVisible({
      timeout: 15000,
    })
    await page.screenshot({
      path: 'tmp/shots/parliament-stenograme-list.png',
      fullPage: true,
    })
  })

  test('a speaker-bounded search flips the notice to FULL_TEXT and resolves the chip', async ({
    page,
  }) => {
    await page.goto(`${ROUTE}&vorbitor=${encodeURIComponent(SPEAKER)}&q=buget`)
    await waitForPageReady(page)

    await expect(page.getByRole('note')).toContainText('transcrierea completă', {
      timeout: 15000,
    })
    await expect(page.getByText(/Vorbitor:/)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/din 3 intervenții/)).toBeVisible({
      timeout: 15000,
    })
  })

  test('picking a speaker in the combobox commits vorbitor to the URL', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText(/din 120 intervenții/)).toBeVisible({
      timeout: 15000,
    })

    await page.getByRole('button', { name: /Filtre/ }).click()
    await page.locator('#speeches-speaker').fill('Pau')
    // mapMember renders "firstName lastName" order.
    await page
      .getByRole('button', { name: /Luminiţa Păucean-Fernandes/ })
      .click()

    await expect
      .poll(() => new URL(page.url()).searchParams.get('vorbitor'))
      .toBe(SPEAKER)
  })

  test('the card date links to the shareable speech detail page', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText(/din 120 intervenții/)).toBeVisible({
      timeout: 15000,
    })

    await page.getByRole('link', { name: '13 mai 2026' }).click()

    await expect(page).toHaveURL(/\/parlament\/stenograme\/cdep%3Aseg%3A1/)
    await expect(page.getByText('Transcrierea completă')).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByText(/Dezbatere despre bugetul educației naționale, pe larg\./),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Vezi în stenograma oficială/ }),
    ).toBeVisible()
    await page.screenshot({
      path: 'tmp/shots/parliament-speech-detail.png',
      fullPage: true,
    })
  })

  test('a direct deep-link to a colon-bearing speechKey resolves', async ({
    page,
  }) => {
    // Real keys are `cdep:<segment_key>` / `senat:<speech_key>` — the param must
    // survive URL encoding when the page is opened cold, not just via a Link.
    await page.goto(`/parlament/stenograme/${encodeURIComponent('cdep:seg:1')}`)
    await waitForPageReady(page)

    await expect(page.getByText('Transcrierea completă')).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByText(/Dezbatere despre bugetul educației naționale, pe larg\./),
    ).toBeVisible()
  })
})
