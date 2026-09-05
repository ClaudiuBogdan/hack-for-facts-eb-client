import { test, expect } from '@playwright/test'

const dataset = (code: string) => ({
  id: code,
  code,
  name_ro: code,
  name_en: code,
  periodicity: ['ANNUAL'],
  data_status: 'AVAILABLE',
  dimension_count: 4,
  metadata: {
    revision_id: '9007199254740993',
    transform_contract_sha256: 'a'.repeat(64),
  },
  dimensions: [
    { index: 0, type: 'CLASSIFICATION', classification_type: { code: 'D0' } },
    { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' } },
    { index: 2, type: 'TEMPORAL', classification_type: null },
    { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
})
const row = (year: number, value: string | null, status: string | null) => ({
  id: 'cell-' + year,
  dataset_code: 'GOOD',
  value,
  value_status: status,
  time_period: { iso_period: String(year), year, periodicity: 'ANNUAL' },
  unit: { code: '0', symbol: 'pers.' },
  classifications: [
    { id: 'cl-0', type_code: 'D0', code: '105' },
    { id: 'cl-1', type_code: 'D1', code: '931' },
  ],
  dimensions: {
    geography: {
      pairs: [[1, 931]],
      resolution: 'EXACT',
      flags: [],
      qualified: false,
      resolvedTerritory: { code: '54975', level: 'LAU' },
      contextTerritory: null,
      applicableRules: [],
    },
  },
})
const hub = {
  dashboard: [
    {
      dataset: dataset('GOOD'),
      status: 'SERIES',
      latestPeriod: '2024',
      truncated: true,
      geographicWitnesses: [],
      observations: [row(2024, '10', null), row(2023, null, 'c')],
    },
    {
      dataset: dataset('AMBIGUOUS'),
      status: 'AMBIGUOUS_GEOGRAPHY',
      latestPeriod: null,
      truncated: false,
      geographicWitnesses: [[[1, 931]], [[1, 932]]],
      observations: [],
    },
  ],
  identity: {
    nodes: [
      {
        code: '54975',
        siruta_code: '54975',
        name_ro: 'MUNICIPIUL CLUJ-NAPOCA',
        level: 'LAU',
        parent_code: 'CJ',
        parent_name_ro: 'Cluj',
      },
    ],
  },
}
const hubContext = {
  loaded: { pageInfo: { totalCount: 2 } },
  catalog: { pageInfo: { totalCount: 2 } },
  county: [],
  national: [],
}
for (const language of ['en', 'ro'] as const) {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    test.describe(`${language} ${viewport.width} native INS outcomes`, () => {
      test.use({ viewport })
      test('preserves ambiguity and null cells, and identifies missing truncated history', async ({
        page,
        context,
        baseURL,
      }) => {
        await context.addCookies([
          { name: 'user-locale', value: language, url: baseURL! },
        ])
        await page.addInitScript(
          (locale) => localStorage.setItem('user-locale', locale),
          language,
        )
        await page.route('**/graphql', (route) => {
          expect(new URL(route.request().url()).pathname).toBe(
            '/api/v1/graphql',
          )
          expect(route.request().headers()).not.toHaveProperty('authorization')
          const query = String(route.request().postDataJSON().query)
          return route.fulfill({
            json: {
              data: query.includes('query StatisticsTerritoryHubContext')
                ? hubContext
                : query.includes('query StatisticsTerritoryHub(')
                  ? hub
                  : {},
            },
          })
        })
        await page.goto('/statistici/teritorii/54975?lang=' + language)
        const good = page
          .locator('article')
          .filter({
            has: page.getByRole('heading', { name: 'GOOD', exact: true }),
          })
        const ambiguous = page
          .locator('article')
          .filter({
            has: page.getByRole('heading', { name: 'AMBIGUOUS', exact: true }),
          })
        await expect(good).toContainText('10 pers.')
        await expect(ambiguous).toContainText(
          language === 'en'
            ? 'Multiple INS series match'
            : 'Mai multe serii INS corespund',
        )
        await expect(
          ambiguous.getByRole('link', {
            name: /Inspect the source series|Inspectează seria din sursă/,
          }),
        ).toBeVisible()
        await page.locator('#statistics-hub-period').click()
        await page.getByRole('option', { name: '2023', exact: true }).click()
        await expect(good).toContainText(
          language === 'en' ? 'Confidential' : 'Confidențial',
        )
        await expect(ambiguous).toContainText(
          language === 'en'
            ? 'Multiple INS series match'
            : 'Mai multe serii INS corespund',
        )
        await page.goto(
          '/statistici/teritorii/54975?period=1999&lang=' + language,
        )
        await expect(good).toContainText(
          language === 'en'
            ? 'This period is outside the loaded history'
            : 'Perioada nu este inclusă în istoricul încărcat',
        )
        await expect(ambiguous).toContainText(
          language === 'en'
            ? 'Multiple INS series match'
            : 'Mai multe serii INS corespund',
        )
        await expect(good).not.toContainText(/Date până în 1999|Data through 1999/)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width)
        await page.screenshot({
          path: test.info().outputPath('native-ins-outcomes.png'),
          fullPage: true,
        })
      })
    })
  }
}
