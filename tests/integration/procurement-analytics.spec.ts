/**
 * Integration tests for the procurement analytics page (`/procurement/analytics`)
 * and the addresses that lead to it: the explorer's old `/procurement/search`,
 * an old `/procurement` link carrying an explorer choice, the first release's
 * `/achizitii/cautare` — each asks its question again in the page's words.
 * The page's controls write the address: a question is a link.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { Page } from '@playwright/test'

const ROUTE = '/procurement/analytics'

/** The address's params, as the page wrote them. */
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams)
const pathname = (page: Page) => new URL(page.url()).pathname
/** The explorer's own default when a link named no period: the previous calendar year. */
const LAST_YEAR = String(new Date().getFullYear() - 1)

test.describe('Procurement analytics — addresses and controls', () => {
  test('an old explorer list lands on the same records', async ({ page }) => {
    await page.goto('/procurement/search?view=list&grain=direct_acquisitions&authority_cui=4305857&sort=date_desc&page=2')
    await waitForPageReady(page)

    await expect.poll(() => pathname(page)).toBe(ROUTE)
    expect(params(page)).toEqual({ cumparator: '4305857', perioada: LAST_YEAR, dupa: 'inregistrari' })
  })

  test('an old /procurement link carrying an explorer choice asks the analytics page', async ({ page }) => {
    await page.goto('/procurement?view=list&q=spital')
    await waitForPageReady(page)

    await expect.poll(() => pathname(page)).toBe(ROUTE)
    expect(params(page)).toEqual({ tip: 'contracte', perioada: LAST_YEAR, titlu: 'spital' })
    // The title's words are said in the headline.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('spital')
  })

  test('/procurement is still the front door', async ({ page }) => {
    await page.goto('/procurement')
    await waitForPageReady(page)
    expect(pathname(page)).toBe('/procurement')
  })

  test('a population in the bar writes its own address', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await page.getByRole('navigation', { name: 'Ce înregistrări' }).getByRole('button', { name: /Contracte atribuite/ }).click()
    await expect.poll(() => params(page).tip).toBe('contracte')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Contractele atribuite')
  })

  test('a filter’s ✕ in the headline drops it from the address', async ({ page }) => {
    await page.goto(`${ROUTE}?titlu=laptop`)
    await waitForPageReady(page)

    await page.getByRole('button', { name: /Scoate „.*laptop/ }).first().click()
    await expect.poll(() => params(page).titlu).toBeUndefined()
  })

  test('the filters sheet picks a place from its region down, and a step of its path widens it', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await page.getByRole('button', { name: /^Filtre/ }).first().click()
    const sheet = page.getByRole('dialog')
    await sheet.getByRole('combobox', { name: 'Caută locul instituției' }).click()
    await sheet.getByRole('option', { name: 'Centru', exact: true }).click()
    await expect.poll(() => params(page).regiune).toBe('Centru')
    await sheet.getByRole('option', { name: 'Sibiu', exact: true }).click()
    await expect.poll(() => params(page).judet).toBe('SB')
    // The county's largest localities, from the map's file.
    await sheet.getByRole('option', { name: /^Sibiu/ }).first().click()
    await expect.poll(() => params(page).localitate).toBe('143450')
    await expect(sheet.getByText('Municipiul Sibiu', { exact: true })).toBeVisible()

    await sheet.getByRole('button', { name: 'Jud. Sibiu', exact: true }).click()
    await expect.poll(() => params(page).judet).toBe('SB')
    expect(params(page).localitate).toBeUndefined()
  })

  test('the filters sheet’s place search takes the keys', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    await page.getByRole('button', { name: /^Filtre/ }).first().click()
    const sheet = page.getByRole('dialog')
    const field = sheet.getByRole('combobox', { name: 'Caută locul firmei' })
    await field.click()
    await field.pressSequentially('cluj napoca')
    await expect(sheet.getByRole('option', { name: /^Cluj-Napoca/ })).toBeVisible()
    // Escape closes the list, not the sheet.
    await field.press('Escape')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('option', { name: /^Cluj-Napoca/ })).toHaveCount(0)

    await field.click()
    await field.pressSequentially('cluj napoca')
    await field.press('ArrowDown')
    await expect(field).toHaveAttribute('aria-activedescendant', /option-0$/)
    await field.press('Enter')
    await expect.poll(() => params(page).localitate_firma).toBe('54975')
    // The field gave way to the chip: the focus goes to its ✕, not to the top of the sheet.
    await expect(sheet.getByRole('button', { name: 'Scoate Municipiul Cluj-Napoca' })).toBeFocused()
  })
})
