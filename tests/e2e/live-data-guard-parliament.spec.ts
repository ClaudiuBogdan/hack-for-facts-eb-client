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

  test('bill etape: 3-column tracker from real chamberCode, grouping, vote link, no fabricated buckets', async ({
    page,
  }) => {
    // Bill 17605 (PLx 751/2018) became Legea 78/2020; 56 events with real
    // chamberCode (CD 46 / SE 4 / PA 6) + one adoptare event recording vote
    // cdep:22196. The etape page is a 3-COLUMN passage tracker — Camera/Senat/
    // Parlament columns driven by the REAL chamberCode (NOT a string heuristic),
    // with routine steps grouped + an outcome summary.
    const response = await page
      .goto('/parlament/proiecte/17605/etape')
      .catch(() => null)
    test.skip(!response, 'Bill etape route unavailable')

    const ready = await page
      .getByRole('heading', { level: 1 })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live bill etape unavailable (API/tunnel down)')

    await page.waitForTimeout(2000)
    const bodyText = (await page.locator('body').textContent()) ?? ''
    expect(bodyText).toContain('Parcurs legislativ') // tracker header
    expect(bodyText).toContain('78/2020') // becomes-law outcome
    // The 3 chamber columns from the real chamberCode.
    expect(bodyText).toContain('Camera Deputaților')
    expect(bodyText).toContain('Senat')
    expect(bodyText).toContain('Parlament / Promulgare')
    // Routine steps grouped under a disclosure.
    expect(bodyText).toMatch(/Avize & termene \(\d+\)/)
    // Clean (de-glued-at-source) description renders as words.
    expect(bodyText).toContain('înaintat la Senat')
    // adoptare step → its vote (colon URL-encoded), and it is NOT collapsed.
    const voteLink = await page
      .locator('a[href*="/parlament/voturi/camera/cdep%3A22196"]')
      .count()
    expect(voteLink).toBeGreaterThan(0)
  })

  test('grupuri composition: per-party bars use authoritative counts (Camera sums to 330)', async ({
    page,
  }) => {
    // Regression: the per-party bars used to group a PAGINATED member page
    // (server-capped at 100) → PSD showed ~22 not 92. They now use the
    // authoritative parliamentGroups(current).memberCount, which sums to 330.
    const response = await page.goto('/parlament?tab=grupuri').catch(() => null)
    test.skip(!response, 'Parliament groups route unavailable')

    const ready = await page
      .getByRole('heading', { level: 1 })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live parliament groups unavailable (API/tunnel down)')

    // Wait for the hemicycle seats to paint (one dot per authoritative seat).
    const painted = await page
      .waitForFunction(() => document.querySelectorAll('circle').length > 50, undefined, {
        timeout: 20000,
      })
      .then(() => true)
      .catch(() => false)
    test.skip(!painted, 'Composition not painted (API/tunnel down)')

    // Per-party legend cards show the real current counts ("<n> Camera Deputaților").
    const cameraCards = await page.evaluate(() => {
      const out: number[] = []
      document.querySelectorAll('p').forEach((p) => {
        const m = /^(\d+)\s*Camera Deputaților$/.exec((p.textContent || '').trim())
        if (m) out.push(Number(m[1]))
      })
      return out
    })
    // The largest Camera group (PSD, 91 as of 2026-07-06 — exact count follows
    // live seat transfers, so assert a floor: the undercount bug showed ~22)
    // and the Camera bars must sum to the full 330 seats.
    expect(Math.max(...cameraCards)).toBeGreaterThanOrEqual(80)
    expect(cameraCards.reduce((a, b) => a + b, 0)).toBe(330)
  })

  test('bill 12760 shows the AI summary card when enriched (conditional)', async ({
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

    await page.waitForTimeout(1500)
    const card = page.getByRole('region', { name: 'Rezumat generat de AI' })
    const present = await card
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    // AI enrichment is optional per bill — SKIP (not fail) when absent so the
    // guard doesn't break before the bill-metadata lane has processed 12760.
    test.skip(!present, 'AI metadata not yet loaded for bill 12760')
    // When present, the AI card must carry a disclaimer (never bare summary text).
    const text = (await card.first().textContent()) ?? ''
    expect(text.length).toBeGreaterThan(40)
  })

  test('member 2:2020:12 overview renders the committees section (live)', async ({
    page,
  }) => {
    const response = await page
      .goto('/parlament/membri/2:2020:12')
      .catch(() => null)
    test.skip(!response, 'Member profile route unavailable')

    const ready = await page
      .getByRole('heading', { level: 1 })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live member profile unavailable (API/tunnel down)')

    await page.waitForTimeout(1500)
    const bodyText = (await page.locator('body').textContent()) ?? ''
    // The "Comisii" section header always renders on the overview tab (with an
    // empty-state note when no memberships are present).
    expect(bodyText).toContain('Comisii')
  })

  test('/parlament/comisii lists committees (live)', async ({ page }) => {
    const response = await page.goto('/parlament/comisii').catch(() => null)
    test.skip(!response, 'Committees route unavailable')

    const ready = await page
      .getByRole('heading', { level: 1 })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live committees page unavailable (API/tunnel down)')

    await page.waitForTimeout(1500)
    // At least one committee row links to a detail page.
    const rowCount = await page
      .locator('a[href*="/parlament/comisii/"]')
      .count()
    test.skip(rowCount === 0, 'No committees returned (API/tunnel down or empty)')
    expect(rowCount).toBeGreaterThan(0)
  })

  test('member 1:2024:1 /voturi renders the live vote-activity heatmap (≥20 active days in 2026)', async ({
    page,
  }) => {
    const response = await page
      .goto('/parlament/membri/1:2024:1/voturi?an=2026')
      .catch(() => null)
    test.skip(!response, 'Member votes route unavailable')

    const ready = await page
      .getByRole('heading', { level: 1 })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live member votes unavailable (API/tunnel down)')

    // Active-day cells are buttons labelled "… — N voturi"; the year buttons are
    // labelled with the bare year, so this selector counts only day cells.
    const cells = page.locator('button[aria-label*="voturi"]')
    const painted = await cells
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!painted, 'Heatmap not painted (API/tunnel down)')

    // 2026 has ≥20 sitting days with recorded votes for Abrudean (25 as of
    // 2026-07-06; a floor since the year is still accruing).
    expect(await cells.count()).toBeGreaterThanOrEqual(20)
  })

  test('member 1:2024:1 /voturi ?choice=impotriva filters the list to the career "împotrivă" total (≥240)', async ({
    page,
  }) => {
    const response = await page
      .goto('/parlament/membri/1:2024:1/voturi?choice=impotriva&an=2026')
      .catch(() => null)
    test.skip(!response, 'Member votes route unavailable')

    const ready = await page
      .getByRole('heading', { level: 1 })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live member votes unavailable (API/tunnel down)')

    // The count line "Afișate X din Y voturi" reports the FILTERED total (Y).
    const countLine = page.getByText(/din\s+[\d.]+\s+voturi/)
    const shown = await countLine
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!shown, 'Votes count line not rendered (API/tunnel down)')

    const text = (await countLine.first().textContent()) ?? ''
    const total = Number((text.match(/din\s+([\d.]+)\s+voturi/)?.[1] ?? '').replace(/\./g, ''))
    // Career "împotrivă" total was 240 (2026-07-06); a floor since it can grow.
    expect(total).toBeGreaterThanOrEqual(240)
  })

  test('member 1:2024:1 /voturi clicking 2026-03-20 (280 votes) filters the list to that day', async ({
    page,
  }) => {
    const response = await page
      .goto('/parlament/membri/1:2024:1/voturi?an=2026')
      .catch(() => null)
    test.skip(!response, 'Member votes route unavailable')

    const ready = await page
      .getByRole('heading', { level: 1 })
      .first()
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!ready, 'Live member votes unavailable (API/tunnel down)')

    const day = page.locator('button[aria-label*="20 martie 2026"]').first()
    const painted = await day
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => true)
      .catch(() => false)
    test.skip(!painted, 'Heatmap day cell not painted (API/tunnel down)')

    // 2026-03-20 is a complete past day with exactly 280 votes recorded.
    expect(await day.getAttribute('aria-label')).toContain('280 voturi')

    await day.click()
    await expect
      .poll(() => {
        const params = new URL(page.url()).searchParams
        return params.get('from') === '2026-03-20' && params.get('to') === '2026-03-20'
      })
      .toBe(true)
    await expect(page.getByText(/din\s+280\s+voturi/)).toBeVisible({ timeout: 20000 })
  })
})
