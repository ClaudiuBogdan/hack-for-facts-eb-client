/**
 * Integration tests for one procedure's page (`/procurement/procedures/$id`,
 * `docs/design/procurement/design.md` §22): the first release's address leads
 * to it, the server renders the record, a legacy notice's contracts of other
 * institutions are set apart, and a notice SEAP does not have is a 404.
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

  test('a legacy call keeps other institutions’ contracts apart', async ({ page }) => {
    await page.goto('/procurement/procedures/35106757')
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anunțul de participare nr. 92137')
    await expect(page.getByRole('heading', { name: 'Contracte legate greșit de acest anunț' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Ce s-a cerut' })).toBeVisible()
  })

  test('a notice SEAP does not have is a 404', async ({ page }) => {
    const response = await page.goto('/procurement/procedures/999999999999')
    expect(response?.status()).toBe(404)
  })
})
