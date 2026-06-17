import { test, expect } from '@playwright/test'

/**
 * Live-data guard (parliament). Fails when the app serves mock parliament
 * fixtures instead of the live redesign GraphQL API (e.g. when the dev server
 * was started with VITE_USE_MOCK_DATA=true). Modeled on the companies guard.
 *
 * Discriminators (verified vs prod 2026-06-17):
 *   - Mock members are synthetic (`dep-001` "Ana Nord", "Mihai Est", …). The
 *     live member `1:2024:1` is "Mircea Abrudean" (PNL, Senate, CLUJ); that
 *     mandateKey does not exist in the fixtures, so a member page that renders
 *     "Abrudean" proves live data.
 *   - The golden bill 12760 became Legea 423/2023 (final adoption vote
 *     cdep:29892, 275/277). The bill page renders the 423/2023 law reference.
 *
 * If a page cannot load at all (API/tunnel down) we SKIP — the guard catches
 * "served mock instead of live", not "API offline".
 */

const MOCK_MEMBER_NAMES = [
  'Ana Nord',
  'Mihai Est',
  'Irina Vest',
  'Vlad Sud',
  'Elena Munte',
]

test.describe('Live-data guard (parliament)', () => {
  test('golden member 1:2024:1 renders live data, not mock fixtures', async ({
    page,
  }) => {
    const response = await page
      .goto('/parlament/membri/1:2024:1')
      .catch(() => null)
    test.skip(!response, 'Member profile route unavailable')

    const heading = page.getByRole('heading', { level: 1 }).first()
    const ready = await heading
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live member profile unavailable (API/tunnel down)')

    const bodyText = (await page.locator('body').textContent()) ?? ''

    for (const mockName of MOCK_MEMBER_NAMES) {
      expect(bodyText).not.toContain(mockName)
    }
    // The live member surname must be present.
    expect(bodyText).toContain('Abrudean')
  })

  test('parliament hub recent votes are live, not mock fixtures', async ({
    page,
  }) => {
    const response = await page.goto('/parlament').catch(() => null)
    test.skip(!response, 'Parliament hub route unavailable')

    const ready = await page
      .getByRole('heading', { level: 1 })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live parliament hub unavailable (API/tunnel down)')

    // Wait for the recent-votes section (driven by the live votes query) to fill.
    await page.waitForTimeout(1500)
    const bodyText = (await page.locator('body').textContent()) ?? ''

    // The hub's "recent votes" section renders mock-only synthetic titles when
    // on fixtures; their presence proves the app is serving mock data.
    const MOCK_ONLY_VOTE_TITLES = [
      'Proiect de Lege privind sănătatea publică',
      'Moțiune de cenzură împotriva Guvernului',
      'Proiect de Lege privind digitalizarea justiției',
    ]
    for (const title of MOCK_ONLY_VOTE_TITLES) {
      expect(bodyText).not.toContain(title)
    }
  })

  test('hub Parlamentari shows the real chamber split (335 / 137), not 472 / 0', async ({
    page,
  }) => {
    const response = await page.goto('/parlament').catch(() => null)
    test.skip(!response, 'Parliament hub route unavailable')

    const ready = await page
      .getByRole('heading', { level: 1 })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live parliament hub unavailable (API/tunnel down)')

    // The Parlamentari section renders the per-chamber totals. Before the
    // two-chamber group fetch, the no-chamber endpoint bucketed all 472 members
    // into Camera (472 / 0). Wait for the live group data, then assert both real
    // chamber totals are present and the broken "472 members" count is gone.
    await page.waitForTimeout(2500)
    const bodyText = (await page.locator('body').textContent()) ?? ''
    expect(bodyText).toContain('335') // Camera Deputaților
    expect(bodyText).toContain('137') // Senat
    expect(bodyText).not.toContain('472membri')
  })

  test('golden bill 12760 renders the live Legea 423/2023 reference', async ({
    page,
  }) => {
    const response = await page
      .goto('/parlament/proiecte/12760')
      .catch(() => null)
    test.skip(!response, 'Bill detail route unavailable')

    const ready = await page
      .getByRole('heading', { level: 1 })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live bill detail unavailable (API/tunnel down)')

    const bodyText = (await page.locator('body').textContent()) ?? ''
    // The live bill became Legea 423/2023; mock bills never carry this number.
    expect(bodyText).toContain('423/2023')
  })
})
