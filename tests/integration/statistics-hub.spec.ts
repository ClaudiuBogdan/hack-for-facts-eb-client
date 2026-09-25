/**
 * Integration tests for the `/ins` hub — the search hero with the eight
 * domains, the four headline figures, the national rows, the county map with
 * its indicator switch, the localities' map (loaded on the way to it) and the
 * 35-year births-and-deaths band.
 *
 * GraphQL is mocked (fixtures under tests/fixtures/statistics-hub-flow/,
 * built with the builders in src/features/statistics/test/hub-fixtures.ts so
 * the wire shape is the one the fetcher test certifies). The hub fires
 * `InsNationalLatest` once, then one `InsObservations` per county layer; the
 * annual histories are in the client. Typing in the search fires
 * `SearchEntities` scoped to INS datasets.
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
  await mockApi.mockGraphQL('InsNationalLatest', 'tiles')
  await mockApi.mockGraphQL('InsObservations', 'counties-pop217a', { variables: { datasetCode: 'POP217A' } })
  await mockApi.mockGraphQL('InsObservations', 'counties-som103a', { variables: { datasetCode: 'SOM103A' } })
  await mockApi.mockGraphQL('InsObservations', 'counties-fom104d', { variables: { datasetCode: 'FOM104D' } })
  await mockApi.mockGraphQL('SearchEntities', 'search-entities-popul')
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

  test('renders the hero, the headline figures and the national rows with exact cell links', async ({ page }) => {
    await page.goto('/ins')
    await waitForHydration(page)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cifrele oficiale')

    // The four figures a reader comes for, each at its latest period:
    // inflation is the index less 100, at the index's own precision.
    const figures = page.locator('section[aria-label="Cifre-cheie"]')
    await expect(figures).toContainText('10,85', { timeout: 20000 })
    await expect(figures).toContainText('5.914')
    await expect(figures).toContainText('3,2')
    await expect(figures).toContainText('19.043.151')
    await expect(figures).toContainText('mai 2026 față de mai 2025')

    // A matrix with no geography axis is linked without a territory.
    const inflation = figures.getByRole('link', { name: /Inflația anuală/ })
    const inflationHref = (await inflation.getAttribute('href'))!
    expect(inflationHref).toContain('/ins/seturi/IPC102E')
    expect(searchParam(inflationHref, 'teritoriu')).toBeNull()
    expect(searchParam(inflationHref, 'frecventa')).toBe('MONTHLY')
    expect(decodeURIComponent(inflationHref)).toContain('D0:12668')
    const population = figures.getByRole('link', { name: /Locuitori/ })
    const populationHref = (await population.getAttribute('href'))!
    expect(populationHref).toContain('/ins/seturi/POP105A')
    expect(searchParam(populationHref, 'teritoriu')).toBe('cod:RO')

    // The domains say what they hold, not how many matrices they count.
    const themes = page.getByRole('link', { name: /Statistică socială/ })
    expect(searchParam((await themes.getAttribute('href'))!, 'context')).toBe('1')
    await expect(themes).not.toContainText(/\d/)

    // The national rows link to the exact cell, without repeating the headline figures.
    const national = page.locator('section[aria-labelledby="hub-national-title"]')
    const employees = national.getByRole('link', { name: /Salariați/ })
    await employees.scrollIntoViewIfNeeded()
    await expect(employees).toContainText('5.453.155')
    await expect(employees).toContainText('persoane')
    const href = (await employees.getAttribute('href'))!
    expect(href).toContain('/ins/seturi/FOM104D')
    expect(searchParam(href, 'teritoriu')).toBe('cod:RO')
    expect(searchParam(href, 'unitate')).toBe('9685')
    expect(searchParam(href, 'frecventa')).toBe('ANNUAL')
    await expect(national.getByText(/Locuitori|Inflația anuală/)).toHaveCount(0)
  })

  test('colours the counties by the indicator in the URL and switches it without a reload', async ({ page }) => {
    await page.goto('/ins?indicator=somaj')
    await waitForHydration(page)
    const counties = page.locator('section[aria-labelledby="hub-counties-title"]')
    await counties.scrollIntoViewIfNeeded()
    await expect(counties.getByRole('radio', { name: 'Rata șomajului' })).toHaveAttribute('aria-checked', 'true')
    // The ranked row shows the figure; the map's path names the county with it.
    const teleorman = counties.getByRole('listitem').filter({ hasText: 'Teleorman' }).getByRole('link')
    await expect(teleorman).toContainText('9,3%', { timeout: 20000 })
    await expect(counties.getByRole('link', { name: 'Teleorman: 9,3%' })).toHaveCount(1)
    const teleormanHref = (await teleorman.getAttribute('href'))!
    expect(teleormanHref).toContain('/ins/seturi/SOM103A')
    expect(searchParam(teleormanHref, 'teritoriu')).toBe('cod:TR')

    await counties.getByRole('radio', { name: 'Speranța de viață' }).click()
    await expect(page).toHaveURL(/\/ins$/)
    await expect(counties.getByRole('listitem').filter({ hasText: 'Vâlcea' }).getByRole('link')).toContainText('82,01')
    await expect(counties.getByRole('group', { name: /Durata medie a vieții, 2025/ })).toBeVisible()
    // Counties the read did not return are hatched and counted, never zero.
    await expect(counties).toContainText('județe fără valoare')
  })

  test('compares 1990 with now beside the births-and-deaths chart, and finds a dataset from the search', async ({ page }) => {
    await page.goto('/ins')
    await waitForHydration(page)
    const change = page.locator('section[aria-labelledby="hub-change-title"]')
    await change.scrollIntoViewIfNeeded()
    await expect(change.getByRole('slider', { name: /Născuți vii și Decedați, 1990–2025/ })).toBeVisible({ timeout: 20000 })
    await expect(change).toContainText('Din 1992, în fiecare an au murit mai mulți oameni decât s-au născut.')
    const births = change.getByRole('link', { name: /Născuți vii/ })
    await expect(births).toContainText('-53,7%')
    const birthsHref = (await births.getAttribute('href'))!
    expect(birthsHref).toContain('/ins/seturi/POP201D')
    expect(searchParam(birthsHref, 'din')).toBe(1990)
    expect(searchParam(birthsHref, 'pana')).toBe(2025)
    await expect(change.getByRole('link', { name: /Speranța de viață/ })).toContainText('+7,9 ani')

    // The hero's field is the site search pinned to INS datasets; a row is a link to the matrix.
    const search = page.getByRole('combobox', { name: 'Statistici INS · Salariu, inflație, populație sau cod INS...' })
    await search.scrollIntoViewIfNeeded()
    await search.fill('popul')
    const option = page.getByRole('option', { name: /Populatia dupa domiciliu la 1 ianuarie/ })
    await expect(option).toBeVisible({ timeout: 10000 })
    await option.click()
    await expect(page).toHaveURL(/\/ins\/seturi\/POP107D/)
  })

  test('loads the localities’ map on the way to it, switches its series and opens a locality from its finder', async ({ page }) => {
    // The map's code and its snapshot are bundled with the client: no GraphQL, only chunks.
    const mapChunks: string[] = []
    page.on('request', (request) => {
      if (/uat-map-(band|geometry|values)/.test(request.url())) mapChunks.push(request.url())
    })
    // It loads a screen ahead of the reader. A short window keeps it past that
    // while the page is still short with pending sections, as it is here.
    await page.setViewportSize({ width: 1280, height: 400 })
    await page.goto('/ins')
    await waitForHydration(page)
    const band = page.locator('section[aria-labelledby="uat-map-title"]')
    await expect(band.getByRole('heading', { name: 'Unde se situează localitatea ta' })).toBeAttached()
    // The observer reports asynchronously: give it two frames before saying it did not load.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    expect(mapChunks).toHaveLength(0)

    await band.scrollIntoViewIfNeeded()
    // Named by its legend, which a new series renames.
    const map = band.locator('svg[data-uat-map]')
    await expect(map).toBeVisible({ timeout: 20000 })
    await expect(map).toHaveAttribute('aria-label', /^Locuitori după domiciliu la 1 ianuarie \d{4}$/)
    expect(mapChunks.length).toBeGreaterThan(0)
    await expect(band.locator('[data-list="national"] li').first()).toContainText('București')

    await band.getByRole('radio', { name: 'Spor natural' }).click()
    await expect(map).toHaveAttribute('aria-label', /^Născuți-vii minus decedați, în \d{4}$/)
    await expect(band.locator('[data-source-line]')).toContainText('Sursa: INS Tempo, POP201D, POP206D')
    // The series is in the address, as the counties' indicator is.
    await expect(page).toHaveURL(/[?&]harta=spor-natural/)

    // On the whole country a click goes to the county, and names it in the address; a second opens the locality.
    await page.setViewportSize({ width: 1280, height: 900 })
    await map.scrollIntoViewIfNeeded()
    const box = (await map.boundingBox())!
    await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.45)
    await expect(band.locator('[data-list="county"]')).toBeVisible()
    await expect(page).toHaveURL(/[?&]judet=[A-Z]{1,2}/)
    await page.waitForTimeout(600)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect(page).toHaveURL(/\/ins\/teritorii\/\d+/)
    await page.goBack()
    // Back on the hub, the map opens on the series and the county it was left on.
    await band.scrollIntoViewIfNeeded()
    await expect(band.locator('[data-list="county"]')).toBeVisible({ timeout: 20000 })
    await expect(band.getByRole('radio', { name: 'Spor natural' })).toHaveAttribute('aria-checked', 'true')

    const finder = band.getByRole('searchbox', { name: 'Caută o localitate' })
    await finder.fill('sibiu')
    await expect(band.locator('[data-uat-finder] li').first()).toContainText('Sibiu')
    await finder.press('Enter')
    await expect(page).toHaveURL(/\/ins\/teritorii\/143450/)
  })
})
