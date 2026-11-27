import { test, expect } from '@playwright/test'

const chartId = 'ed86a86f-4f51-42e9-84c8-2645e7142a11'
const baseSeries = (id: string, datasetCode: string) => ({
  id,
  type: 'ins-series',
  enabled: true,
  label: datasetCode,
  datasetCode,
  unit: 'pers.',
  aggregation: 'sum',
  hasValue: true,
  sirutaCodes: ['54975'],
  config: { color: '#0062ff', showDataLabels: true },
  createdAt: '2026-09-05T00:00:00.000Z',
  updatedAt: '2026-09-05T00:00:00.000Z',
})
const chart = {
  id: chartId,
  title: 'Native INS source check',
  description: '',
  config: {
    chartType: 'bar-aggr',
    showDataLabels: true,
    showGridLines: true,
    showLegend: true,
    showRelativeValues: false,
    showTooltip: true,
    editAnnotations: false,
    showAnnotations: false,
  },
  series: [baseSeries('first', 'BAD'), baseSeries('second', 'GOOD')],
  annotations: [],
  createdAt: '2026-09-05T00:00:00.000Z',
  updatedAt: '2026-09-05T00:00:00.000Z',
}
function response(code: string, ambiguous: boolean) {
  const row = (member: string, value: string) => ({
    id: ['opaque', code, member, '2024'].join(':'),
    dataset_code: code,
    value,
    value_status: null,
    time_period: {
      iso_period: '2024',
      year: 2024,
      month: null,
      quarter: null,
      periodicity: 'ANNUAL',
    },
    territory: { code: '54975', level: 'LAU', name_ro: 'Test' },
    unit: { code: '9685', symbol: 'pers.' },
    classifications: [
      { id: code + ':D0:' + member, type_code: 'D0', code: member },
      { id: code + ':D1:931', type_code: 'D1', code: '931' },
    ],
    dimensions: {
      geography: {
        pairs: [[1, 931]],
        resolution: 'EXACT',
        flags: [],
        resolvedTerritory: { code: '54975', level: 'LAU' },
        contextTerritory: null,
        applicableRules: [],
        qualified: false,
      },
    },
  })
  const nodes = [row('105', code === 'GOOD' ? '10' : '20')]
  if (ambiguous) nodes.push(row('106', '20'))
  return {
    data: {
      descriptor: {
        code,
        dimension_count: 4,
        metadata: {
          revision_id: '9007199254740993',
          transform_contract_sha256: 'b'.repeat(64),
        },
        dimensions: [
          {
            index: 0,
            type: 'CLASSIFICATION',
            classification_type: { code: 'D0' },
          },
          {
            index: 1,
            type: 'TERRITORIAL',
            classification_type: { code: 'D1' },
          },
          { index: 2, type: 'TEMPORAL', classification_type: null },
          { index: 3, type: 'UNIT_OF_MEASURE', classification_type: null },
        ],
      },
      insObservations: {
        nodes,
        pageInfo: {
          totalCount: nodes.length,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    },
  }
}

for (const language of ['en', 'ro'] as const) {
  for (const mobile of [false, true]) {
    test.describe(
      language + ' ' + (mobile ? 'mobile' : 'desktop') + ' native saved INS',
      () => {
        test.use({
          viewport: mobile
            ? { width: 390, height: 844 }
            : { width: 1440, height: 1000 },
        })
        test.beforeEach(async ({ page, context, baseURL }) => {
          await context.addCookies([
            { name: 'user-locale', value: language, url: baseURL! },
          ])
          await page.addInitScript((locale) => {
            localStorage.setItem('user-locale', locale)
            localStorage.setItem(
              'cookie-consent',
              JSON.stringify({
                version: 1,
                essential: true,
                analytics: false,
                sentry: false,
                updatedAt: new Date().toISOString(),
              }),
            )
          }, language)
        })
        const url = () =>
          '/charts/' +
          chartId +
          '?view=overview&lang=' +
          language +
          '&chart=' +
          encodeURIComponent(JSON.stringify(chart))
        test('retains a healthy sibling and recovers through the translated retry action', async ({
          page,
        }) => {
          let failing = true
          let sourceRequests = 0
          await page.route('**/graphql', async (route) => {
            const request = route.request().postDataJSON()
            if (!String(request.query).includes('query InsSourceObservations'))
              return route.fulfill({ json: { data: {} } })
            sourceRequests++
            expect(route.request().headers()).not.toHaveProperty(
              'authorization',
            )
            expect(request.variables.filter).not.toHaveProperty('hasValue')
            expect(request.query).toMatch(/descriptor:\s*insDataset/)
            expect(new URL(route.request().url()).pathname).toBe(
              '/api/v1/graphql',
            )
            const code = String(request.variables.datasetCode)
            if (code === 'BAD' && failing)
              return route.fulfill({
                status: 503,
                json: { errors: [{ message: 'temporary test failure' }] },
              })
            return route.fulfill({ json: response(code, false) })
          })
          await page.goto(url())
          const retry = page.getByRole('button', {
            name:
              language === 'en'
                ? 'Retry INS data'
                : 'Reîncearcă încărcarea datelor INS',
          })
          await expect(retry).toBeVisible()
          await expect(page.locator('.recharts-bar-rectangle')).toHaveCount(1)
          failing = false
          await retry.click()
          await expect(retry).toHaveCount(0)
          await expect(page.locator('.recharts-bar-rectangle')).toHaveCount(2)
          expect(sourceRequests).toBeGreaterThanOrEqual(4)
          expect(
            JSON.parse(new URL(page.url()).searchParams.get('chart')!).series,
          ).toHaveLength(2)
        })
        test('keeps ambiguous source alternatives editable without a zero bar', async ({
          page,
        }) => {
          await page.route('**/graphql', async (route) => {
            const request = route.request().postDataJSON()
            if (!String(request.query).includes('query InsSourceObservations'))
              return route.fulfill({ json: { data: {} } })
            expect(new URL(route.request().url()).pathname).toBe(
              '/api/v1/graphql',
            )
            const code = String(request.variables.datasetCode)
            return route.fulfill({ json: response(code, code === 'BAD') })
          })
          await page.goto(url())
          await expect(page.locator('.recharts-bar-rectangle')).toHaveCount(1)
          const alert = page.getByRole('alert').filter({
            hasText:
              language === 'en'
                ? 'Some series are unavailable.'
                : 'Unele serii nu sunt disponibile.',
          })
          await expect(alert).toBeVisible()
          await alert
            .getByRole('button', {
              name: /Show details|Arată detalii|Afișează detalii/i,
            })
            .click()
          await expect(alert).toContainText(
            language === 'en'
              ? 'Multiple INS source series match this selection.'
              : 'Mai multe serii INS din sursă corespund selecției.',
          )
          await expect(alert).not.toContainText(
            /auto-resolved|rezolvate automat/i,
          )
          expect(
            JSON.parse(new URL(page.url()).searchParams.get('chart')!).series[0]
              .aggregation,
          ).toBe('sum')
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
          ).toBeLessThanOrEqual(page.viewportSize()!.width)
          await page.screenshot({
            path: test.info().outputPath('native-ins-ambiguity.png'),
            fullPage: true,
          })
        })
      },
    )
  }
}
