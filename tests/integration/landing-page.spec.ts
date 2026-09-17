/**
 * Landing Page Integration Tests
 *
 * Tests the landing page functionality including:
 * - Hero heading and entity search
 * - "Începe de aici" entity panel
 * - Shortcuts and the grouped surface index
 * - Footer navigation
 */

import { test, expect } from '../utils/integration-base'
import { waitForHydration } from '../utils/test-helpers'

const HERO_HEADING = /decizii informate|informed decisions/i
const SEARCH_NAME = /entit|cui/i

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.mockGraphQL('SearchEntities', 'shared/search-cluj')
    await page.goto('/')
    await expect(page.getByRole('heading', { name: HERO_HEADING, level: 1 })).toBeVisible({
      timeout: 10000,
    })
    // The page is server-rendered; the search only answers once hydrated.
    await waitForHydration(page)
  })

  test('displays hero heading and entity search', async ({ page }) => {
    await expect(page.getByRole('heading', { name: HERO_HEADING, level: 1 })).toBeVisible()
    await expect(page.getByRole('combobox', { name: SEARCH_NAME })).toBeVisible({ timeout: 5000 })
  })

  test('displays the entity panel with predefined entities', async ({ page }) => {
    const sibiu = page.getByRole('link', { name: /Mun\. Sibiu/ })
    await expect(sibiu).toBeVisible({ timeout: 5000 })
    await expect(sibiu).toHaveAttribute('href', /\/entities\/4270740/)

    await expect(page.getByRole('link', { name: /Mun\. București/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Mun\. Cluj-Napoca/ })).toBeVisible()
  })

  test('displays the shortcuts to the heaviest surfaces', async ({ page }) => {
    const shortcuts = page.getByRole('navigation', { name: /scurtături|shortcuts/i })
    await expect(shortcuts).toBeVisible({ timeout: 5000 })

    const links = shortcuts.getByRole('link')
    await expect(links).toHaveCount(3)
    await expect(links.nth(0)).toHaveAttribute('href', '/procurement')
    await expect(links.nth(1)).toHaveAttribute('href', '/budget-explorer')
    await expect(links.nth(2)).toHaveAttribute('href', '/legislation')
  })

  test('displays the grouped index of surfaces', async ({ page }) => {
    const groups: ReadonlyArray<readonly [RegExp, readonly string[]]> = [
      [/banii publici|public money/i, ['/budget-explorer', '/procurement', '/investitii-publice', '/pnrr']],
      [/instituții și organizații|institutions and organi/i, ['/entity-analytics', '/companies', '/ong-uri']],
      [/lege și justiție|law and justice/i, ['/legislation', '/justitie']],
      [/^politică$|^politics$/i, ['/alegeri']],
      [/instrumente|tools/i, ['/map', '/charts', '/ins']],
    ]

    for (const [name, hrefs] of groups) {
      const region = page.getByRole('region', { name })
      await region.scrollIntoViewIfNeeded()
      await expect(region).toBeVisible({ timeout: 5000 })
      for (const href of hrefs) {
        await expect(region.locator(`a[href="${href}"]`)).toBeVisible()
      }
    }
  })

  test('keyword chips send the UAT filter before rendering results', async ({ page }) => {
    const searchInput = page.getByRole('combobox', { name: SEARCH_NAME })
    await searchInput.fill('primarii Cluj')
    const filteredRequest = page.waitForRequest(request => {
      if (request.method() !== 'POST' || !request.url().includes('graphql')) return false
      const body = request.postDataJSON() as { variables?: { q?: string; isUat?: boolean } }
      return body.variables?.q === 'Cluj' && body.variables.isUat === true
    })
    await page.getByRole('option', { name: /Primării/ }).click()
    await filteredRequest
    await expect(searchInput).toHaveValue('Cluj')
    const result = page.getByRole('option', { name: /MUNICIPIUL CLUJ-NAPOCA/i })
    await expect(result).toBeVisible()
    await expect(result).toHaveAttribute('href', /\/entities\/4305857/)
  })

  test('clicking a panel entity link navigates to entity page', async ({ page }) => {
    const entityLink = page.getByRole('link', { name: /Mun\. Cluj-Napoca/ })
    await expect(entityLink).toBeVisible({ timeout: 5000 })
    await entityLink.click()

    await page.waitForURL(/\/entities\/4305857/)
    expect(page.url()).toContain('/entities/4305857')
  })

  test('footer contains expected links', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const footerNav = page.getByRole('navigation', { name: /navigare footer|footer navigation/i })
    await expect(footerNav).toBeVisible({ timeout: 5000 })

    await expect(
      footerNav.getByRole('link', { name: /confidențialitate|privacy/i }),
    ).toHaveAttribute('href', '/privacy')
    await expect(footerNav.getByRole('link', { name: /termeni|terms/i })).toHaveAttribute(
      'href',
      '/terms',
    )
    await expect(
      footerNav.getByRole('link', { name: /politica de cookie|cookie policy/i }),
    ).toHaveAttribute('href', '/cookie-policy')
    await expect(
      footerNav.getByRole('link', { name: /setări cookie|cookie settings/i }),
    ).toHaveAttribute('href', /^\/cookies\?redirect=/)
    await expect(footerNav.getByRole('link', { name: /github/i })).toHaveAttribute(
      'href',
      /github\.com/,
    )
    await expect(
      footerNav.getByRole('link', { name: /stare sistem|system status/i }),
    ).toHaveAttribute('href', /status\.transparenta\.eu/)
  })

  test('header logo links to home', async ({ page }) => {
    const logo = page.getByRole('link', { name: /Transparenta\.eu/i }).first()
    await expect(logo).toHaveAttribute('href', '/')
  })
})
