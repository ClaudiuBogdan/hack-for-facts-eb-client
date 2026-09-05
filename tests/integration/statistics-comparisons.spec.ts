/** Explicit synthetic native publications; no fixture claims to be captured INS data. */
import { test, expect, type Page } from '@playwright/test'
const descriptor = {
  id: 'TEST',
  code: 'TEST',
  name_ro: 'Indicator de test',
  name_en: 'Test indicator',
  data_status: 'AVAILABLE',
  periodicity: ['ANNUAL'],
  dimension_count: 5,
  metadata: {
    revision_id: '1',
    custody_sha256: 'a'.repeat(64),
    transform_contract_sha256: 'b'.repeat(64),
  },
  dimensions: [
    {
      index: 0,
      type: 'CLASSIFICATION',
      label_ro: 'Categorie',
      classification_type: { code: 'D0' },
    },
    { index: 1, type: 'TERRITORIAL', classification_type: { code: 'D1' } },
    { index: 2, type: 'TERRITORIAL', classification_type: { code: 'D2' } },
    { index: 3, type: 'TEMPORAL', classification_type: null },
    { index: 4, type: 'UNIT_OF_MEASURE', classification_type: null },
  ],
}
function row(
  code: string,
  year: number,
  member: number,
  value: string | null,
  category = '100',
) {
  const level = code === 'B' ? 'NUTS3' : code === 'RO' ? 'NATIONAL' : 'LAU'
  return {
    id: `${code}:${member}:${year}:${category}`,
    dataset_code: 'TEST',
    value,
    value_status: value === null ? 'c' : null,
    time_period: { iso_period: String(year), year, periodicity: 'ANNUAL' },
    unit: { code: '0', symbol: 'pers.', name_ro: 'Persoane' },
    territory: {
      code,
      level,
      name_ro:
        code === 'B'
          ? 'București județ'
          : code === '179132'
            ? 'Municipiul București'
            : code === '179141'
              ? 'Sectorul 1'
              : code,
    },
    classifications: [
      { id: 'd0', type_code: 'D0', code: category, name_ro: 'Categorie sursă' },
      { id: 'd1', type_code: 'D1', code: '1' },
      { id: 'd2', type_code: 'D2', code: String(member) },
    ],
    dimensions: {
      geography: {
        pairs: [
          [1, 1],
          [2, member],
        ],
        resolution: 'EXACT',
        flags: [],
        qualified: false,
        resolvedTerritory: { code, level },
        contextTerritory: null,
        applicableRules: [],
      },
    },
  }
}
const baseRows = [
  row('B', 2024, 10, '123.450'),
  row('B', 2022, 10, '100'),
  row('179132', 2024, 20, null),
  row('179132', 2022, 20, '90'),
  row('179141', 2024, 30, '20'),
]
function link(extra: Record<string, unknown> = {}) {
  const params = new URLSearchParams({
    cod: 'TEST',
    teritorii: JSON.stringify(['cod:B', 'siruta:179132', 'siruta:179141']),
  })
  for (const [key, value] of Object.entries(extra))
    params.set(key, JSON.stringify(value))
  return '/statistici/comparatii?' + params
}
async function mock(
  page: Page,
  opts: { ambiguous?: boolean; changed?: boolean } = {},
) {
  const calls: { query: string; variables: Record<string, unknown> }[] = []
  await page.route('**/graphql', async (route) => {
    expect(new URL(route.request().url()).pathname).toBe('/api/v1/graphql')
    expect(route.request().headers()).not.toHaveProperty('authorization')
    const { query, variables = {} } = route.request().postDataJSON()
    calls.push({ query, variables })
    let data: unknown = {}
    if (query.includes('query InsComparisonDefaults')) {
      const output: Record<string, unknown> = { dataset: descriptor }
      for (const [key, entity] of Object.entries(variables))
        if (key.startsWith('entity')) {
          const e = entity as { territoryCode?: string; sirutaCode?: string }
          const code = e.sirutaCode ?? e.territoryCode ?? 'RO'
          const observation =
            baseRows.find((r) => r.territory.code === code) ?? null
          output['d' + key.slice(6)] = [
            {
              dataset: descriptor,
              observation,
              latestPeriod: observation?.time_period.iso_period ?? null,
              hasData: observation !== null,
              matchStrategy: observation
                ? 'PREFERRED_CLASSIFICATION'
                : 'NO_DATA',
              geographicWitnesses: [],
            },
          ]
        }
      data = output
    } else if (query.includes('query InsDatasetDetails'))
      data = { insDataset: descriptor }
    else if (query.includes('query InsSourceObservations')) {
      const filter = variables.filter as {
        territoryCodes: string[]
        sourcePins?: { dimensionIndex: number; memberCode: string }[]
      }
      expect(filter).not.toHaveProperty('classificationValueCodes')
      expect(filter.sourcePins).toEqual([
        { dimensionIndex: 0, memberCode: '100' },
      ])
      const rows = baseRows.filter((r) =>
        filter.territoryCodes.includes(r.territory.code),
      )
      if (opts.ambiguous) rows.push(row('B', 2021, 11, '100'))
      // Short but progressing pages with unknown count exercise full collection.
      const offset = Number(variables.offset),
        nodes = rows.slice(offset, offset + 2)
      data = {
        descriptor:
          opts.changed && offset > 0
            ? {
                ...descriptor,
                metadata: { ...descriptor.metadata, revision_id: '2' },
              }
            : descriptor,
        insObservations: {
          nodes,
          pageInfo: {
            totalCount: -1,
            hasNextPage: offset + nodes.length < rows.length,
            hasPreviousPage: offset > 0,
          },
        },
      }
    } else if (query.includes('query InsDatasetDimensionValues')) {
      const index = Number(variables.dimensionIndex),
        id = index === 4 ? 0 : 100,
        type = index === 4 ? 'UNIT_OF_MEASURE' : 'CLASSIFICATION'
      data = {
        descriptor,
        insDatasetDimensionValues: {
          nodes: [
            {
              nom_item_id: id,
              dimension_type: type,
              label_ro: index === 4 ? 'Persoane' : 'Categorie sursă',
              classification_value:
                index === 4
                  ? null
                  : { type_code: `D${index}`, code: String(id) },
              unit: index === 4 ? { code: '0', name_ro: 'Persoane' } : null,
            },
          ],
          pageInfo: {
            totalCount: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      }
    } else if (query.includes('query InsTerritories'))
      data = {
        insTerritories: {
          nodes: [],
          pageInfo: {
            totalCount: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      }
    else if (query.includes('query InsDatasetsExplorer'))
      data = {
        insDatasets: {
          nodes: [],
          pageInfo: {
            totalCount: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      }
    await route.fulfill({ json: { data } })
  })
  return calls
}
for (const language of ['en', 'ro'] as const)
  for (const width of [390, 1440]) {
    test.describe(`${language} ${width} native comparisons`, () => {
      test.use({ viewport: { width, height: 900 } })
      test.beforeEach(async ({ context, page, baseURL }) => {
        await context.addCookies([
          { name: 'user-locale', value: language, url: baseURL! },
        ])
        await page.addInitScript(
          (value) => localStorage.setItem('user-locale', value),
          language,
        )
      })
      test('uses complete paired source pages and preserves gaps/statuses/period selection', async ({
        page,
      }, testInfo) => {
        const calls = await mock(page)
        await page.goto(link())
        const table = page.getByRole('table')
        await expect(table).toContainText('123.450', { timeout: 15000 })
        await expect(table).toContainText('[c]')
        await expect(table).toContainText('2023')
        await expect(table).toContainText('Municipiul București')
        await expect(table).toContainText('Sectorul 1')
        const before = calls.filter((c) =>
          c.query.includes('InsSourceObservations'),
        ).length
        expect(before).toBe(3)
        await page.locator('#comparison-period').click()
        await page.getByRole('option', { name: '2022', exact: true }).click()
        await expect(page).toHaveURL(
          (url) =>
            JSON.parse(url.searchParams.get('perioada') ?? 'null') === '2022',
        )
        expect(
          calls.filter((c) => c.query.includes('InsSourceObservations')).length,
        ).toBe(before)
        await page.screenshot({
          path: testInfo.outputPath(`ins-comparison-${language}-${width}.png`),
          fullPage: true,
        })
      })
      test('keeps malformed URL intent without replacing it with example/default data', async ({
        page,
      }) => {
        const calls = await mock(page)
        await page.goto(link({ clasificari: ['SEX:TOTAL'] }))
        await expect(page.getByRole('alert')).toContainText('SEX:TOTAL', {
          timeout: 15000,
        })
        expect(
          calls.filter((c) => c.query.includes('InsSourceObservations')).length,
        ).toBe(0)
        expect(
          calls.filter((c) => c.query.includes('InsComparisonDefaults')).length,
        ).toBe(0)
        await page.reload()
        await expect(page.getByRole('alert')).toContainText('SEX:TOTAL')
      })
      test('keeps equal-valued disjoint source alternatives unavailable', async ({
        page,
      }) => {
        await mock(page, { ambiguous: true })
        await page.goto(link({ perioada: '2020' }))
        const table = page.getByRole('table')
        await expect(table).toContainText(/Mai multe serii|Multiple source/, {
          timeout: 15000,
        })
        await expect(table).toContainText('2020')
        await expect(table).not.toContainText('123.450')
        await expect(
          page.getByText(
            /Serii indisponibile pentru comparație:|Series unavailable for comparison:/,
          ),
        ).toContainText('București')
        const sourceLink = table.getByRole('link').first()
        const href = await sourceLink.getAttribute('href')
        expect(href).not.toBeNull()
        const sourceUrl = new URL(href!, 'http://localhost')
        expect(
          JSON.parse(sourceUrl.searchParams.get('clasificari') ?? 'null'),
        ).toEqual(['D0:100'])
        expect(
          JSON.parse(sourceUrl.searchParams.get('unitate') ?? 'null'),
        ).toBe('0')
        await expect(page.locator('#comparison-period')).toContainText('2020')
      })
    })
  }
test('publication changes never display a partial comparison', async ({
  page,
}) => {
  await mock(page, { changed: true })
  await page.goto(link())
  await expect(
    page.getByRole('button', { name: /Reîncearcă|Retry|Try again/ }).first(),
  ).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('table')).toHaveCount(0)
})

for (const [reason, dataset] of [
  ['UNKNOWN', null],
  [
    'CATALOG_ONLY',
    { ...descriptor, data_status: 'CATALOG_ONLY', metadata: null },
  ],
] as const) {
  test(`dataset ${reason} offers another indicator without futile retry`, async ({
    page,
  }) => {
    const calls = await mock(page)
    await page.route('**/api/v1/graphql', async (route) => {
      const body = route.request().postDataJSON()
      if (body.query.includes('InsComparisonDefaults')) {
        await route.fulfill({ json: { data: { dataset } } })
      } else await route.fallback()
    })
    await page.goto(link())
    await expect(
      page.getByRole('status').filter({
        hasText:
          reason === 'UNKNOWN'
            ? /Indicatorul nu a fost găsit|Indicator not found/
            : /observațiile nu au fost încă publicate|observations have not been published/,
      }),
    ).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: /Reîncearcă|Retry|Try again/ }),
    ).toHaveCount(0)
    expect(
      calls.filter((call) => call.query.includes('InsSourceObservations')),
    ).toHaveLength(0)
  })
}

for (const scenario of [
  { field: 'unitate', dimension: 0, option: 'Categorie sursă' },
  { field: 'clasificari', dimension: 4, option: 'Persoane' },
  { field: 'frecventa', dimension: 4, option: 'Persoane' },
] as const) {
  test(`editing another source control preserves explicit null ${scenario.field}`, async ({
    page,
  }) => {
    const calls = await mock(page)
    await page.goto(
      link({
        clasificari: ['D0:100'],
        unitate: '0',
        frecventa: 'ANNUAL',
        [scenario.field]: null,
      }),
    )
    await expect(page.getByRole('alert')).toBeVisible()
    await page.locator(`#dimension-TEST-${scenario.dimension}`).click()
    await page.getByRole('option', { name: scenario.option }).click()
    await expect(page).toHaveURL(
      (url) => url.searchParams.get(scenario.field) === 'null',
    )
    await expect(page.getByRole('alert')).toBeVisible()
    expect(
      calls.filter((call) => call.query.includes('InsSourceObservations')),
    ).toHaveLength(0)
    await page.reload()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(
      (url) => url.searchParams.get(scenario.field) === 'null',
    )
  })
}
