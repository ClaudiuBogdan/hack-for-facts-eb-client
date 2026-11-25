/**
 * Browser acceptance for the map page: the landing's budget map filling the
 * window, its bar, its address, old links and failures. The figures come from a
 * fixture; the shapes and label points are the app's own static files.
 * Decisions: docs/design/map/design.md.
 */
import { expect, type Page, type Request } from '@playwright/test'
import { test } from '../utils/integration-base'

const figuresEndpoint = '**/api/v1/advanced-map-analytics/grouped-series'

interface FiguresRequest {
  readonly granularity: 'UAT' | 'County'
  readonly series: readonly { readonly id: string; readonly filter: Record<string, unknown> }[]
}

const isFigures = (request: Request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/advanced-map-analytics/grouped-series'
const figuresRequest = (page: Page, matches: (body: FiguresRequest) => boolean = () => true) =>
  page.waitForRequest((request) => isFigures(request) && matches(request.postDataJSON() as FiguresRequest))

/** Income and expenses per code: Cluj-Napoca in deficit, Alba Iulia in surplus; Cluj and Alba counties. */
const FIXTURE: Readonly<Record<'UAT' | 'County', Readonly<Record<string, readonly [number, number]>>>> = {
  UAT: { '54975': [10_000_000, 12_000_000], '1017': [3_000_000, 2_000_000] },
  County: { CJ: [6_500_000_000, 6_200_000_000], AB: [3_500_000_000, 3_450_000_000] },
}

async function mockFigures(page: Page, options: { readonly fail?: boolean } = {}) {
  await page.route(figuresEndpoint, async (route) => {
    if (options.fail) return route.fulfill({ status: 503, json: { ok: false, error: 'unavailable', message: 'The figures are unavailable.' } })
    const body = route.request().postDataJSON() as FiguresRequest
    const rows = Object.entries(FIXTURE[body.granularity])
    const csv = [
      ['siruta_code', ...body.series.map((series) => series.id)].join(','),
      ...rows.map(([code, [income, expenses]]) => [code, ...body.series.map((series) => String(series.id === 'income' ? income : expenses))].join(',')),
    ].join('\n')
    return route.fulfill({
      json: {
        ok: true,
        data: {
          manifest: {
            generated_at: '2026-11-25T00:00:00Z',
            format: 'wide_matrix_v1',
            granularity: body.granularity,
            series: body.series.map((series) => ({ series_id: series.id, unit: 'RON', defined_value_count: rows.length })),
          },
          payload: { mime: 'text/csv', compression: 'none', data: csv },
          warnings: [],
        },
      },
    })
  })
}

const legend = (page: Page) => page.locator('[data-legend="map-page"]')
const radio = (page: Page, name: string) => page.getByRole('radio', { name, exact: true })

test.describe('Map page', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    test.skip(mockApi.mode !== 'mock', 'This suite uses a deterministic figures fixture.')
    // The page reads no GraphQL; never fall through to a live API.
    await page.route('**/graphql', (route) => route.abort('blockedbyclient'))
  })

  test('opens on every primărie\'s balance, as reported, with no notice band', async ({ page }) => {
    await mockFigures(page)
    const request = figuresRequest(page)
    await page.goto('/map')
    const body = (await request).postDataJSON() as FiguresRequest
    expect(body.granularity).toBe('UAT')
    expect(body.series.map((series) => series.filter.account_category)).toEqual(['vn', 'ch'])
    for (const series of body.series) {
      expect(series.filter).toMatchObject({ normalization: 'total', currency: 'RON', is_territorial_executive: true, report_period: { type: 'YEAR', selection: { interval: { start: '2025', end: '2025' } } } })
      expect(series.filter.exclude).toBeUndefined()
    }
    await expect(page.getByRole('heading', { level: 1, name: 'Harta bugetelor locale' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: /Harta afișată: Sold bugetar/ })).toBeVisible()
    await expect(radio(page, 'Total')).toHaveAttribute('data-state', 'on')
    await expect(radio(page, 'Primării')).toHaveAttribute('data-state', 'on')
    await expect(legend(page).getByText('−20%')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Lucrăm încă la această pagină')).toHaveCount(0)
  })

  test('counts per inhabitant over the counties, and keeps it in the address', async ({ page }) => {
    await mockFigures(page)
    await page.goto('/map')
    await expect(legend(page).getByText('−20%')).toBeVisible({ timeout: 20000 })

    const perCapita = figuresRequest(page, (body) => body.series.every((series) => series.filter.normalization === 'per_capita'))
    await radio(page, 'Pe locuitor').click()
    expect((await perCapita).postDataJSON().granularity).toBe('UAT')

    const counties = figuresRequest(page, (body) => body.granularity === 'County')
    await radio(page, 'Județe').click()
    expect(((await counties).postDataJSON() as FiguresRequest).series.every((series) => series.filter.normalization === 'per_capita')).toBe(true)
    await expect(page).toHaveURL(/pe=locuitor/)
    await expect(page).toHaveURL(/nivel=judete/)
    // The county balance is cut finer, and the legend says whose money it is.
    await expect(legend(page)).toContainText('consiliului județean')
    await expect(legend(page).getByText('−6%')).toBeVisible()
  })

  test('lists the figures in a table that finds a locality by name', async ({ page }) => {
    await mockFigures(page)
    await page.goto('/map?vedere=tabel&harta=venituri')
    await expect(page.getByRole('combobox', { name: /Harta afișată: Venituri totale/ })).toBeVisible()
    const search = page.getByRole('searchbox', { name: 'Caută o localitate' })
    await search.fill('cluj-napoca')
    const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Cluj-Napoca' }) })
    await expect(row).toBeVisible({ timeout: 20000 })
    await expect(row.getByRole('link', { name: 'Cluj-Napoca' })).toHaveAttribute('href', '/entities/4305857')
    await expect(row).toContainText(/10\smil\. lei/)
    await expect(row).toContainText(/−2\smil\. lei/)
    await expect(row).toContainText('−20%')
  })

  test('pages the table from one quiet line under it, back to the table\'s head', async ({ page }) => {
    await mockFigures(page)
    await page.goto('/map?vedere=tabel')
    // Every primărie on the map is a row (the shapes are the app's own file); 50 a page.
    await expect(page.getByText(/^1–50 din \d/)).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(/^Pagina 1 din \d+$/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pagina anterioară' })).toBeDisabled()
    await page.getByRole('button', { name: 'Pagina următoare' }).click()
    await expect(page.getByText(/^51–100 din \d/)).toBeVisible()
    await expect(page.getByText(/^Pagina 2 din \d+$/)).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Caută o localitate' })).toBeInViewport()
    // The keyboard's focus came up with the view: the next Tab reaches the new page's rows.
    await expect(page.locator('[data-map-page] [aria-busy]')).toBeFocused()
  })

  test('shows two figures beside the name on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    await mockFigures(page)
    await page.goto('/map?vedere=tabel')
    await expect(page.getByRole('columnheader', { name: 'Sold, % din venituri' })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('columnheader', { name: 'Sold', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Venituri', exact: true })).toBeHidden()
    // The income map's table is sorted by income: the income comes in beside the percent.
    await page.goto('/map?vedere=tabel&harta=venituri')
    await expect(page.getByRole('columnheader', { name: 'Venituri', exact: true })).toBeVisible({ timeout: 20000 })
    await expect(page.getByRole('columnheader', { name: 'Sold, % din venituri' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Sold', exact: true })).toBeHidden()
  })

  test('opens an old link with what it can show, and drops the old keys at the first change', async ({ page }) => {
    await mockFigures(page)
    const filters = { account_category: 'vn', normalization: 'per_capita', report_period: { type: 'YEAR', selection: { interval: { start: '2020', end: '2020' } } }, functional_prefixes: ['65.'] }
    const request = figuresRequest(page)
    await page.goto(`/map?filters=${encodeURIComponent(JSON.stringify(filters))}&mapViewType=County&activeView=table&mapZoom=7`)
    const body = (await request).postDataJSON() as FiguresRequest
    expect(body.granularity).toBe('County')
    for (const series of body.series) {
      expect(series.filter).toMatchObject({ normalization: 'per_capita', report_period: { selection: { interval: { start: '2020', end: '2020' } } } })
      expect(series.filter.functional_prefixes).toBeUndefined()
    }
    await expect(page.getByRole('combobox', { name: /Harta afișată: Venituri pe locuitor/ })).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Caută un județ' })).toBeVisible()

    await radio(page, 'Hartă').click()
    await expect(page).toHaveURL(/harta=venituri/)
    await expect(page).toHaveURL(/an=2020/)
    await expect(page).not.toHaveURL(/filters=|mapViewType=|activeView=|mapZoom=/)
  })

  test('opens the default page from a link of junk, without a script error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await mockFigures(page)
    const request = figuresRequest(page)
    await page.goto(`/map?filters=nimic&preset=xyz&activeView=5&mapViewType=${encodeURIComponent('[1]')}&harta=foo&an=${encodeURIComponent('{"toString":null}')}&pe=x&nivel=y&vedere=z`)
    const body = (await request).postDataJSON() as FiguresRequest
    expect(body.granularity).toBe('UAT')
    expect(body.series[0]!.filter).toMatchObject({ normalization: 'total', report_period: { selection: { interval: { start: '2025', end: '2025' } } } })
    await expect(page.getByRole('combobox', { name: /Harta afișată: Sold bugetar/ })).toBeVisible()
    await expect(legend(page).getByText('−20%')).toBeVisible({ timeout: 20000 })
    expect(errors).toEqual([])
  })

  test('says when the figures cannot be read, and reads them again on request', async ({ page }) => {
    await mockFigures(page, { fail: true })
    await page.goto('/map?vedere=tabel')
    await expect(page.getByText('Tabelul nu s-a putut încărca.')).toBeVisible({ timeout: 20000 })
    await page.unroute(figuresEndpoint)
    await mockFigures(page)
    const again = figuresRequest(page)
    await page.getByRole('button', { name: 'Încearcă din nou' }).click()
    await again
    await expect(page.getByText('Tabelul nu s-a putut încărca.')).toHaveCount(0)
    await page.getByRole('searchbox', { name: 'Caută o localitate' }).fill('alba iulia')
    await expect(page.getByRole('link', { name: 'Alba Iulia' })).toBeVisible()
  })
})
