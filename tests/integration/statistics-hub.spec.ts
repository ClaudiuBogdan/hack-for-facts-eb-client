/**
 * Integration tests for the `/statistici` hub — the matrix search hero with
 * the theme panel, the figures band, the national rows, the county map with
 * its indicator switch, the 35-year band and the sources strip.
 *
 * GraphQL is mocked (fixtures under tests/fixtures/statistics-hub-flow/).
 * The hub fires `InsLandingTiles`, `StatisticsLandingCatalog`,
 * `StatisticsHubTerritoryCount`, then one `InsObservations` per county layer;
 * the annual histories are in the client. Typing in the matrix search fires
 * `InsDatasetsExplorer`.
 *
 * The route loader reads the hub on the server, where `page.route` cannot
 * reach. The statistics CI job (and a local run) points `VITE_API_URL` at an
 * unreachable port, so the server read fails fast and the browser refetches
 * through these mocks. Against a server that can reach the API the numbers
 * below would be live values, not the fixtures.
 */

import { test, expect } from '../utils/integration-base'
import { waitForHydration } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('InsLandingTiles', 'tiles')
  await mockApi.mockGraphQL('StatisticsLandingCatalog', 'catalog')
  await mockApi.mockGraphQL('StatisticsHubTerritoryCount', 'territory-count')
  await mockApi.mockGraphQL('InsObservations', 'counties-pop217a', { variables: { datasetCode: 'POP217A' } })
  await mockApi.mockGraphQL('InsObservations', 'counties-som103a', { variables: { datasetCode: 'SOM103A' } })
  await mockApi.mockGraphQL('InsObservations', 'counties-fom104d', { variables: { datasetCode: 'FOM104D' } })
  await mockApi.mockGraphQL('InsDatasetsExplorer', 'datasets-popul')
}

/** The router JSON-encodes search values that parse as JSON (`"1"`, arrays); read them back decoded. */
function searchParam(href: string, key: string): unknown {
  const raw = new URL(href, 'http://localhost').searchParams.get(key)
  try {
    return JSON.parse(raw ?? 'null')
  } catch {
    return raw
  }
}

test.describe('Statistics hub', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('renders the hero, the figures and the national rows with exact cell links', async ({ page }) => {
    await page.goto('/statistici')
    await waitForHydration(page)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Fiecare localitate')

    const figures = page.locator('section[aria-label="Cifre-cheie"]')
    await expect(figures).toContainText('1.916', { timeout: 20000 })
    await expect(figures).toContainText('21.646.220')
    await expect(figures).toContainText('3.239')

    const themes = page.getByRole('link', { name: /Statistică socială/ })
    await expect(themes).toContainText('844')
    expect(searchParam((await themes.getAttribute('href'))!, 'context')).toBe('1')

    const population = page.getByRole('link', { name: /Populația după domiciliu/ }).first()
    await population.scrollIntoViewIfNeeded()
    await expect(population).toContainText('21.646.220')
    await expect(population).toContainText('persoane')
    const href = (await population.getAttribute('href'))!
    expect(href).toContain('/statistici/seturi/POP107D')
    expect(searchParam(href, 'teritoriu')).toBe('cod:RO')
    expect(searchParam(href, 'unitate')).toBe('9685')
    expect(searchParam(href, 'frecventa')).toBe('ANNUAL')
  })

  test('colours the counties by the indicator in the URL and switches it without a reload', async ({ page }) => {
    await page.goto('/statistici?indicator=somaj')
    await waitForHydration(page)
    const counties = page.locator('section[aria-labelledby="hub-counties-title"]')
    await counties.scrollIntoViewIfNeeded()
    await expect(counties.getByRole('radio', { name: 'Rata șomajului' })).toHaveAttribute('aria-checked', 'true')
    await expect(counties.getByRole('link', { name: /Teleorman/ }).first()).toContainText('9,3%')

    await counties.getByRole('radio', { name: 'Speranța de viață' }).click()
    await expect(page).toHaveURL(/\/statistici$/)
    await expect(counties.getByRole('link', { name: /Vâlcea/ }).first()).toContainText('82,01')
    await expect(counties.getByRole('group', { name: /Durata medie a vieții, 2025/ })).toBeVisible()
    // Counties the read did not return are hatched and counted, never zero.
    await expect(counties).toContainText('județe fără valoare')
  })

  test('draws the 35-year band from the captured series and opens the matrix search on typing', async ({ page }) => {
    await page.goto('/statistici')
    await waitForHydration(page)
    const change = page.locator('section[aria-labelledby="hub-change-title"]')
    await change.scrollIntoViewIfNeeded()
    await expect(change.getByRole('img', { name: /Născuți vii și Decedați, 1990–2025/ })).toBeVisible()
    await expect(change).toContainText('-33,1% din 1990')
    const births = change.getByRole('link', { name: 'Seria nașterilor' })
    expect(searchParam((await births.getAttribute('href'))!, 'din')).toBe(1990)

    const search = page.getByRole('combobox', { name: 'Caută un set de date INS' })
    await search.scrollIntoViewIfNeeded()
    await search.fill('popul')
    const option = page.getByRole('option', { name: /Populatia dupa domiciliu la 1 ianuarie/ })
    await expect(option).toBeVisible({ timeout: 10000 })
    await expect(option).toContainText('POP107D')
    await search.press('ArrowDown')
    await search.press('Enter')
    await expect(page).toHaveURL(/\/statistici\/seturi\/POP107D/)
  })
})
