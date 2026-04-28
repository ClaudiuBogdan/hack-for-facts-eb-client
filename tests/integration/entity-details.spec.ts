/**
 * Entity Details Page Integration Tests
 *
 * Covers the current primarie-derived analysis experience rendered by
 * /entities/:cui. Legacy entity tabs are intentionally not asserted here.
 */

import { test, expect } from '../utils/integration-base'
import type { Page } from '@playwright/test'
import type { MockApiFixture } from '../utils/types'
import { waitForHydration } from '../utils/test-helpers'

const TEST_ENTITY_CUI = '4305857'

async function mockEntityDetailsOperations(mockApi: MockApiFixture) {
  await mockApi.mockGraphQL('GetEntityDetails', 'entity-details')
  await mockApi.mockGraphQL('GetEntityLineItems', 'entity-line-items')
  await mockApi.mockGraphQL('GetEntityRelationships', 'challenge-entity-relationships')
  await mockApi.mockGraphQL('EntityAnalytics', 'entity-analytics')
  await mockApi.mockGraphQL('GetEntityReports', 'entity-reports')
  await mockApi.mockGraphQL('GetReports', 'get-reports')
}

async function openEntityDetails(page: Page) {
  await page.goto(`/entities/${TEST_ENTITY_CUI}`)
  await expect(
    page.getByRole('heading', { name: /MUNICIPIUL CLUJ-NAPOCA/i, level: 1 }),
  ).toBeVisible({ timeout: 15000 })
  await waitForHydration(page)
}

test.describe('Entity Details Page', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    if (mockApi.mode === 'live') {
      test.skip()
      return
    }

    await mockEntityDetailsOperations(mockApi)
    await openEntityDetails(page)
  })

  test('displays entity header with current analysis controls', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /MUNICIPIUL CLUJ-NAPOCA/i, level: 1 }),
    ).toBeVisible()

    await expect(page.getByText(/CLUJ/i).first()).toBeVisible()
    await expect(page.getByText(/286\.598|286,598|286598/).first()).toBeVisible()

    const viewMenuButton = page.getByRole('button', {
      name: /alege vizualizarea entității|choose entity view/i,
    }).first()
    await expect(viewMenuButton).toBeVisible()
    await expect(viewMenuButton).toContainText(/Execuții Bugetare|Budget Execution/i)

    const reportControlsButton = page.getByRole('button', {
      name: /deschide filtrele de raportare|open reporting filters/i,
    }).first()
    await expect(reportControlsButton).toBeVisible()
  })

  test('displays financial summary and budget analysis sections', async ({ page }) => {
    await expect(page.getByText(/^Venituri$|^Income$/i).first()).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/^Cheltuieli$|^Expenses$/i).first()).toBeVisible()
    await expect(
      page.getByText(/Venituri - Cheltuieli|Income - Expenses/i).first(),
    ).toBeVisible()
    await expect(page.getByText(/RON/).first()).toBeVisible()

    await expect(
      page.getByText(/Evoluție Financiară|Financial Trends/i).first(),
    ).toBeVisible({ timeout: 10000 })

    await expect(
      page.getByText(/Distribuția Cheltuielilor|Spending breakdown/i).first(),
    ).toBeVisible({ timeout: 10000 })

    await expect(
      page.getByRole('button', { name: /Arată venituri|Show revenue/i }).first(),
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: /Arată (cum|pe ce) s-au cheltuit banii|Show (how the money was spent|where the money was spent)/i,
      }).first(),
    ).toBeVisible()
  })

  test('displays current view and report actions', async ({ page }) => {
    const viewNavigator = page.getByTestId('challenge-entity-view-navigator')
    await expect(viewNavigator).toBeVisible({ timeout: 10000 })
    await expect(viewNavigator.getByRole('button', { name: /Contracte|Contracts/i })).toBeVisible()
    await expect(viewNavigator.getByRole('button', { name: /Angajamente|Commitments/i })).toBeVisible()
    await expect(viewNavigator.getByRole('button', { name: /INS/i })).toBeVisible()
    await expect(viewNavigator.getByRole('button', { name: /Contact/i })).toBeVisible()

    await expect(page.getByRole('button', { name: /Arată doar entitatea|Show entity only/i }).first())
      .toBeVisible()
    await expect(page.getByRole('button', { name: /Arată per capita|Show per capita/i }).first())
      .toBeVisible()
  })

  test('navigates from main info to another current analysis view', async ({ page }) => {
    await waitForHydration(page)

    const commitmentsViewButton = page
      .getByTestId('challenge-entity-view-navigator')
      .getByRole('button', { name: /^Angajamente$|^Commitments$/i })

    await expect(commitmentsViewButton).toBeEnabled({ timeout: 10000 })

    await Promise.all([
      page.waitForURL(/view=commitments/, { timeout: 10000 }),
      commitmentsViewButton.click(),
    ])
  })

  test('normalizes legacy entity views into main info content', async ({ page }) => {
    await page.goto(`/entities/${TEST_ENTITY_CUI}?view=expense-trends`)

    await expect(
      page.getByRole('heading', { name: /MUNICIPIUL CLUJ-NAPOCA/i, level: 1 }),
    ).toBeVisible({ timeout: 15000 })

    const viewMenuButton = page.getByRole('button', {
      name: /alege vizualizarea entității|choose entity view/i,
    }).first()
    await expect(viewMenuButton).toContainText(/Execuții Bugetare|Budget Execution/i)
    await expect(
      page.getByText(/Distribuția Cheltuielilor|Spending breakdown/i).first(),
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Entity Details - SSR Metadata and Share Image', () => {
  test('returns entity-specific SSR meta tags with dynamic image URL', async ({ request, mockApi }) => {
    if (mockApi.mode !== 'live') {
      test.skip()
      return
    }

    const response = await request.get(`/entities/${TEST_ENTITY_CUI}?year=2025&period=YEAR&normalization=total&currency=RON`)
    expect(response.ok()).toBeTruthy()

    const html = await response.text()

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
    expect(titleMatch?.[1]).toContain('Transparenta.eu')
    expect(titleMatch?.[1]).toContain('Buget')

    const descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
    expect(descriptionMatch?.[1]).toBeTruthy()
    expect(descriptionMatch?.[1]).toContain('MUNICIPIUL CLUJ-NAPOCA')

    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
    expect(ogTitleMatch?.[1]).toContain('Transparenta.eu')

    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
    expect(ogImageMatch?.[1]).toContain(`/entities/${TEST_ENTITY_CUI}/share-image.png?`)

    const twitterImageMatch = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i)
    expect(twitterImageMatch?.[1]).toContain(`/entities/${TEST_ENTITY_CUI}/share-image.png?`)
  })

  test('serves share image endpoint as PNG', async ({ request, mockApi }) => {
    if (mockApi.mode !== 'live') {
      test.skip()
      return
    }

    const imageResponse = await request.get(
      `/entities/${TEST_ENTITY_CUI}/share-image.png?year=2025&period=YEAR&normalization=total&currency=RON`,
    )

    expect(imageResponse.status()).toBe(200)

    const contentType = imageResponse.headers()['content-type']
    expect(contentType).toContain('image/png')

    const cacheControl = imageResponse.headers()['cache-control']
    expect(cacheControl).toContain('max-age=86400')
    expect(cacheControl).toContain('s-maxage=86400')

    const body = await imageResponse.body()
    expect(body.length).toBeGreaterThan(100)

    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    expect(Buffer.from(body).subarray(0, 8).equals(pngSignature)).toBe(true)
  })
})
