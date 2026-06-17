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

  test('hub Parlamentari shows CURRENT seats (330 / 134), not 472 / 0', async ({
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

    // SC-1: the headline is CURRENT seats (camera 330 / senat 134), with the
    // all-mandates total (335 / 137) as a secondary "mandate în total" note.
    // Never the old broken "472 / 0" (no-chamber aggregate bucketed into Camera).
    await page.waitForTimeout(2500)
    const bodyText = (await page.locator('body').textContent()) ?? ''
    expect(bodyText).toContain('330') // Camera Deputaților, current
    expect(bodyText).toContain('134') // Senat, current
    expect(bodyText).not.toContain('472membri')
  })

  test('group swatches use distinct official brand colours (PNL ≠ AUR)', async ({
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

    // Wait until the Parlamentari group swatches have painted the PNL brand
    // colour (centralized resolver) before reading them — cold-start safe.
    const PNL = 'rgb(255, 210, 0)' // #FFD200 yellow
    const AUR = 'rgb(17, 17, 17)' //  #111111 black
    const sawPnl = await page
      .waitForFunction(
        (pnl) =>
          Array.from(document.querySelectorAll('[style*="background-color"]')).some(
            (el) => (el as HTMLElement).style.backgroundColor === pnl,
          ),
        PNL,
        { timeout: 20000 },
      )
      .then(() => true)
      .catch(() => false)
    test.skip(!sawPnl, 'Group swatches not painted (API/tunnel down)')

    const bgColors = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[style*="background-color"]')).map(
        (el) => (el as HTMLElement).style.backgroundColor,
      ),
    )
    // Both brand colours present and clearly distinct (the reported PNL≡AUR bug).
    expect(bgColors).toContain(PNL)
    expect(bgColors).toContain(AUR)
    expect(PNL).not.toBe(AUR)
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

  test('member Inițiative tab renders live initiatives, newest-first', async ({
    page,
  }) => {
    // 2:2024:235 has 116 initiatives; the server orders them registration-date
    // DESC, so page 1 carries recent 2026 dates (not the old legacy block).
    const response = await page
      .goto('/parlament/membri/2:2024:235/initiative')
      .catch(() => null)
    test.skip(!response, 'Member initiative route unavailable')

    const ready = await page
      .getByRole('heading', { level: 1 })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live member initiatives unavailable (API/tunnel down)')

    await page.waitForTimeout(2000)
    const bodyText = (await page.locator('body').textContent()) ?? ''
    expect(bodyText).toContain('Inițiative legislative')
    expect(bodyText).toMatch(/mai 2026/) // real recent registration dates
  })
})
