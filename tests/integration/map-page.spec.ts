/** Browser acceptance for the simple map and its native grouped-series contract. */
import { expect, type Page, type Request } from '@playwright/test'
import { test } from '../utils/integration-base'

const nativeMapEndpoint = '**/api/v1/advanced-map-analytics/grouped-series'
const isNativeMapRequest = (request: Request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/advanced-map-analytics/grouped-series'
const presetSelector = (page: Page) => page.getByRole('combobox', { name: /configurare hartă|map configuration/i })
const filtersRegion = (page: Page) => page.getByRole('region', { name: /filtre.*hartă|map.*filters/i })
const viewSelector = (page: Page) => page.getByRole('radiogroup', { name: /advanced map analytics active view|vizualizare activă analize hărți avansate/i })

async function mockNativeMap(page: Page) {
  await page.route(nativeMapEndpoint, async route => {
    const body = route.request().postDataJSON() as {
      granularity: 'UAT' | 'County'
      series: { id: string; filter: { account_category: 'vn' | 'ch' } }[]
    }
    // Independent fixture: income 3M/6M, expenses 2M/4M, balance 1M/2M.
    const codes = body.granularity === 'County' ? ['CJ'] : ['1017', '54975']
    const csv = [
      ['siruta_code', ...body.series.map(series => series.id)].join(','),
      ...codes.map((code, index) => [code, ...body.series.map(series =>
        String((series.filter.account_category === 'vn' ? 3000000 : 2000000) * (index + 1)))].join(',')),
    ].join('\n')
    await route.fulfill({ json: { ok: true, data: {
      manifest: { generated_at: '2026-09-07T00:00:00Z', format: 'wide_matrix_v1', granularity: body.granularity,
        series: body.series.map(series => ({ series_id: series.id, unit: 'RON', defined_value_count: codes.length })) },
      payload: { mime: 'text/csv', compression: 'none', data: csv }, warnings: [],
    } } })
  })
}

async function openFilters(page: Page) {
  await page.getByRole('button', { name: /^filtre$|^filters$/i }).click()
  await expect(filtersRegion(page)).toBeVisible()
}
async function closeFilters(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
}
async function switchView(page: Page, view: 'map' | 'table' | 'analytics') {
  const name = { map: /^hartă$|^map$/i, table: /^tabel$|^table$/i, analytics: /^analiză$|^analytics$/i }[view]
  await viewSelector(page).getByText(name).click()
  await expect(viewSelector(page).getByRole('radio', { name })).toBeChecked()
}

test.describe('Simple map page', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    test.skip(mockApi.mode !== 'mock', 'This suite uses a deterministic native API fixture.')
    // Filter lookup data is outside this suite; never fall through to a live GraphQL API.
    await page.route('**/graphql', route => route.abort('blockedbyclient'))
    await mockNativeMap(page)
    await page.goto('/map')
    await expect(presetSelector(page)).toBeVisible()
    await expect(page.getByTestId('leaflet-map')).toBeVisible({ timeout: 15000 })
  })

  test('shows presets and data views without advanced editor panels', async ({ page }) => {
    await expect(presetSelector(page)).toHaveValue('')
    await expect(viewSelector(page)).toBeVisible()
    await expect(filtersRegion(page)).toBeHidden()
    await expect(page.getByRole('button', { name: /adaugă serie|add series/i })).toBeHidden()
    await expect(page.getByTestId('map-geojson-source-link')).toHaveAttribute('href', /^https:\/\/geo-spatial\.org/)
    await expect(page.getByTestId('map-attribution-link')).toBeVisible()
    await page.getByTestId('map-zoom-in').click()
    await page.getByTestId('map-zoom-out').click()
  })

  test('keeps period, normalization and selection filters in the dialog', async ({ page }) => {
    await openFilters(page)
    await expect(page.getByTestId('map-normalization-select')).toBeVisible()
    await expect(filtersRegion(page).getByText('2025', { exact: true })).toBeVisible()
    for (const name of [/^entități$|^entities$/i, /^județe$|^counties$/i, /^(Creditor Principal|Main Creditor)$/i, /^UAT-uri$|^UATs$/i, /interval sumă|amount range/i]) {
      await expect(filtersRegion(page).getByRole('button', { name })).toBeVisible()
    }
    const entities = filtersRegion(page).getByRole('button', { name: /^entități$|^entities$/i })
    await entities.click()
    await expect(entities).toHaveAttribute('data-state', 'open')
  })

  test('custom mode retains editable categories and classifications', async ({ page }) => {
    await openFilters(page)
    const categories = filtersRegion(page).getByRole('group', { name: /venituri.*cheltuieli|income.*expenses/i })
    await expect(categories).toBeVisible()
    await expect(filtersRegion(page).getByRole('button', { name: /clasificație.*funcțională|functional.*classification/i }).first()).toBeVisible()
    const request = page.waitForRequest(request => isNativeMapRequest(request) && request.postDataJSON().series[0]?.filter.account_category === 'vn')
    await categories.getByText(/^venituri$|^income$/i).click()
    await request
  })

  test('presets own categories while shared filters remain editable', async ({ page }) => {
    await presetSelector(page).selectOption('income')
    await openFilters(page)
    await expect(filtersRegion(page).getByText(/presetul stabilește|the preset defines/i)).toBeVisible()
    await expect(filtersRegion(page).getByRole('group', { name: /venituri.*cheltuieli|income.*expenses/i })).toBeHidden()
    await expect(filtersRegion(page).getByRole('button', { name: /clasificație.*funcțională|functional.*classification/i })).toBeHidden()
    await expect(filtersRegion(page).getByRole('button', { name: /^județe$|^counties$/i })).toBeVisible()
  })

  test('switches county geography and requests county totals', async ({ page }) => {
    await openFilters(page)
    const request = page.waitForRequest(request => isNativeMapRequest(request) && request.postDataJSON().granularity === 'County')
    await filtersRegion(page).getByRole('group', { name: /vizualizare.*hartă|map.*view/i }).getByText(/^județ$|^county$/i).click()
    await request
    await expect(page).toHaveURL(/mapViewType=County/)
    await closeFilters(page)
    await switchView(page, 'table')
    await expect(page.getByRole('cell', { name: 'CJ', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /^cod$|^code$/i })).toBeVisible()
  })

  test('renders the native table and restores the legacy chart URL', async ({ page }) => {
    await switchView(page, 'table')
    await expect(page.getByRole('cell', { name: '1017', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: '54975', exact: true })).toBeVisible()
    await switchView(page, 'analytics')
    await expect(page).toHaveURL(/activeView=chart/)
    await expect(page.getByRole('heading', { name: /totaluri serii|series totals/i })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: /totaluri serii|series totals/i })).toBeVisible()
  })

  test('filters the final balance instead of its income and expense operands', async ({ page }) => {
    const sourceFilters: Record<string, unknown>[] = []
    page.on('request', request => {
      if (isNativeMapRequest(request)) {
        sourceFilters.push(...request.postDataJSON().series.map((series: { filter: Record<string, unknown> }) => series.filter))
      }
    })
    const filters = { account_category: 'ch', normalization: 'total', report_period: { type: 'YEAR', selection: { dates: ['2025'] } }, aggregate_min_amount: '1500000' }
    await page.goto('/map?preset=balance&activeView=table&filters=' + encodeURIComponent(JSON.stringify(filters)))
    await expect(page.getByRole('cell', { name: '54975', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: '1017', exact: true })).toBeHidden()
    await expect(page.getByRole('columnheader', { name: /balanță bugetară|budget balance/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /population|populație/i })).toBeHidden()
    expect(sourceFilters).toHaveLength(2)
    for (const filter of sourceFilters) {
      expect(filter.aggregate_min_amount).toBeUndefined()
      expect(filter.aggregate_max_amount).toBeUndefined()
    }
  })

  test('selects native county, UAT and entity identities and restores labels', async ({ page }) => {
    await page.route('**/api/v1/graphql', async route => {
      const query = route.request().postDataJSON().query as string
      const connection = (node: unknown) => ({ edges: [{ node }], totalCount: 1, pageInfo: { hasNextPage: false, endCursor: null } })
      if (query.includes('BudgetCountyOptions')) return route.fulfill({ json: { data: { referenceCounties: [{ countyCode: 'CJ', countyName: 'CLUJ' }] } } })
      if (query.includes('BudgetTerritoryOptions')) return route.fulfill({ json: { data: { referenceTerritories: connection({ id: 1373, name: 'MUNICIPIUL CLUJ-NAPOCA', countyCode: 'CJ', countyName: 'CLUJ' }) } } })
      if (query.includes('BudgetEntityOptions')) return route.fulfill({ json: { data: { referencePublicEntities: connection({ cui: '4305857', name: 'MUNICIPIUL CLUJ-NAPOCA', territory: null }) } } })
      return route.fallback()
    })
    await openFilters(page)
    for (const [button, option, key, value] of [
      [/^(județe|counties)( \d+)?$/i, 'CLUJ (CJ)', 'county_codes', 'CJ'],
      [/^(UAT-uri|UATs)( \d+)?$/i, 'MUNICIPIUL CLUJ-NAPOCA (Jud. CLUJ)', 'uat_ids', '1373'],
      [/^(entități|entities)( \d+)?$/i, /MUNICIPIUL CLUJ-NAPOCA/, 'entity_cuis', '4305857'],
    ] as const) {
      await filtersRegion(page).getByRole('button', { name: button }).click()
      const request = page.waitForRequest(request => isNativeMapRequest(request) && request.postDataJSON().series[0]?.filter[key]?.includes(value))
      await filtersRegion(page).getByRole('option', { name: option }).click()
      await request
      await filtersRegion(page).getByRole('button', { name: button }).click()
    }
    await closeFilters(page)
    await page.reload()
    await expect(page.getByTestId('leaflet-map')).toBeVisible({ timeout: 15000 })
    await openFilters(page)
    await expect(filtersRegion(page).getByText(/MUNICIPIUL CLUJ-NAPOCA/).first()).toBeVisible()
    await expect(page).toHaveURL(/1373/)
  })

  for (const view of ['map', 'table', 'analytics'] as const) {
    test(`shows loading and recovers in ${view} after changing the preset`, async ({ page }) => {
      await switchView(page, view)
      await page.route(nativeMapEndpoint, async route => {
        await new Promise(resolve => setTimeout(resolve, 1500))
        await route.fallback()
      })
      await presetSelector(page).selectOption('income')
      const loading = page.getByText(/loading.*(?:analytics|data)|se încarcă.*(?:analiz|date)/i).first()
      await expect(loading).toBeVisible()
      await expect(loading).toBeHidden({ timeout: 10000 })
      await expect(page.getByRole('heading', { level: 1, name: /^venituri$|^income$/i })).toBeVisible()
      if (view === 'map') await expect(page.getByTestId('leaflet-map')).toBeVisible()
      if (view === 'table') await expect(page.getByRole('cell', { name: '54975', exact: true })).toBeVisible()
      if (view === 'analytics') await expect(page.getByRole('heading', { name: /totaluri serii|series totals/i })).toBeVisible()
    })
  }
})
