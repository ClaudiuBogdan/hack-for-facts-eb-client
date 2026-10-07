/**
 * Integration tests for the court portal's pages (`docs/design/justice/design.md`
 * §12–14) against the live API: the front door from its snapshot, a court and
 * a case rendered on the server, the 404s, and the mock-era addresses leading
 * to the front door.
 *
 * Only what the server renders is asserted: in CI the browser cannot read the
 * dev API (its CORS preflight answers 404), so a court's or a case's figures
 * stand as the server read them. The portal's capture is frozen, so these
 * records do not move; the meaning rules are tested on recorded answers in
 * `src/features/justice/**`.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'

test.describe('Justice pages', () => {
  test('the front door asks its question and names the busiest courts, each opening its page', async ({ page }) => {
    const response = await page.goto('/justice')
    await waitForPageReady(page)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Ce judecă\s*instanțele/u)
    await expect(page).toHaveTitle('Instanțele din România — Justiție — Transparenta.eu')
    const panel = page.getByRole('region', { name: /Cele mai încărcate instanțe/u })
    await expect(panel.getByRole('link').first()).toHaveAttribute('href', /^\/justice\/courts\/[A-Za-z0-9]+$/u)
    await expect(page.getByRole('heading', { name: 'Pe ce treaptă sunt dosarele' })).toBeVisible()
  })

  test('a court is rendered on the server with its matters, stages and the courts under it', async ({ page }) => {
    const response = await page.goto('/justice/courts/TribunalulSALAJ')
    await waitForPageReady(page)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tribunalul Sălaj')
    await expect(page).toHaveTitle('Tribunalul Sălaj — Justiție — Transparenta.eu')
    await expect(page.getByRole('heading', { name: 'Instanțele de sub ea' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Judecătoria Zalău/u })).toHaveAttribute('href', '/justice/courts/JudecatoriaZALAU')
  })

  test('a case is rendered on the server by its court and number, out of search engines, naming no party', async ({ page }) => {
    const response = await page.goto('/justice/cases/CurteadeApelCONSTANTA/5180/118/2021/a3')
    await waitForPageReady(page)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dosarul 5180/118/2021/a3')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    await expect(page.getByRole('heading', { name: 'Părțile' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Legea nr. 85/2014' })).toHaveAttribute('href', '/legislation/acts/56661')
  })

  test('an ÎCCJ case answers at once, named from its address, its record read in the browser', async ({ page }) => {
    const started = Date.now()
    const response = await page.goto('/justice/cases/InaltaCurtedeCasatiesiJustitie/656/1/2025', { waitUntil: 'commit' })
    expect(response?.status()).toBe(200)
    // The API takes 6–7 s for an ÎCCJ case: the server does not wait for it.
    expect(Date.now() - started).toBeLessThan(6000)
    expect(response?.headers()['cache-control']).toContain('no-store')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dosarul 656/1/2025')
  })

  test('the analysis answers its bare question on the server, the courts ranked with the year before', async ({ page }) => {
    const response = await page.goto('/justice/analytics')
    await waitForPageReady(page)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Dosarele,\s*pe instanțe/u)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/justice\/analytics$/u)
    await expect(page.getByRole('navigation', { name: 'Ce instanțe' })).toContainText('1.677.596')
    const first = page.locator('tbody tr').first()
    await expect(first).toContainText('Tribunalul București')
    await expect(first.locator('a')).toHaveAttribute('href', '/justice/courts/TribunalulBUCURESTI?an=2025')
  })

  test('a question in the analysis address is answered as asked, and not indexed', async ({ page }) => {
    const response = await page.goto('/justice/analytics?materie=faliment&dupa=judete')
    await waitForPageReady(page)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Dosarele de faliment,\s*pe județe/u)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    await expect(page.locator('tbody tr').first()).toContainText('București')
  })

  test('a court or a case the portal does not have is a 404', async ({ page }) => {
    expect((await page.goto('/justice/courts/TribunalulNIMIC'))?.status()).toBe(404)
    expect((await page.goto('/justice/cases/TribunalulSALAJ/1/1/1900'))?.status()).toBe(404)
  })

  test('the mock-era addresses lead to the front door', async ({ page }) => {
    for (const path of ['/justitie', '/justitie/cautare', '/justitie/dosare/portal-just-1']) {
      const response = await page.goto(path)
      expect(new URL(page.url()).pathname).toBe('/justice')
      expect(response?.status()).toBe(200)
    }
  })
})
