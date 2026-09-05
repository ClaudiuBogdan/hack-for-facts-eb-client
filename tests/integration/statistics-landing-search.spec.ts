/** Synthetic native publications. Complete source pages and the canonical spine are independently mocked. */
import { test, expect, type Page } from '@playwright/test'
import {
  counties,
  source,
  observation,
  exampleSource,
} from '../../src/features/statistics/test/native-landing-fixtures'

const codes = ['POP107D', 'FOM104D', 'SOM101F', 'LOC101B']
const descriptor = (code: string) => ({
  ...source().descriptor,
  id: code,
  code,
  name_ro: code,
  name_en: code,
  data_status: 'AVAILABLE',
  periodicity: ['ANNUAL'],
})
const outcome = (code: string, territory = 'RO', noData = false) => ({
  dataset: descriptor(code),
  observation: noData
    ? null
    : observation(territory, 2025, '12345678901234567890.012300', 10, code),
  latestPeriod: noData ? null : '2025',
  hasData: !noData,
  matchStrategy: noData ? 'NO_DATA' : 'TOTAL_FALLBACK',
  geographicWitnesses: [],
})
const parseParam = (href: string, key: string) => {
  const raw = new URL(href, 'http://localhost').searchParams.get(key)
  try {
    return JSON.parse(raw ?? 'null')
  } catch {
    return raw
  }
}
async function mock(
  page: Page,
  opts: {
    missingCounty?: boolean
    flagged?: boolean
    tileFailure?: boolean
    unknown?: boolean
  } = {},
) {
  const calls: { query: string; variables: Record<string, unknown> }[] = []
  let tileFailure = opts.tileFailure ?? false
  await page.route('**/graphql', async (route) => {
    expect(route.request().headers()).not.toHaveProperty('authorization')
    expect(new URL(route.request().url()).pathname).toBe('/api/v1/graphql')
    const { query, variables = {} } = route.request().postDataJSON()
    calls.push({ query, variables })
    let data: unknown
    if (query.includes('query InsLandingTiles')) {
      if (tileFailure) {
        await route.fulfill({ json: { errors: [{ message: 'unavailable' }] } })
        return
      }
      data = { latest: codes.map((code) => outcome(code)) }
    } else if (query.includes('query InsComparisonDefaults')) {
      const result: Record<string, unknown> = { dataset: descriptor('FOM104D') }
      for (const [key, value] of Object.entries(variables))
        if (key.startsWith('entity')) {
          const entity = value as {
            sirutaCode?: string
            territoryCode?: string
          }
          result['d' + key.slice(6)] = [
            outcome(
              'FOM104D',
              entity.sirutaCode ?? entity.territoryCode ?? 'RO',
            ),
          ]
        }
      data = result
    } else if (query.includes('query InsSourceObservations')) {
      const code = String(variables.datasetCode)
      const filter = variables.filter as {
        territoryCodes: string[]
        sourcePins: unknown[]
        unitCodes: string[]
      }
      expect(filter).not.toHaveProperty('classificationValueCodes')
      expect(filter.sourcePins).toEqual([
        { dimensionIndex: 0, memberCode: '0' },
      ])
      expect(filter.unitCodes).toEqual(['0'])
      const raw =
        code === 'POP107D'
          ? source().observations
          : exampleSource().observations
      const rows = raw
        .filter(
          (r) =>
            filter.territoryCodes.includes(r.territory!.code!) &&
            !(
              opts.missingCounty &&
              code === 'POP107D' &&
              r.territory?.code === 'AB'
            ),
        )
        .map((r) => ({
          ...r,
          value:
            r.time_period.year === 2025 && r.territory?.code === 'AB'
              ? '90.000'
              : r.time_period.year === 2025 && r.territory?.code === 'CJ'
                ? '120.000'
                : r.value,
          value_status:
            opts.flagged && code === 'POP107D' && r.territory?.code === 'AB'
              ? 'p'
              : null,
        }))
      const offset = Number(variables.offset),
        nodes = rows.slice(offset, offset + 25)
      data = {
        descriptor: descriptor(code),
        insObservations: {
          nodes,
          pageInfo: {
            totalCount: rows.length,
            hasNextPage: offset + nodes.length < rows.length,
            hasPreviousPage: offset > 0,
          },
        },
      }
    } else if (query.includes('query StatisticsLandingCatalog')) {
      data = {
        loaded: { pageInfo: { totalCount: 1916 } },
        catalog: { pageInfo: { totalCount: 1916 } },
        ...Object.fromEntries(
          Array.from({ length: 8 }, (_, i) => [
            't' + (i + 1),
            { pageInfo: { totalCount: 10 } },
          ]),
        ),
      }
    } else if (query.includes('query StatisticsUatSnapshot')) {
      data = {
        latest: codes.map((code) => outcome(code, '54975', opts.unknown)),
        territory: {
          nodes: opts.unknown
            ? []
            : [
                {
                  code: '54975',
                  siruta_code: '54975',
                  level: 'LAU',
                  name_ro: 'Cluj-Napoca',
                  parent_code: 'CJ',
                  parent_name_ro: 'Cluj',
                },
              ],
        },
      }
    } else if (query.includes('query InsTerritories')) {
      const filter = variables.filter as { levels?: string[]; search?: string }
      const offset = Number(variables.offset ?? 0),
        limit = Number(variables.limit ?? 20)
      const all = filter.levels?.includes('NUTS3')
        ? counties.map((c) => ({
            code: c.code,
            level: c.level,
            name_ro: c.name,
          }))
        : filter.search
          ? [
              {
                code: '54975',
                siruta_code: '54975',
                level: 'LAU',
                name_ro: 'Cluj-Napoca',
                parent_code: 'CJ',
                parent_name_ro: 'Cluj',
              },
            ]
          : []
      data = {
        insTerritories: {
          nodes: all.slice(offset, offset + limit),
          pageInfo: {
            totalCount: all.length,
            hasNextPage: offset + limit < all.length,
            hasPreviousPage: offset > 0,
          },
        },
      }
    } else {
      await route.fulfill({
        json: { errors: [{ message: 'Unexpected test operation' }] },
      })
      return
    }
    await route.fulfill({ json: { data } })
  })
  return {
    calls,
    recoverTiles: () => {
      tileFailure = false
    },
  }
}
for (const language of ['en', 'ro'] as const)
  for (const width of [390, 1440]) {
    test.describe(`${language} ${width} native landing`, () => {
      test.use({ viewport: { width, height: 1000 } })
      test.beforeEach(async ({ context, page, baseURL }) => {
        await context.addCookies([
          { name: 'user-locale', value: language, url: baseURL! },
        ])
        await page.addInitScript(
          (value) => localStorage.setItem('user-locale', value),
          language,
        )
      })
      test('renders complete source pages, exact values, provenance and comparison links', async ({
        page,
      }, info) => {
        const { calls } = await mock(page)
        await page.goto('/statistici')
        const section = page.locator(
          'section[aria-labelledby="landing-decade-heading"]',
        )
        await expect(section).toContainText(
          language === 'en' ? '42 of 42' : '42 din 42',
          { timeout: 20000 },
        )
        await expect(section).toContainText('90.000')
        await expect(section).toContainText('-10.0%')
        const tile = page
          .locator('a[href*="/statistici/seturi/POP107D"]')
          .filter({ hasText: '12345678901234567890.012300' })
          .first()
        await expect(tile).toBeVisible()
        const href = (await tile.getAttribute('href'))!
        expect(parseParam(href, 'teritoriu')).toBe('cod:RO')
        expect(parseParam(href, 'clasificari')).toEqual(['D0:0', 'D1:110'])
        expect(parseParam(href, 'unitate')).toBe('0')
        const link = page.getByRole('link', {
          name: language === 'en' ? 'Open comparison' : 'Deschide comparația',
          exact: true,
        })
        await expect(link).toBeVisible()
        expect(
          parseParam((await link.getAttribute('href'))!, 'teritorii'),
        ).toEqual(['cod:RO', 'cod:CJ', 'siruta:54975'])
        expect(parseParam((await link.getAttribute('href'))!, 'perioada')).toBe(
          '2025',
        )
        expect(
          calls.filter((c) => c.query.includes('query InsLandingTiles')),
        ).toHaveLength(1)
        expect(
          calls.filter(
            (c) =>
              c.query.includes('query InsTerritories') &&
              (c.variables.filter as { levels?: string[] }).levels?.includes(
                'NUTS3',
              ),
          ),
        ).toHaveLength(3)
        expect(
          calls.filter(
            (c) =>
              c.query.includes('query InsSourceObservations') &&
              c.variables.datasetCode === 'POP107D',
          ),
        ).toHaveLength(4)
        await section.locator('summary').click()
        await expect(section).toContainText('a'.repeat(64))
        await page.screenshot({
          path: info.outputPath('native-landing.png'),
          fullPage: true,
        })
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true)
      })
      test('keeps incomplete rankings visible without excluding the missing county silently', async ({
        page,
      }) => {
        await mock(page, { missingCounty: true })
        await page.goto('/statistici')
        const section = page.locator(
          'section[aria-labelledby="landing-decade-heading"]',
        )
        await expect(section).toContainText(
          language === 'en' ? '41 of 42' : '41 din 42',
          { timeout: 20000 },
        )
        await expect(section).toContainText(
          language === 'en'
            ? 'ranking is unavailable'
            : 'Clasamentul este indisponibil',
        )
        await expect(section.getByRole('listitem')).toContainText('Alba')
        await expect(
          section.getByRole('heading', {
            name:
              language === 'en'
                ? 'Largest increases'
                : 'Cele mai mari creșteri',
          }),
        ).toHaveCount(0)
        await expect(
          page.getByRole('link', {
            name: language === 'en' ? 'Open comparison' : 'Deschide comparația',
            exact: true,
          }),
        ).toBeVisible()
      })
      test('propagates a failed tile read to county without a false selection claim and recovers', async ({
        page,
      }) => {
        const state = await mock(page, { tileFailure: true })
        await page.goto('/statistici')
        await expect(
          page.getByRole('link', {
            name: language === 'en' ? 'Open comparison' : 'Deschide comparația',
            exact: true,
          }),
        ).toBeVisible({ timeout: 20000 })
        await expect(
          page.getByText(
            language === 'en'
              ? "This section's data could not be read."
              : 'Datele acestei secțiuni nu au putut fi citite.',
          ),
        ).toBeVisible()
        await expect(
          page.getByText(
            language === 'en'
              ? 'No eligible shared source selection is available for this comparison.'
              : 'Nu există o selecție comună eligibilă pentru această comparație.',
          ),
        ).toHaveCount(0)
        expect(
          state.calls.filter(
            (c) =>
              c.query.includes('query InsSourceObservations') &&
              c.variables.datasetCode === 'POP107D',
          ),
        ).toHaveLength(0)
        state.recoverTiles()
        await page
          .getByRole('button', {
            name: language === 'en' ? 'Retry' : 'Reîncearcă',
            exact: true,
          })
          .first()
          .click()
        await expect(
          page.locator('section[aria-labelledby="landing-decade-heading"]'),
        ).toContainText(language === 'en' ? '42 of 42' : '42 din 42')
      })
      test('keeps source status evidence visible while withholding the county ranking', async ({
        page,
      }) => {
        await mock(page, { flagged: true })
        await page.goto('/statistici')
        const section = page.locator(
          'section[aria-labelledby="landing-decade-heading"]',
        )
        await expect(section).toContainText(
          language === 'en'
            ? 'Value has an INS status flag'
            : 'Valoare cu marcaj INS',
          { timeout: 20000 },
        )
        await expect(
          section.getByText(language === 'en' ? /INS status:/ : /Marcaj INS:/),
        ).toHaveCount(2)
        await expect(section).not.toContainText('-10.0%')
      })
      test('deep-linked local tiles have no unsupported national share and unknown identity recovers to national', async ({
        page,
      }) => {
        await mock(page, { unknown: true })
        await page.goto('/statistici?loc=%2254975%22')
        await expect(
          page.getByText(
            language === 'en'
              ? /No INS territory matches/
              : /Nu am găsit un teritoriu INS/,
          ),
        ).toBeVisible({ timeout: 20000 })
        await expect(
          page.getByRole('heading', {
            name: language === 'en' ? 'Romania in figures' : 'România în cifre',
            exact: true,
          }),
        ).toBeVisible()
        await expect(page.getByText(/din totalul României/)).toHaveCount(0)
      })
    })
  }
