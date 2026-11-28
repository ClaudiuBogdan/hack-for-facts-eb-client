/**
 * Integration tests for the company profile, `/companies/:cui`: the page
 * renders the company in one scroll of bands, names who paid it once
 * the SEAP read answers, writes each choice to the URL and reads it back, and
 * fits a phone.
 *
 * The browser's GraphQL is mocked (fixtures under
 * tests/fixtures/companies-profile-flow/, read from the dev API on
 * 24 September 2026 and refreshed to the current contract with curated
 * synthetic additions — registry evidence, statement qualification and
 * source metadata — as that folder's README says). The first render is the
 * server's, which reads the profile and the procurement release from the
 * recordings in tests/fixtures/ssr-api (TEST-001: the ssr-api harness, recorded
 * from the dev API with SSR_API_MODE=record; an unrecorded read fails the
 * test). It stands only until the page's own registry read answers. The page
 * then pins the mocked registry scope and shows the mocked profile under it,
 * so every browser read the page makes is mocked:
 * the registry, the profile, its registration diff, the SEAP slice, the
 * court-litigation summary (no link published, so no litigation band), the
 * analysis release, the procurement release's status and SEAP's cutoff.
 */

import type { Page } from '@playwright/test'
import { test, expect } from '../utils/ssr-api/test'
import { waitForHydration } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

const ABC = '23617561'
const IDEATICA = '47387800'

/** The profile, its registration diff under the pinned scope and the five reads behind the supplier slice, for one company. */
async function mockCompany(mockApi: MockApiFixture, name: 'abc' | 'ideatica', cui: string): Promise<void> {
  await mockApi.mockGraphQL('CompanyProfile', `${name}-profile`, { variables: { cui } })
  await mockApi.mockGraphQL('CompanyRegistrationDiff', `${name}-registration-diff`, { variables: { cui } })
  await mockApi.mockGraphQL('ProcurementAggregates', `${name}-aggregates`, { variables: { scope: { supplierCui: cui } } })
  await mockApi.mockGraphQL('ProcurementSupplierRecords', `${name}-records`, { variables: { supplierCui: cui } })
  await mockApi.mockGraphQL('ProcurementPartyNames', `${name}-supplier-name`, { variables: { supplierCuis: [cui] } })
  if (name === 'abc') await mockApi.mockGraphQL('ProcurementPartyNames', 'abc-authority-names', { variables: { supplierCuis: [] } })
  await mockApi.mockGraphQL('ProcurementCpvDivisions', 'cpv-divisions')
  await mockApi.mockGraphQL('JudicialCompanyLitigation', `${name}-litigation`, { variables: { cui } })
}

/** The GraphQL operations the page's browser asks for, by name. */
function recordOperations(page: Page): string[] {
  const operations: string[] = []
  page.on('request', (request) => {
    try {
      const { query } = JSON.parse(request.postData() ?? '{}') as { query?: string }
      const operation = /\b(?:query|mutation)\s+(\w+)/.exec(query ?? '')?.[1]
      if (operation) operations.push(operation)
    } catch {
      // Not a GraphQL body.
    }
  })
  return operations
}

test.describe('Company profile', () => {
  test.beforeEach(async ({ mockApi }) => {
    // The page's registry pin: one read, no variables, the scope every profile fixture answers under.
    await mockApi.mockGraphQL('CompanyRegistry', 'company-registry')
    // The reads beside the company's own: the analysis release (the main activity's analysis link), the
    // procurement release's status and SEAP's national cutoff (any range the page asks for). No read reaches the API.
    await mockApi.mockGraphQL('CompanyAnalysisRelease', 'company-analysis-release')
    await mockApi.mockGraphQL('ProcurementDaRelease', 'procurement-da-release')
    await mockApi.mockGraphQL('ProcurementCutoff', 'procurement-cutoff')
    await mockCompany(mockApi, 'abc', ABC)
    await mockCompany(mockApi, 'ideatica', IDEATICA)
  })

  test('renders the company, and names who paid it once SEAP answers', async ({ page }) => {
    const operations = recordOperations(page)
    await page.goto(`/companies/${ABC}`)
    await waitForHydration(page)

    await expect(page.getByRole('heading', { level: 1, name: 'ABC-CON-Internațional SRL' })).toBeVisible({ timeout: 30000 })
    await expect(page.getByText('În procedura insolvenței.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Cifre-cheie' })).toContainText('Pierdere netă, 2025')

    const money = page.locator('#bani-publici')
    await expect(money.getByRole('link', { name: /MUNICIPIUL DOROHOI/ })).toHaveAttribute('href', '/procurement/institutions/4112945', { timeout: 30000 })
    await expect(money.getByRole('link', { name: /Extindere retea de canalizare/ })).toHaveAttribute('href', '/procurement/contracts/2311757')
    expect(operations).toEqual(expect.arrayContaining(['ProcurementAggregates', 'ProcurementSupplierRecords']))
  })

  test('shows direct purchases when asked, in the URL, and reads them back', async ({ page }) => {
    await page.goto(`/companies/${ABC}`)
    await waitForHydration(page)

    const payments = page.getByRole('radiogroup', { name: 'Înregistrările SEAP' })
    await payments.getByRole('radio', { name: 'Achiziții directe' }).click()
    await expect(page).toHaveURL(/plati=achizitii-directe/, { timeout: 30000 })
    await expect(page.locator('#bani-publici').getByRole('link', { name: /SPITALUL MUNICIPAL ACADEMICIAN LEON DANAILA/ })).toBeVisible()

    await page.reload()
    await waitForHydration(page)
    await expect(page.getByRole('radiogroup', { name: 'Înregistrările SEAP' }).getByRole('radio', { name: 'Achiziții directe' })).toHaveAttribute(
      'aria-checked',
      'true',
      { timeout: 30000 },
    )
  })

  // Owner, 25 November 2026: one chart, money and people at once — no measure switch; a year is read on asking.
  test('reads a year of the chart from the keyboard, with no measure switch', async ({ page }) => {
    await page.goto(`/companies/${ABC}`)
    await waitForHydration(page)

    const band = page.locator('#afacerea')
    await expect(band.getByRole('radiogroup', { name: 'Graficul arată' })).toHaveCount(0)
    const years = band.getByRole('group', { name: /^Anii:/ })
    await years.focus()
    await years.press('End')
    await expect(band.getByTestId('company-years-reading')).toContainText('Salariați', { timeout: 30000 })
  })


  test('jumps to a band from the section bar, clear of the bar', async ({ page }) => {
    await page.goto(`/companies/${ABC}`)
    await waitForHydration(page)

    const bar = page.getByRole('navigation', { name: 'Secțiunile paginii' })
    await bar.getByRole('link', { name: /Registru/ }).click()
    await expect(page).toHaveURL(/#registru$/)
    const heading = page.getByRole('heading', { level: 2, name: 'Datele din registru' })
    await expect(heading).toBeInViewport()
    // The band being read is the bar's current one.
    await expect(bar.getByRole('link', { name: /Registru/ })).toHaveAttribute('aria-current', 'location')
    // The pinned bar does not cover the band's heading.
    await expect
      .poll(async () => {
        const [barBox, headingBox] = await Promise.all([bar.boundingBox(), heading.boundingBox()])
        return barBox && headingBox ? headingBox.y - (barBox.y + barBox.height) : -1
      })
      .toBeGreaterThanOrEqual(0)
  })

  test('fits a phone: nothing wider than the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/companies/${ABC}`)
    await waitForHydration(page)
    await expect(page.locator('#bani-publici').getByRole('link', { name: /MUNICIPIUL DOROHOI/ })).toBeVisible({ timeout: 30000 })

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('says in a line what the available records do not hold for a company with no statement and no public-money record', async ({ page }) => {
    await page.goto(`/companies/${IDEATICA}`)
    await waitForHydration(page)

    await expect(page.getByRole('heading', { level: 1, name: 'A & B Ideatica S.R.L.' })).toBeVisible({ timeout: 30000 })
    // What the data holds — never a claim that the company filed no statement.
    await expect(page.getByText(/Nicio valoare din bilanțuri în datele de aici/)).toBeVisible()
    // An absence in the records read here — never a verified zero of contracts or payments.
    await expect(
      page.getByText('Firma nu apare în datele de aici ca furnizor în contracte sau achiziții publice (SEAP) și nici ca beneficiar PNRR.', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText(/Niciun contract și nicio plată din bani publici/)).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Cifre-cheie' })).toHaveCount(0)
  })

  test('answers a path that is not a CUI with a 404 in the page’s frame', async ({ page }) => {
    const response = await page.goto('/companies/not-a-cui')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1, name: 'Firma nu a fost găsită' })).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole('link', { name: 'Caută în firme' })).toHaveAttribute('href', '/companies')
  })
})
