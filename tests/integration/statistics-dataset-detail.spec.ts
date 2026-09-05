/**
 * Integration tests for the dataset detail disclosure ladder.
 *
 * Route: /statistici/seturi/$cod
 * Synthetic native contract fixtures; see the fixture README. Tier zero,
 * one complete source page and the related catalog are separate operations.
 */

import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
const tier0Fixture = JSON.parse(
  readFileSync(
    new URL(
      '../fixtures/statistics-dataset-detail-flow/tier0-pop107d.json',
      import.meta.url,
    ),
    'utf8',
  ),
)

const sourceFixture = JSON.parse(
  readFileSync(
    new URL(
      '../fixtures/statistics-dataset-detail-flow/series-pop107d.json',
      import.meta.url,
    ),
    'utf8',
  ),
)

const ROUTE = '/statistici/seturi/POP107D'

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  await mockApi.mockGraphQL('StatisticsDatasetTier0', 'tier0-catalog-only', {
    variables: { code: 'TUR101C' },
  })
  await mockApi.mockGraphQL('StatisticsDatasetTier0', 'tier0-not-found', {
    variables: { code: 'NUEXISTA' },
  })
  await mockApi.mockGraphQL('StatisticsDatasetTier0', 'tier0-pop107d')
  await mockApi.mockGraphQL('InsDatasetDetails', 'metadata-pop107d')

  // Most specific first: the pinned FEMININ scope, then the default cell.
  await mockApi.mockGraphQL('InsSourceObservations', 'series-pop107d-feminin', {
    variables: {
      filter: {
        unitCodes: ['0'],
        sourcePins: [
          { dimensionIndex: 0, memberCode: '100' },
          { dimensionIndex: 1, memberCode: '107' },
          { dimensionIndex: 2, memberCode: '931' },
          { dimensionIndex: 3, memberCode: '932' },
        ],
      },
    },
  })
  await mockApi.mockGraphQL('InsSourceObservations', 'series-pop107d')

  await mockApi.mockGraphQL('StatisticsRelatedDatasets', 'related-pop107d')

  await mockApi.mockGraphQL('InsDatasetDimensionValues', 'dimension-values-sex')
}

function countGraphQLPosts(page: Page): { readonly count: () => number } {
  let posts = 0
  page.on('request', (request) => {
    if (request.url().includes('/graphql') && request.method() === 'POST') {
      posts += 1
    }
  })
  return { count: () => posts }
}

test.describe('Dataset detail — the disclosure ladder', () => {
  test.beforeEach(async ({ mockApi }) => {
    await setupMocks(mockApi)
  })

  test('tier 0 is useful with ZERO interactions', async ({ page }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)

    // The latest resolved value, LARGE, with unit and period.
    await expect(page.getByText('21.739.373')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('pers.').first()).toBeVisible()

    // Provenance chips: INS Tempo + the matrix code, never in title position.
    await expect(page.getByText('INS Tempo').first()).toBeVisible()
    await expect(page.getByText('POP107D').first()).toBeVisible()

    // The scope sentence marks server-resolved defaults: dotted underline +
    // ONE legend line on desktop; "(implicit)" lives in the aria-label.
    await expect(page.getByText(/Valorile subliniate punctat/)).toBeVisible()
    await expect(page.getByLabel(/\(implicit\)/).first()).toBeVisible()

    // Trend chart under the number.
    await expect(page.locator('.recharts-responsive-container')).toBeVisible()

    // Tiers 2–3 are closed accordion rows labeled with their answers.
    await expect(page.getByText(/Tabelul seriei \(/)).toBeVisible()
    await expect(page.getByText(/Dimensiuni și clasificări/)).toBeVisible()
    await expect(page.getByText(/Proveniență și limite/)).toBeVisible()
  })

  test('tier 0 stays inside the three-operation single-page budget', async ({
    page,
  }) => {
    const posts = countGraphQLPosts(page)
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText('21.739.373')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)

    expect(posts.count()).toBe(3)
  })

  test('the observations table mounts on accordion open and prints values verbatim', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText('21.739.373')).toBeVisible({ timeout: 15000 })

    await expect(page.getByRole('table')).toHaveCount(0)
    await page.getByText(/Tabelul seriei \(/).click()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('table')).toContainText('2025')
  })

  test('changing a scope segment writes the URL and re-resolves the series', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await waitForPageReady(page)
    await expect(page.getByText('21.739.373')).toBeVisible({ timeout: 15000 })

    // Every source dimension uses the same paginated picker, including small
    // lists. Segment order follows the dimensions: age first, then sex.
    await page
      .locator('button', { hasText: /^total/i })
      .nth(1)
      .click()
    await page.getByRole('combobox', { name: 'Sexe' }).click()
    await page.getByRole('option', { name: /Feminin/i }).click()

    // The URL contract: the pin lands in ?clasificari=.
    await expect
      .poll(
        () =>
          decodeURIComponent(
            new URL(page.url()).searchParams.get('clasificari') ?? '',
          ),
        { timeout: 5000 },
      )
      .toContain('D1:107')

    // The hero re-resolves to the pinned cell, (implicit) drops for it.
    await expect(page.getByText('11.136.500')).toBeVisible({ timeout: 15000 })
  })

  test('source picker follows short unknown-count pages and hides stale search options', async ({
    page,
  }) => {
    let releaseSearch!: () => void
    const pendingSearch = new Promise<void>((resolve) => {
      releaseSearch = resolve
    })
    const requests: { offset: number; search: string }[] = []
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON()
      if (
        !String(body.query).includes('query InsDatasetDimensionValues') ||
        body.variables.dimensionIndex !== 0
      ) {
        await route.fallback()
        return
      }
      expect(new URL(route.request().url()).pathname).toBe('/api/v1/graphql')
      expect(route.request().headers()).not.toHaveProperty('authorization')
      const { offset, search } = body.variables
      requests.push({ offset, search })
      if (search === 'searched') await pendingSearch
      const ids =
        search === 'searched' ? [111] : offset === 0 ? [100, 101] : [102]
      await route.fulfill({
        json: {
          data: {
            descriptor: tier0Fixture.data.dataset,
            insDatasetDimensionValues: {
              nodes: ids.map((id) => ({
                nom_item_id: id,
                dimension_type: 'CLASSIFICATION',
                label_ro: `Synthetic age ${id}`,
                classification_value: { type_code: 'D0', code: String(id) },
              })),
              pageInfo: {
                totalCount: -1,
                hasNextPage: search === '' && offset === 0,
                hasPreviousPage: offset > 0,
              },
            },
          },
        },
      })
    })
    await page.goto(ROUTE)
    await expect(page.getByText('21.739.373')).toBeVisible()
    await page
      .locator('button', { hasText: /^total/i })
      .first()
      .click()
    await page
      .getByRole('combobox', { name: 'Varste si grupe de varsta' })
      .click()
    await expect(
      page.getByRole('option', { name: 'Synthetic age 100' }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: 'Pagina următoare de opțiuni' })
      .click()
    await expect(
      page.getByRole('option', { name: 'Synthetic age 102' }),
    ).toBeVisible()
    expect(requests.map((r) => r.offset)).toEqual([0, 2])
    await page
      .getByRole('button', { name: 'Pagina anterioară de opțiuni' })
      .click()
    await expect(
      page.getByRole('option', { name: 'Synthetic age 100' }),
    ).toBeVisible()
    await page.getByPlaceholder('Caută…').fill('searched')
    await expect(
      page.getByRole('option', { name: 'Synthetic age 100' }),
    ).not.toBeVisible()
    await expect
      .poll(() => requests.some((r) => r.search === 'searched'))
      .toBe(true)
    releaseSearch()
    await expect(
      page.getByRole('option', { name: 'Synthetic age 111' }),
    ).toBeVisible()
    expect(requests.at(-1)).toEqual({ offset: 0, search: 'searched' })
    await page.screenshot({
      path: test.info().outputPath('native-source-picker.png'),
      fullPage: true,
    })
  })

  test('CSV download round-trips original source identity, decimal and publication', async ({
    page,
  }) => {
    await page.goto(ROUTE)
    await expect(page.getByText('21.739.373')).toBeVisible()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Descarcă CSV' }).click()
    const download = await downloadPromise
    const path = await download.path()
    expect(path).not.toBeNull()
    const parsed = Papa.parse<Record<string, string>>(
      readFileSync(path!, 'utf8'),
      { header: true, skipEmptyLines: true },
    )
    expect(parsed.errors).toEqual([])
    expect(parsed.data).toHaveLength(
      sourceFixture.data.insObservations.nodes.length,
    )
    const exported = parsed.data.map((row) => JSON.parse(row.source_row_json))
    expect(exported).toEqual(
      expect.arrayContaining(sourceFixture.data.insObservations.nodes),
    )
    for (const row of parsed.data) {
      const original = JSON.parse(row.source_row_json)
      expect(JSON.parse(row.value_decimal_json)).toBe(original.value)
      expect(JSON.parse(row.D2_member_code_json)).toBe('931')
      expect(JSON.parse(row.D3_member_code_json)).toBe('932')
      expect(JSON.parse(row.publication_json)).toEqual(
        sourceFixture.data.descriptor.metadata,
      )
    }
  })

  test('invalid source URL selection never falls back to national observations', async ({
    page,
  }) => {
    let observationRequests = 0
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        request.url().includes('/graphql') &&
        String(request.postDataJSON()?.query).includes(
          'query InsSourceObservations',
        )
      )
        observationRequests += 1
    })
    await page.goto(
      `${ROUTE}?clasificari=${encodeURIComponent(JSON.stringify(['D9:107']))}`,
    )
    await expect(
      page.getByText('Selecția din adresă nu poate fi aplicată'),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Șterge clasificările invalide' }),
    ).toBeVisible()
    await expect(page.locator('.recharts-responsive-container')).toHaveCount(0)
    expect(observationRequests).toBe(0)
    await page.reload()
    await expect(
      page.getByText('Selecția din adresă nu poate fi aplicată'),
    ).toBeVisible()
    expect(observationRequests).toBe(0)
  })

  test('partial selection offers a bounded inspection and disables incomplete CSV', async ({
    page,
  }) => {
    const requested: { limit: number; offset: number; filter: unknown }[] = []
    await page.route('**/graphql', async (route) => {
      const body = route.request().postDataJSON()
      if (!String(body.query).includes('query InsSourceObservations'))
        return route.fallback()
      requested.push(body.variables)
      const fixture = structuredClone(sourceFixture)
      fixture.data.insObservations.nodes =
        fixture.data.insObservations.nodes.slice(0, 2)
      fixture.data.insObservations.pageInfo = {
        totalCount: -1,
        hasNextPage: true,
        hasPreviousPage: false,
      }
      await route.fulfill({ json: fixture })
    })
    await page.goto(
      `${ROUTE}?clasificari=${encodeURIComponent(JSON.stringify(['D2:931', 'D3:932']))}&unitate=0`,
    )
    await expect(
      page.getByText(/Tabelul arată o pagină de explorare/),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Descarcă CSV' }),
    ).toBeDisabled()
    await expect(page.locator('.recharts-responsive-container')).toHaveCount(0)
    expect(requested).toEqual([
      {
        datasetCode: 'POP107D',
        filter: {
          unitCodes: ['0'],
          sourcePins: [
            { dimensionIndex: 2, memberCode: '931' },
            { dimensionIndex: 3, memberCode: '932' },
          ],
        },
        offset: 0,
        limit: 50,
      },
    ])
    await page.getByText(/Tabelul seriei \(/).click()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(
      page.getByRole('columnheader', { name: 'Judete D2' }),
    ).toBeVisible()
    await expect(
      page.getByRole('columnheader', { name: 'Localitati D3' }),
    ).toBeVisible()
  })

  test('an unknown code renders not-found, not an error page', async ({
    page,
  }) => {
    await page.goto('/statistici/seturi/NUEXISTA')
    await waitForPageReady(page)

    await expect(page.getByText('Set de date negăsit')).toBeVisible({
      timeout: 15000,
    })
  })
})

for (const language of ['en', 'ro'] as const) {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    test.describe(`${language} ${viewport.width} source detail`, () => {
      test.use({ viewport })
      test('retains the latest null period and status with inspectable source provenance', async ({
        page,
        context,
        baseURL,
        mockApi,
      }) => {
        await setupMocks(mockApi)
        await context.addCookies([
          { name: 'user-locale', value: language, url: baseURL! },
        ])
        await page.addInitScript(
          (locale) => localStorage.setItem('user-locale', locale),
          language,
        )
        await page.route('**/graphql', async (route) => {
          if (
            !String(route.request().postDataJSON().query).includes(
              'query InsSourceObservations',
            )
          )
            return route.fallback()
          const fixture = structuredClone(sourceFixture)
          fixture.data.insObservations.nodes[0].value = null
          fixture.data.insObservations.nodes[0].value_status = 'c'
          await route.fulfill({ json: fixture })
        })
        await page.goto(ROUTE)
        const unavailable =
          language === 'ro'
            ? 'Fără o valoare recentă pentru selecția curentă.'
            : 'No recent value for the current selection.'
        await expect(page.getByText(unavailable)).toBeVisible()
        await expect(
          page.getByText(language === 'ro' ? 'stare: c' : 'status: c'),
        ).toBeVisible()
        await expect(page.getByText('21.739.373')).toHaveCount(0)
        await page
          .getByText(
            language === 'ro' ? /Tabelul seriei \(/ : /Series table \(/,
          )
          .click()
        const table = page.getByRole('table')
        await expect(table).toContainText('2025')
        await expect(table.getByRole('columnheader')).toHaveCount(10)
        await table
          .getByText(
            language === 'ro' ? 'Detalii din sursă' : 'Source details',
            { exact: true },
          )
          .first()
          .click()
        await expect(
          table
            .getByText(
              language === 'ro'
                ? /Identificator observație/
                : /Observation identifier/,
            )
            .first(),
        ).toBeVisible()
        await expect(table.getByText(/9007199254740993/).first()).toBeVisible()
        await expect(
          page.getByRole('button', {
            name: language === 'ro' ? 'Descarcă CSV' : 'Download CSV',
          }),
        ).toBeEnabled()
        await page.screenshot({
          path: test
            .info()
            .outputPath(`ins-detail-${language}-${viewport.width}.png`),
          fullPage: true,
        })
      })
    })
  }
}
