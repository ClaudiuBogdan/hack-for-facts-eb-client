import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SAFE_SPENDING_ITEM, SPENDING_PARTS, TOTAL_ITEMS, viewOfYear } from '@/features/national-budget/home/lib/home-data'
import { partName } from '@/features/national-budget/home/lib/home-format'
import { perResident } from '@/features/national-budget/home/lib/per-resident'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { budgetNationalCatalogSchema, type BudgetNationalCatalog } from '@/schemas/national-budget-api'
import {
  SPENDING_PART_LABELS,
  askedYearOf,
  buildNationalBudgetShareImageResponseHeaders,
  buildNationalBudgetShareImageViewModel,
  handleNationalBudgetShareImageRequest,
  readNationalBudgetShareFacts,
  sharePeriodText,
  shareLangOf,
  type NationalBudgetShareFacts,
} from './national-budget-share-image'

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()),
  graphqlQuery: vi.fn(),
}))

const NBSP = '\u00a0'
const SNAPSHOT = 'e1.share-image-test'

/** A catalog that passes the API's schema: bulletins from January 2006 to September 2026. */
const catalog: BudgetNationalCatalog = budgetNationalCatalogSchema.parse({
  snapshots: { approved: 'a1.test', execution: SNAPSHOT },
  approved: { editions: [], totals: [] },
  execution: {
    coverage: { firstMonth: '2006-01', lastMonth: '2026-09', calendarMonthCount: 249, selectedMonthCount: 249, missingMonths: [], note: '' },
    seriesItems: [],
  },
})

const E = (key: string) => `mfin.bgc.expenditure.${key}`

/** 2025 as the dev API serves it (snapshot e1.fe393d8b64562ac4d4925039fff5bd97). */
const VALUES_2025: Readonly<Record<string, string>> = {
  [TOTAL_ITEMS.spending]: '808731414960.09985',
  [TOTAL_ITEMS.balance]: '-146033241858.74988',
  [E('social_assistance')]: '250878858021.00002',
  [E('personnel')]: '167715883910',
  [E('goods_services')]: '100634391118',
  [E('nonfinancial_assets')]: '63961295094.999994',
  [E('interest')]: '50498241738.189994',
  [E('external_grant_projects')]: '47211241948.999996',
  [E('eu_2014_2020_modernisation_projects')]: '14311419593.910003',
  [E('pnrr_grant_projects')]: '28748537346.000012',
  [E('pnrr_loan_projects')]: '13720288186.999998',
  [E('other_transfers')]: '36611489714.000003',
}

/** Test values (not the API's) for the other periods the reads touch. */
const VALUES_BY_DATE: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  '2025': VALUES_2025,
  '2024': {
    [TOTAL_ITEMS.spending]: '727316168300.94974',
    [TOTAL_ITEMS.balance]: '-152717412186.84975',
    [E('personnel')]: '150000000000',
    [E('social_assistance')]: '220000000000',
    [E('interest')]: '40000000000',
    [E('goods_services')]: '90000000000',
  },
  '2026-09': {
    [TOTAL_ITEMS.spending]: '600000000000',
    [TOTAL_ITEMS.balance]: '-90000000000',
    [E('social_assistance')]: '190000000000',
    [E('personnel')]: '130000000000',
    [E('goods_services')]: '75000000000',
    [SAFE_SPENDING_ITEM]: '100000000',
  },
  // 2012: the bulletins don't finish it (no value, a reason).
}

type GridInput = {
  readonly itemIds: readonly string[]
  readonly basis: string
  readonly period: { readonly type: string; readonly selection: { readonly dates: readonly string[] } }
}

function gridAnswer(input: GridInput, snapshot: string) {
  const dates = input.period.selection.dates
  return {
    budgetNationalExecutionSeries: {
      snapshot,
      results: input.itemIds.map((itemId) => {
        const data = dates.flatMap((date) => {
          const value = VALUES_BY_DATE[date]?.[itemId]
          return value === undefined ? [] : [{ date, value }]
        })
        return {
          item: { itemId },
          component: 'general_consolidated_budget',
          basis: input.basis,
          unit: 'RON',
          series: { data },
          periods: dates.map((date) => {
            const available = data.some((point) => point.date === date)
            return {
              date,
              periodStart: `${date.slice(0, 4)}-01-01`,
              periodEnd: `${date.slice(0, 4)}-12-31`,
              status: available ? 'AVAILABLE' : 'UNAVAILABLE',
              reason: available ? null : 'missing_selected_release',
              valueBasis: available ? 'REPORTED_CUMULATIVE' : null,
            }
          }),
        }
      }),
    },
  }
}

function answerGraphql({ catalogRead = () => ({ budgetNationalCatalog: catalog }) }: { readonly catalogRead?: () => unknown } = {}) {
  vi.mocked(graphqlQuery).mockImplementation((async (
    _query: string,
    variables?: Record<string, unknown>,
    options?: { readonly operationName?: string },
  ) => {
    switch (options?.operationName) {
      case 'budgetNationalCatalog':
        return catalogRead()
      case 'budgetNationalExecutionSeries':
        return gridAnswer((variables as { input: GridInput }).input, String((variables as { expectedSnapshot: string }).expectedSnapshot))
      default:
        throw new Error(`Unexpected national budget read ${options?.operationName}`)
    }
  }) as typeof graphqlQuery)
}

/** The grid reads made, by request: basis, period type, dates, items and the snapshot asserted. */
const gridReads = () =>
  vi
    .mocked(graphqlQuery)
    .mock.calls.filter(([, , options]) => options?.operationName === 'budgetNationalExecutionSeries')
    .map(([, variables]) => {
      const { input, expectedSnapshot } = variables as { input: GridInput; expectedSnapshot: string }
      return { basis: input.basis, type: input.period.type, dates: input.period.selection.dates, itemIds: input.itemIds, expectedSnapshot }
    })

function makeFacts(overrides: Partial<NationalBudgetShareFacts> & { readonly year?: number } = {}): NationalBudgetShareFacts {
  const { year = 2025, ...rest } = overrides
  const view = viewOfYear(catalog, year)
  const values = VALUES_BY_DATE[view.label] ?? {}
  return {
    snapshot: SNAPSHOT,
    view,
    spending: values[TOTAL_ITEMS.spending] ?? null,
    balance: values[TOTAL_ITEMS.balance] ?? null,
    parts: SPENDING_PARTS.flatMap((itemId) => (values[itemId] ? [{ itemId, exact: values[itemId] }] : [])),
    ...rest,
  }
}

describe('the share card request', () => {
  it('reads the year as the page route does and the language as ro unless en', () => {
    expect(askedYearOf('2024')).toBe(2024)
    expect(askedYearOf('2024.5')).toBeUndefined()
    expect(askedYearOf('abc')).toBeUndefined()
    expect(askedYearOf('')).toBeUndefined()
    expect(askedYearOf(null)).toBeUndefined()
    expect(askedYearOf('1990')).toBeUndefined()
    expect(shareLangOf('en')).toBe('en')
    expect(shareLangOf('ro')).toBe('ro')
    expect(shareLangOf('fr')).toBe('ro')
    expect(shareLangOf(null)).toBe('ro')
  })
})

describe('buildNationalBudgetShareImageViewModel', () => {
  it('draws 2025 as the page does: the share per resident, the part borrowed, the three largest lines', () => {
    const viewModel = buildNationalBudgetShareImageViewModel(makeFacts(), 'ro')

    expect(viewModel).toEqual({
      brand: 'Transparenta.eu · Bugetul național',
      period: '2025',
      headline: 'Partea ta din cheltuielile statului',
      figure: `42.468${NBSP}lei`,
      note: `pe locuitor, din care 7.669${NBSP}lei deficit bugetar (cash)`,
      lines: [
        { label: 'Asistență socială', value: `13.174${NBSP}lei` },
        { label: 'Cheltuieli de personal', value: `8.807${NBSP}lei` },
        { label: 'Bunuri și servicii', value: `5.285${NBSP}lei` },
      ],
    })
  })

  it('says it in English with English grouping for lang=en', () => {
    const viewModel = buildNationalBudgetShareImageViewModel(makeFacts(), 'en')

    expect(viewModel).toEqual({
      brand: 'Transparenta.eu · National budget',
      period: '2025',
      headline: 'Your share of public spending',
      figure: `42,468${NBSP}lei`,
      note: `per resident, of which 7,669${NBSP}lei cash budget deficit`,
      lines: [
        { label: 'Social assistance', value: `13,174${NBSP}lei` },
        { label: 'Staff costs', value: `8,807${NBSP}lei` },
        { label: 'Goods and services', value: `5,285${NBSP}lei` },
      ],
    })
  })

  it("rounds the page's per-resident value to whole lei, never cuts it", () => {
    // 2025: 19,043,151 residents; 1,000.6 and 1,000.4 lei each.
    const up = makeFacts({ spending: '19054576890.6', balance: null, parts: [] })
    const down = makeFacts({ spending: '19050768260.4', balance: null, parts: [] })

    expect(buildNationalBudgetShareImageViewModel(up, 'ro').figure).toBe(`1.001${NBSP}lei`)
    expect(buildNationalBudgetShareImageViewModel(down, 'ro').figure).toBe(`1.000${NBSP}lei`)
    const pageFigure = Math.round(perResident(VALUES_2025[TOTAL_ITEMS.spending], 2025) ?? Number.NaN)
    expect(buildNationalBudgetShareImageViewModel(makeFacts(), 'en').figure).toBe(`${pageFigure.toLocaleString('en-GB')}${NBSP}lei`)
  })

  it('has no borrowed clause in a surplus year, nor without a printed balance', () => {
    for (const balance of ['12000000000.5', '0', null]) {
      const facts = makeFacts({ balance })
      expect(buildNationalBudgetShareImageViewModel(facts, 'ro').note).toBe('pe locuitor')
      expect(buildNationalBudgetShareImageViewModel(facts, 'en').note).toBe('per resident')
    }
  })

  it('names the year in progress by its months, in either language', () => {
    const facts = makeFacts({ year: 2026 })

    expect(facts.view).toMatchObject({ partial: true, label: '2026-09' })
    expect(buildNationalBudgetShareImageViewModel(facts, 'ro').period).toBe('ianuarie–septembrie 2026')
    expect(buildNationalBudgetShareImageViewModel(facts, 'en').period).toBe('January–September 2026')
    expect(sharePeriodText({ year: 2026, partial: true, month: '2026-01' }, 'ro')).toBe('ianuarie 2026')
  })

  it('draws a card without figures when nothing could be read, or the year has no spending', () => {
    for (const facts of [null, makeFacts({ spending: null })]) {
      const viewModel = buildNationalBudgetShareImageViewModel(facts, 'ro')
      expect(viewModel).toMatchObject({ figure: '—', note: 'Date indisponibile momentan', period: '', lines: [] })
    }
    expect(buildNationalBudgetShareImageViewModel(null, 'en').note).toBe('Data unavailable right now')
  })

  it('names every spending line as the page does in its source language', () => {
    for (const itemId of SPENDING_PARTS) {
      const sourceLanguage = itemId === SAFE_SPENDING_ITEM ? 'en' : 'ro'
      expect(SPENDING_PART_LABELS[itemId]?.[sourceLanguage], itemId).toBe(partName(itemId))
      expect(SPENDING_PART_LABELS[itemId]?.en, itemId).toBeTruthy()
    }
    expect(SPENDING_PART_LABELS[SAFE_SPENDING_ITEM]?.ro).toBe('Programul SAFE')
  })
})

describe('readNationalBudgetShareFacts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads the asked year with the page input: its basis and period, under the catalog snapshot', async () => {
    answerGraphql()

    const facts = await readNationalBudgetShareFacts(2024)

    expect(facts?.view.year).toBe(2024)
    expect(facts?.snapshot).toBe(SNAPSHOT)
    expect(facts?.spending).toBe('727316168300.94974')
    expect(facts?.balance).toBe('-152717412186.84975')
    const reads = gridReads()
    // Fourteen lines (SAFE left out: this catalog does not offer it): two requests of at most twelve.
    expect(reads.map((read) => read.itemIds.length)).toEqual([12, 2])
    expect(reads.flatMap((read) => read.itemIds)).toEqual([TOTAL_ITEMS.spending, TOTAL_ITEMS.balance, ...SPENDING_PARTS.filter((id) => id !== SAFE_SPENDING_ITEM)])
    for (const read of reads) expect(read).toMatchObject({ basis: 'FULL_YEAR', type: 'YEAR', dates: ['2023', '2024'], expectedSnapshot: SNAPSHOT })
  })

  it('reads SAFE from the v2 catalog and keeps it as a separate spending line', async () => {
    const v2: BudgetNationalCatalog = {
      ...catalog,
      execution: {
        ...catalog.execution,
        seriesItems: [{ itemId: SAFE_SPENDING_ITEM, section: 'EXPENDITURE', sourceLabel: 'cheltuieli aferente planului safe', relatedScopeItemId: null }],
      },
    }
    answerGraphql({ catalogRead: () => ({ budgetNationalCatalog: v2 }) })

    const facts = await readNationalBudgetShareFacts(2026)

    expect(gridReads().map((read) => read.itemIds.length)).toEqual([12, 3])
    expect(facts?.parts).toContainEqual({ itemId: SAFE_SPENDING_ITEM, exact: '100000000' })
    expect(facts?.spending).toBe('600000000000')
  })

  it('reads the default year for a year the page does not offer', async () => {
    for (const asked of [undefined, 1990, 2031]) {
      vi.clearAllMocks()
      answerGraphql()
      const facts = await readNationalBudgetShareFacts(asked)
      expect(facts?.view.year).toBe(2025)
      expect(facts?.spending).toBe(VALUES_2025[TOTAL_ITEMS.spending])
      expect(gridReads()[0]).toMatchObject({ basis: 'FULL_YEAR', type: 'YEAR', dates: ['2024', '2025'] })
    }
  })

  it('reads the year in progress from 1 January against the same months a year earlier', async () => {
    answerGraphql()

    const facts = await readNationalBudgetShareFacts(2026)

    expect(facts?.view).toMatchObject({ year: 2026, partial: true, label: '2026-09' })
    expect(facts?.spending).toBe('600000000000')
    expect(gridReads()[0]).toMatchObject({ basis: 'YTD', type: 'MONTH', dates: ['2025-09', '2026-09'] })
  })

  it('opens the default year for a year without its 1 January population, as the page does', async () => {
    const later = { ...catalog, execution: { ...catalog.execution, coverage: { ...catalog.execution.coverage, lastMonth: '2027-02' } } }
    answerGraphql({ catalogRead: () => ({ budgetNationalCatalog: later }) })

    const facts = await readNationalBudgetShareFacts(2027)

    expect(facts?.view).toMatchObject({ year: 2026, partial: false })
    expect(gridReads()[0]).toMatchObject({ basis: 'FULL_YEAR', type: 'YEAR', dates: ['2025', '2026'] })
  })

  it('opens the default year for a full year the bulletins do not finish, as the page does', async () => {
    answerGraphql()

    const facts = await readNationalBudgetShareFacts(2012)

    expect(facts?.view.year).toBe(2025)
    expect(facts?.spending).toBe(VALUES_2025[TOTAL_ITEMS.spending])
    expect(gridReads().map((read) => read.dates)).toEqual([
      ['2011', '2012'],
      ['2011', '2012'],
      ['2024', '2025'],
      ['2024', '2025'],
    ])
  })

  it('reads no facts when the API fails', async () => {
    answerGraphql({
      catalogRead: () => {
        throw new Error('API down')
      },
    })

    expect(await readNationalBudgetShareFacts(2025)).toBeNull()
    expect(gridReads()).toEqual([])
  })

  it('gives up at its deadline instead of holding the request open', async () => {
    vi.mocked(graphqlQuery).mockImplementation(((
      _query: string,
      _variables?: Record<string, unknown>,
      options?: { readonly signal?: AbortSignal },
    ) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(options.signal?.reason))
      })) as typeof graphqlQuery)

    expect(await readNationalBudgetShareFacts(2025, 10)).toBeNull()
  })
})

describe('handleNationalBudgetShareImageRequest', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes the asked year to the reads, and none for an unreadable one', async () => {
    const render = vi.fn().mockResolvedValue(png)
    const readFacts = vi.fn().mockResolvedValue(null)

    await handleNationalBudgetShareImageRequest(new Request('https://transparenta.eu/national-budget/share-image.png?an=2024'), { render, readFacts })
    await handleNationalBudgetShareImageRequest(new Request('https://transparenta.eu/national-budget/share-image.png?an=nope'), { render, readFacts })
    await handleNationalBudgetShareImageRequest(new Request('https://transparenta.eu/national-budget/share-image.png'), { render, readFacts })

    expect(readFacts.mock.calls).toEqual([[2024], [undefined], [undefined]])
  })

  it('serves a cacheable card and renders it once per snapshot, year and language', async () => {
    const render = vi.fn().mockResolvedValue(png)
    const facts = makeFacts({ snapshot: 'e1.render-once' })
    const readFacts = vi.fn().mockResolvedValue(facts)

    const first = await handleNationalBudgetShareImageRequest(new Request('https://transparenta.eu/national-budget/share-image.png?an=2025'), { render, readFacts })
    const second = await handleNationalBudgetShareImageRequest(new Request('https://transparenta.eu/national-budget/share-image.png'), { render, readFacts })
    const english = await handleNationalBudgetShareImageRequest(new Request('https://transparenta.eu/national-budget/share-image.png?lang=en'), { render, readFacts })

    for (const response of [first, second, english]) {
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('image/png')
      expect(response.headers.get('cache-control')).toBe('public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400')
      expect(response.headers.get('cdn-cache-control')).toBe('max-age=3600, stale-while-revalidate=86400')
    }
    expect(render).toHaveBeenCalledTimes(2)
    expect(render.mock.calls[0]?.[0]).toMatchObject({ figure: `42.468${NBSP}lei`, headline: 'Partea ta din cheltuielile statului' })
    expect(render.mock.calls[1]?.[0]).toMatchObject({ figure: `42,468${NBSP}lei`, headline: 'Your share of public spending' })
  })

  it('serves an uncached card without figures when the API fails', async () => {
    answerGraphql({
      catalogRead: () => {
        throw new Error('API down')
      },
    })
    const render = vi.fn().mockResolvedValue(png)

    const response = await handleNationalBudgetShareImageRequest(new Request('https://transparenta.eu/national-budget/share-image.png?an=2025'), { render })

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('cdn-cache-control')).toBeNull()
    expect(render.mock.calls[0]?.[0]).toMatchObject({ figure: '—', note: 'Date indisponibile momentan' })
  })

  it('answers 503, uncached, when rendering fails', async () => {
    const response = await handleNationalBudgetShareImageRequest(new Request('https://transparenta.eu/national-budget/share-image.png'), {
      render: vi.fn().mockRejectedValue(new Error('no fonts')),
      readFacts: async () => makeFacts({ snapshot: 'e1.render-fails' }),
    })

    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('draws a real 1200 × 630 PNG with the Romanian letters', async () => {
    const response = await handleNationalBudgetShareImageRequest(new Request('https://transparenta.eu/national-budget/share-image.png?an=2025'), {
      readFacts: async () => makeFacts({ snapshot: 'e1.real-render' }),
    })
    const bytes = new Uint8Array(await response.arrayBuffer())
    const view = new DataView(bytes.buffer)

    expect(response.status).toBe(200)
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect(view.getUint32(16)).toBe(1200)
    expect(view.getUint32(20)).toBe(630)
  }, 20_000)
})

describe('buildNationalBudgetShareImageResponseHeaders', () => {
  it('builds cacheable and fallback response headers', () => {
    expect(buildNationalBudgetShareImageResponseHeaders({ cacheable: true })).toMatchObject({
      'content-type': 'image/png',
      'cdn-cache-control': expect.stringContaining('max-age=3600'),
    })
    expect(buildNationalBudgetShareImageResponseHeaders({ cacheable: false })).toEqual({
      'content-type': 'image/png',
      'cache-control': 'no-store',
    })
  })
})
