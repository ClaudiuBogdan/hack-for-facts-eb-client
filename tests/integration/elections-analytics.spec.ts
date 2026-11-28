/**
 * Integration tests for the elections analysis page (`/alegeri/analize`). The page renders on the server from the
 * recorded answers (tests/fixtures/ssr-api; record with SSR_API_MODE=record): the local mandates of 2024 and the
 * events. The tests hold the page to its structure — the views, the sections, the address it answers — and to the
 * figures' rules: missing is never zero, a view not drawn yet lists its sections.
 */

import { test, expect } from '../utils/ssr-api/test'
import { waitForPageReady } from '../utils/test-helpers'
import type { Page } from '@playwright/test'

const ROUTE = '/alegeri/analize'

const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams)
const views = (page: Page) => page.getByRole('navigation', { name: 'Ce citești' })

test.describe('Elections analysis — the server render', () => {
  test('the bare page answers the Mandate view for the whole country', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await expect(page).toHaveTitle(/^Analiza alegerilor/u)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/alegeri\/analize$/u)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cine a obținut mandatele la alegerile locale din 2024, în toată țara')
    await expect(views(page).getByRole('button')).toHaveText(['Partide', 'Mandate', 'Hartă', 'Prezență', 'Curse'])
    await expect(views(page).getByRole('button', { name: 'Mandate' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('navigation', { name: 'Secțiunile vederii' }).getByRole('link')).toHaveText(['Primării', 'Pe alegeri', 'Consiliul județean', 'Județe', 'Consilieri locali'])
    await expect(page.getByRole('region', { name: 'Cifre-cheie' })).toContainText('Primari')
    await expect(page.locator('#mandate-primarii [role="img"]')).toHaveAttribute('aria-label', /^PSD /u)
    await expect(page.locator('#mandate-consiliu')).toContainText('Prima repartizare')
    await expect(page.locator('#mandate-consiliu')).toContainText('A doua repartizare')
  })

  test('an unreadable address opens the default question and keeps none of its values', async ({ page }) => {
    await page.goto(`${ROUTE}?tip=nimic&dupa=nimic&judet=XX`)
    await waitForPageReady(page)

    await expect(views(page).getByRole('button', { name: 'Mandate' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('în toată țara')
    // Nothing readable was asked: it is the bare page, under its canonical address.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/alegeri\/analize$/u)
    expect(params(page)).not.toMatchObject({ tip: 'nimic' })
    expect(params(page)).not.toMatchObject({ judet: 'XX' })
  })

  test('a reader’s own question is answered and kept out of the index', async ({ page }) => {
    await page.goto(`${ROUTE}?dupa=judete`)
    await waitForPageReady(page)

    // The address names a section: the page opens on it.
    await expect(page.locator('#mandate-judete h2')).toBeInViewport()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  })

  test('București is missing from the figures, said as missing and never as zero', async ({ page }) => {
    await page.goto(`${ROUTE}?judet=B`)
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { level: 1 })).toContainText('în București')
    await expect(page.locator('#mandate-primarii')).toContainText('Nu e încă în date.')
    await expect(page.locator('#mandate-consiliu')).toContainText('Consiliul General al Municipiului București')
    await expect(page.getByText('București: mandatele nu sunt încă în date.')).toBeVisible()
  })

  test('another view lists all its sections, each saying what it will draw', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await views(page).getByRole('button', { name: 'Hartă' }).click()
    await expect(page).toHaveURL(/tip=harta/u)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unde e puternic fiecare partid')
    await expect(page.getByRole('navigation', { name: 'Secțiunile vederii' }).getByRole('link')).toHaveCount(6)
    await expect(page.getByText('În curând')).toHaveCount(4)
    await expect(page.getByText('Încă nu e în date')).toHaveCount(2)
    await expect(page.getByRole('region', { name: 'Cifre-cheie' })).toHaveCount(0)
  })
})
