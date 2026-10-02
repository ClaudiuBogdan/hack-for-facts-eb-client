/**
 * Integration tests for one procedure's page (`/procurement/procedures/$id`,
 * `docs/design/procurement/design.md` §22) against the live API: the first
 * release's address leads to it, the server renders the record, an untitled
 * legacy notice is named by its number with what it asked and its source, and
 * a notice SEAP does not have is a 404.
 *
 * Live rows change: which contracts SEAP joins to a legacy notice is the
 * data's, not the page's. The guard that sets other institutions' contracts
 * apart and counts none of them is tested on a fixed record (`legacyRaw`) in
 * `src/features/procurement/lib/procedure-model.test.ts` and
 * `src/features/procurement/components/procedure/procurement-procedure-page.test.tsx`.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'

test.describe('Procurement procedure page', () => {
  test('the first release’s address leads to the procedure, rendered on the server', async ({ page }) => {
    const response = await page.goto('/achizitii/proceduri/337399')
    await waitForPageReady(page)

    expect(new URL(page.url()).pathname).toBe('/procurement/procedures/337399')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/autostrada/iu)
    // CNIR's association: four firms on one contract, said once.
    await expect(page.getByText(/în asociere/u).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ce s-a atribuit' })).toBeVisible()
    await expect(page).toHaveTitle(/Achiziții publice — Transparenta\.eu$/u)
  })

  test('an untitled legacy call is named by its number, with what it asked and its source', async ({ page }) => {
    const response = await page.goto('/procurement/procedures/35106757')
    await waitForPageReady(page)

    expect(response?.status()).toBe(200)
    // Its identity: SEAP gives it no title, so the notice's number names it, and its buyer and year.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anunțul de participare nr. 92137')
    await expect(page.getByText('SEAP nu dă acestui anunț un titlu.', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /Nuclearelectrica/iu }).first()).toHaveAttribute('href', '/procurement/institutions/10874881?year=2009')
    // What it asked: the call's own estimate and day.
    const asked = page.getByRole('region', { name: 'Ce s-a cerut' })
    await expect(asked.getByRole('heading', { name: 'Ce s-a cerut' })).toBeVisible()
    await expect(asked.getByText('183.967,29 lei', { exact: true })).toBeVisible()
    await expect(asked.getByText('10 decembrie 2009').first()).toBeVisible()
    // Its source: the 2009 export row on data.gov.ro.
    await expect(asked.getByText(/anunturi-participare-2009\.xls/u)).toBeVisible()
    await expect(asked.getByRole('link', { name: /data\.gov\.ro/u })).toHaveAttribute('href', /anunturi-participare-2009\.xls$/u)
  })

  test('a notice SEAP does not have is a 404', async ({ page }) => {
    const response = await page.goto('/procurement/procedures/999999999999')
    expect(response?.status()).toBe(404)
  })
})
