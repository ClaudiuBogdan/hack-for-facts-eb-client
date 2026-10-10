import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { FeatureCollection, Polygon } from 'geojson'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  companyMetricKind,
  companyMetricUnit,
  type CompanyAnalysisBreakdown,
  type CompanyAnalysisBucket,
  type CompanyAnalysisMetric,
} from '@/schemas/company-analytics'
import type { CompanyHubSearch } from '@/schemas/private-company-search'
import { breakdownFixture, bucket, recordsFixture, releaseFixture, releaseRef, seriesFixture, statsFixture } from '../../api/company-analytics.fixture'
import { readCompanyHubForSsr } from '../../api/company-hub-analytics'
import { CompanyAnalyticsSeedContext, createSeedStore } from '../../hooks/use-company-analytics'
import { PrivateCompanyHubPage } from './private-company-hub-page'

/**
 * The hub against a scripted analytics API: every figure is ONE release's —
 * the active one, resolved once — and its default fiscal year, each section
 * its own read pinned to it; nothing asks the registry, its hub stats or its
 * county profile. One section that fails says so beside the others; a
 * release the API refuses, on any read, withdraws every figure of it and
 * only the reader moves on; the server render seeds the page and the browser
 * reads nothing again. Only the transport is replaced: the answers go
 * through the real parsing, plans, keys and refusal tracking.
 */

interface Call {
  readonly op: string
  readonly variables: Record<string, unknown>
}

const router = vi.hoisted(() => ({ navigate: vi.fn() }))

const api = vi.hoisted(() => ({
  calls: [] as Call[],
  active: '7',
  refuse: (() => false) as (call: Call) => boolean,
  fail: (() => false) as (call: Call) => boolean,
  unavailable: (() => false) as (call: Call) => boolean,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    params,
    preload: _preload,
    resetScroll: _resetScroll,
    hash: _hash,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly search?: unknown
    readonly params?: unknown
    readonly preload?: unknown
    readonly resetScroll?: unknown
    readonly hash?: unknown
  }) => (
    <a href={to} data-search={JSON.stringify(search ?? {})} data-params={JSON.stringify(params ?? {})} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => router.navigate,
  useLocation: () => ({ hash: '' }),
}))

vi.mock('@/features/entity-search/api/entity-search-api.live', () => ({ searchEntitiesLive: vi.fn() }))

const square = (x: number, y: number, size: number) => [
  [x, y],
  [x + size, y],
  [x + size, y + size],
  [x, y + size],
  [x, y],
]

const COUNTIES: FeatureCollection<Polygon, { name: string; mnemonic: string }> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Cluj', mnemonic: 'CJ' }, geometry: { type: 'Polygon', coordinates: [square(23, 46, 1)] } },
    { type: 'Feature', properties: { name: 'Vaslui', mnemonic: 'VS' }, geometry: { type: 'Polygon', coordinates: [square(27, 46, 1)] } },
    { type: 'Feature', properties: { name: 'București', mnemonic: 'B' }, geometry: { type: 'Polygon', coordinates: [square(26, 44.4, 0.3)] } },
  ],
}

vi.mock('@/hooks/useGeoJson', () => ({ useGeoJsonData: () => ({ data: COUNTIES, isError: false, refetch: vi.fn() }) }))

/** The main activities: one of a published revision with its catalogue label, one whose revision ANAF did not publish. */
const CAEN: CompanyAnalysisBreakdown = breakdownFixture({
  dimension: 'MAIN_CAEN',
  groups: [
    bucket('GROUP', 'rev2:4711', '700.00', { caen: { code: '4711', revision: 'rev2', basis: 'REVISION_KNOWN', label: 'Comerț cu amănuntul' }, labelSource: 'current_db_catalog' }),
    bucket('GROUP', '6201', '200.00', { caen: { code: '6201', revision: null, basis: 'REVISION_UNKNOWN', label: null } }),
  ],
})

const SIZES: CompanyAnalysisBreakdown = breakdownFixture({
  dimension: 'EMPLOYEE_SIZE',
  groups: [bucket('GROUP', 'FROM_250', '600.00', { filers: '2' }), bucket('GROUP', 'FROM_1_TO_9', '400.00', { filers: '18' })],
  other: bucket('OTHER', null, null, { groups: 0, companies: '0', filers: '0' }),
  totals: bucket('TOTAL', null, '1000.00', { filers: '20', companies: '40' }),
})

/** The answer's buckets in the metric the read asked for, as the API sums them. */
function breakdownFor(variables: Record<string, unknown>): CompanyAnalysisBreakdown {
  const metric = (variables.metric as CompanyAnalysisMetric | undefined) ?? 'TURNOVER'
  const base = variables.dimension === 'MAIN_CAEN' ? CAEN : variables.dimension === 'EMPLOYEE_SIZE' ? SIZES : breakdownFixture()
  const inMetric = (group: CompanyAnalysisBucket): CompanyAnalysisBucket =>
    group.metric ? { ...group, metric: { ...group.metric, metric, unit: companyMetricUnit(metric), kind: companyMetricKind(metric) } } : group
  return {
    ...base,
    metric,
    rankBy: variables.rankBy as CompanyAnalysisBreakdown['rankBy'],
    rankedBy: variables.rankBy as CompanyAnalysisBreakdown['rankBy'],
    groups: base.groups.map(inMetric),
    other: inMetric(base.other),
    unknown: inMetric(base.unknown),
    totals: inMetric(base.totals),
  }
}

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: (_document: string, variables: Record<string, unknown>, options: { readonly operationName: string }) => {
      const call = { op: options.operationName, variables }
      api.calls.push(call)
      if (api.unavailable(call)) return Promise.reject(new actual.GraphQLRequestError('unavailable', { graphQLErrors: [{ message: 'unavailable', extensions: { code: 'SERVICE_UNAVAILABLE' } }] }))
      if (api.refuse(call)) return Promise.reject(new actual.GraphQLRequestError('refused', { graphQLErrors: [{ message: 'refused', extensions: { code: 'INVALID_INPUT', field: 'release' } }] }))
      if (api.fail(call)) return Promise.reject(new Error('network down'))
      const release = releaseRef(String(variables.release ?? api.active), { publishedAt: null })
      switch (call.op) {
        case 'CompanyAnalysisRelease':
          return Promise.resolve({ companyAnalysisRelease: releaseFixture({ release }) })
        case 'CompanyAnalysisStats':
          return Promise.resolve({ companyAnalysisStats: statsFixture({ release }) })
        case 'CompanyAnalysisRecords':
          return Promise.resolve({ companyAnalysisRecords: recordsFixture({ release, sortMetric: (variables.sortMetric as CompanyAnalysisMetric | undefined) ?? null }) })
        case 'CompanyAnalysisBreakdown':
          return Promise.resolve({ companyAnalysisBreakdown: { ...breakdownFor(variables), release } })
        case 'CompanyAnalysisSeries':
          return Promise.resolve({ companyAnalysisSeries: seriesFixture({ release }) })
        default:
          // Anything else — the registry, its hub stats, a county profile — is not the hub's to ask.
          return Promise.reject(new Error(`unexpected operation ${call.op}`))
      }
    },
  }
})

type Seed = readonly { readonly key: readonly unknown[]; readonly data: unknown }[]

function tree(client: QueryClient, search: CompanyHubSearch, seed: Seed) {
  return (
    <QueryClientProvider client={client}>
      <CompanyAnalyticsSeedContext value={createSeedStore(seed)}>
        <PrivateCompanyHubPage search={search} />
      </CompanyAnalyticsSeedContext>
    </QueryClientProvider>
  )
}

/** The app's retry rules stand (the hooks set them); a retry is immediate, so a failure is said at once. */
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } })

function renderHub(search: CompanyHubSearch = {}, seed: Seed = []) {
  const client = newClient()
  const view = render(tree(client, search, seed))
  return { client, view }
}

const ANALYTICS_OPS = ['CompanyAnalysisRelease', 'CompanyAnalysisStats', 'CompanyAnalysisBreakdown', 'CompanyAnalysisSeries', 'CompanyAnalysisRecords']
const figures = () => within(screen.getByTestId('company-hub-figures'))
const band = (id: string) => within(document.getElementById(id)!)
const loaded = async () => {
  await screen.findByTestId('company-hub-leaders')
  await screen.findByTestId('company-hub-sectors')
  await screen.findByTestId('company-hub-county-map')
  await screen.findByTestId('company-hub-trend')
  await figures().findByText('965,213')
}
const dataSearch = (element: Element) => JSON.parse(element.getAttribute('data-search') ?? '{}') as Record<string, unknown>

beforeEach(() => {
  router.navigate.mockReset()
  api.calls = []
  api.active = '7'
  api.refuse = () => false
  api.fail = () => false
  api.unavailable = () => false
})

describe('PrivateCompanyHubPage', () => {
  it('reads the analytics release once and each section pinned to it — never the hub stats, the registry or a county profile', async () => {
    renderHub()
    await loaded()
    const ops = api.calls.map((call) => call.op)
    expect(ops.every((op) => ANALYTICS_OPS.includes(op))).toBe(true)
    expect(ops.filter((op) => op === 'CompanyAnalysisRelease')).toHaveLength(1)
    expect(api.calls.find((call) => call.op === 'CompanyAnalysisRelease')?.variables).toEqual({})
    // Six sections, each read once, each pinned to the release and its default year.
    const sections = api.calls.filter((call) => call.op !== 'CompanyAnalysisRelease')
    expect(sections).toHaveLength(6)
    expect(sections.every((call) => call.variables.release === '7' && (call.variables.scope as { fiscalYear?: number }).fiscalYear === 2024)).toBe(true)
    expect(sections.filter((call) => call.op === 'CompanyAnalysisBreakdown').map((call) => call.variables.dimension).sort()).toEqual(['COUNTY', 'EMPLOYEE_SIZE', 'MAIN_CAEN'])
    expect(api.calls.find((call) => call.op === 'CompanyAnalysisSeries')?.variables).toMatchObject({ cohortMode: 'EACH_YEAR', metric: 'TURNOVER', fromYear: 2008, toYear: 2025 })
  })

  it('shows the year’s national figures in the API’s digits, and names the year’s coverage, the release and its ONRC edition', async () => {
    renderHub()
    await loaded()
    const turnover = document.querySelector('[data-figure="TURNOVER"]')!
    expect(turnover).toHaveTextContent('9,007,199.3mld. lei')
    expect(turnover.getAttribute('title')).toMatch(/^9,007,199,254,741,973\.32\slei$/u)
    expect(dataSearch(within(turnover as HTMLElement).getByRole('link'))).toEqual({ an: 2024, editie: 7, indicator: 'turnover', clasare: 'suma' })
    // The companies with a statement open as that very list.
    const filers = document.querySelector('[data-figure="filers"]') as HTMLElement
    expect(dataSearch(within(filers).getByRole('link'))).toEqual({ an: 2024, editie: 7, indicator: 'turnover', clasare: 'suma', depunere: 'da' })
    // Nothing reported: said as such, never a 0. Reported as zero: 0.
    expect(document.querySelector('[data-figure="EMPLOYEES"] dd')?.textContent).toBe('—')
    expect(document.querySelector('[data-figure="EMPLOYEES"]')).toHaveTextContent('nicio firmă nu a raportat o valoare')
    expect(document.querySelector('[data-figure="NET_RESULT"] dd')?.textContent).toBe('0lei')
    expect(document.querySelector('[data-figure="filers"]')).toHaveTextContent('din 2,718,250 firme eligibile din registru, în orice stare')
    const source = screen.getByTestId('company-hub-source')
    expect(source).toHaveTextContent('Anul fiscal 2024: 965,213 situații financiare')
    expect(source).toHaveTextContent('Valorile lipsă sau reținute nu intră în sume și nu sunt socotite zero.')
    expect(source).toHaveTextContent('ediția 7')
    expect(within(source).getByTestId('companies-analytics-source-edition')).toHaveTextContent('ediția ONRC 41')
  })

  it('ranks the largest companies, a held value by its status and an unnamed company as such, each opening its profile', async () => {
    renderHub()
    const leaders = within(await screen.findByTestId('company-hub-leaders'))
    expect(leaders.getByText('Firma 1')).toBeInTheDocument()
    expect(leaders.getByText('reținut: semnal de calitate')).toBeInTheDocument()
    expect(leaders.getByText('Fără denumire publică · CUI 3')).toBeInTheDocument()
    expect(leaders.getAllByText(/6201 \(revizie necunoscută\)/u).length).toBeGreaterThan(0)
    expect(JSON.parse(leaders.getAllByRole('link')[0]!.getAttribute('data-params') ?? '{}')).toEqual({ cui: '1' })
    expect(dataSearch(screen.getByRole('link', { name: 'Toate firmele, în analiza bilanțurilor →' }))).toEqual({ an: 2024, editie: 7, indicator: 'turnover', clasare: 'suma' })
  })

  it('lists main activities in their own revision — an unknown one kept unknown — with shares of the year’s total and the size bands beside', async () => {
    renderHub()
    const sectors = within(await screen.findByTestId('company-hub-sectors'))
    expect(sectors.getByText('4711 · Comerț cu amănuntul')).toBeInTheDocument()
    expect(sectors.getByText('CAEN rev2')).toBeInTheDocument()
    expect(sectors.getByText('6201 (revizie necunoscută)')).toBeInTheDocument()
    expect(sectors.getByText('70.0%')).toBeInTheDocument()
    expect(sectors.getByText(/Nu sunt activitățile autorizate în registrul comerțului\./u)).toBeInTheDocument()
    // The folded groups come with the full list.
    fireEvent.click(sectors.getByRole('button', { name: 'Toată lista' }))
    expect(screen.getByTestId('company-hub-sectors-other')).toHaveTextContent('Alte 1 activități')
    const sizes = within(await screen.findByTestId('company-hub-sizes'))
    expect(sizes.getAllByRole('row').map((row) => row.textContent)).toEqual(['FirmeCifra de afaceri', '1–9 salariați90.0%40.0%', '250 de salariați sau mai mulți10.0%60.0%'])
    expect(dataSearch(band('domenii').getByRole('link', { name: 'Deschide în analiza bilanțurilor →' }))).toEqual({ an: 2024, editie: 7, indicator: 'turnover', clasare: 'suma', vedere: 'defalcare', dupa: 'caen' })
  })

  it('maps the counties by their exact figures and lists the companies without a common county apart', async () => {
    renderHub()
    const map = within(await screen.findByTestId('company-hub-county-map'))
    expect(map.getByText('România')).toBeInTheDocument()
    // At rest, the year's total: every company, those without a common county included.
    expect(screen.getByTestId('company-hub-county-readout')).toHaveTextContent('România1,000 lei')
    expect(within(screen.getByTestId('company-hub-county-rank')).getAllByRole('link').map((row) => row.textContent)).toEqual(['01București700', '02Cluj200'])
    expect(screen.getByTestId('company-hub-county-outside')).toHaveTextContent('Fără județ comun — valori diferite în înscrieri')
    expect(screen.getByTestId('company-hub-county-outside')).toHaveTextContent('Alte 1 grupuri')
    // Vaslui has no value in the answer: hatched and named, never zero.
    expect(screen.getByTestId('company-hub-county-missing')).toHaveTextContent('Vaslui')
    fireEvent.pointerEnter(map.getByRole('link', { name: /Cluj/u }), { pointerType: 'mouse' })
    expect(within(screen.getByTestId('company-hub-county-readout')).getByText('20.0% din total')).toBeInTheDocument()
    // A county opens the analysis's list of the companies the map counted there: pinned, with a statement, by the county the edition agrees on.
    const drill = { an: 2024, editie: 7, indicator: 'turnover', clasare: 'suma', judet: 'CJ', depunere: 'da' }
    expect(map.getByRole('link', { name: /Cluj/u })).toHaveAttribute('href', '/companies/analytics')
    expect(dataSearch(map.getByRole('link', { name: /Cluj/u }))).toEqual(drill)
    const rankCluj = within(screen.getByTestId('company-hub-county-rank')).getByRole('link', { name: /Cluj/u })
    expect(rankCluj).toHaveAttribute('href', '/companies/analytics')
    expect(dataSearch(rankCluj)).toEqual(drill)
    expect(dataSearch(band('judete').getByRole('link', { name: 'Deschide în analiza bilanțurilor →' }))).toEqual({ an: 2024, editie: 7, indicator: 'turnover', clasare: 'suma', vedere: 'defalcare' })
  })

  it('links the companies-with-a-statement layer by that ranking, never the release’s default sum', async () => {
    renderHub({ indicator: 'firme', domenii: 'firme' })
    await loaded()
    expect(dataSearch(band('judete').getByRole('link', { name: 'Deschide în analiza bilanțurilor →' }))).toEqual({ an: 2024, editie: 7, indicator: 'turnover', clasare: 'depuneri', vedere: 'defalcare' })
    expect(dataSearch(band('domenii').getByRole('link', { name: 'Deschide în analiza bilanțurilor →' }))).toEqual({ an: 2024, editie: 7, indicator: 'turnover', clasare: 'depuneri', vedere: 'defalcare', dupa: 'caen' })
    expect(dataSearch(within(screen.getByTestId('company-hub-county-rank')).getByRole('link', { name: /Cluj/u }))).toMatchObject({ clasare: 'depuneri', judet: 'CJ', depunere: 'da' })
  })

  it('draws every fiscal year of the release, a year without values as a gap with its reason', async () => {
    renderHub()
    const trend = await screen.findByTestId('company-hub-trend')
    const bars = within(trend).getAllByRole('button')
    expect(bars).toHaveLength(4)
    expect(bars[1]).toHaveAttribute('data-gap', 'true')
    expect(bars[1]).toHaveAccessibleName('2009: indicatorul nu e admis pentru acest an')
    expect(bars[3]).toHaveAccessibleName('2011: nicio valoare raportată')
    // A reported zero is no gap and no bar: zero height, a mark on the zero line.
    expect(bars[2]).not.toHaveAttribute('data-gap')
    expect(bars[2]).toHaveAccessibleName(/^2010: 0\.00\slei/u)
    const zero = bars[2]!.querySelector('[data-zero]') as HTMLElement
    expect(zero).not.toBeNull()
    expect(zero.style.height).toBe('')
    expect(zero.className).toContain('h-0')
    expect(dataSearch(band('ani').getByRole('link', { name: 'Deschide în analiza bilanțurilor →' }))).toEqual({
      an: 2024,
      editie: 7,
      indicator: 'turnover',
      clasare: 'suma',
      vedere: 'evolutie',
      cohorta: 'fiecare-an',
    })
  })

  it('keeps a section that failed to itself: its retry beside the others’ figures', async () => {
    let failing = true
    api.fail = (call) => failing && call.op === 'CompanyAnalysisBreakdown' && call.variables.dimension === 'COUNTY'
    renderHub()
    await screen.findByTestId('company-hub-sectors')
    expect(await band('judete').findByText('Cifrele nu s-au încărcat.')).toBeInTheDocument()
    // Every other section stands.
    expect(figures().getByText('965,213')).toBeInTheDocument()
    expect(screen.getByTestId('company-hub-leaders')).toBeInTheDocument()
    expect(await screen.findByTestId('company-hub-trend')).toBeInTheDocument()
    expect(screen.queryByTestId('company-hub-county-map')).toBeNull()
    failing = false
    fireEvent.click(band('judete').getByRole('button', { name: 'Încearcă din nou' }))
    expect(await screen.findByTestId('company-hub-county-map')).toBeInTheDocument()
  })

  it('withdraws every figure of a release the API refuses on any read, and moves on only when the reader asks', async () => {
    api.refuse = (call) => call.variables.release === '7' && call.op === 'CompanyAnalysisSeries'
    renderHub()
    expect(await screen.findByText('Ediția 7 a analizei nu mai este disponibilă')).toBeInTheDocument()
    for (const id of ['company-hub-figures', 'company-hub-leaders', 'company-hub-sectors', 'company-hub-sizes', 'company-hub-county-map', 'company-hub-trend']) expect(screen.queryByTestId(id)).toBeNull()
    expect(screen.queryByText('965,213')).toBeNull()
    // The ways in stay: the search, the shortcuts, the places to start.
    expect(screen.getByRole('link', { name: 'Achiziții publice' })).toBeInTheDocument()
    expect(screen.getByText('De aici poți începe')).toBeInTheDocument()
    // A refusal is not retried, and nothing is read in the release's place.
    expect(api.calls.filter((call) => call.op === 'CompanyAnalysisSeries')).toHaveLength(1)
    expect(api.calls.filter((call) => call.op === 'CompanyAnalysisRelease')).toHaveLength(1)

    api.active = '8'
    const before = api.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Deschide ediția curentă' }))
    await loaded()
    const after = api.calls.slice(before)
    expect(after[0]).toMatchObject({ op: 'CompanyAnalysisRelease', variables: {} })
    expect(after.slice(1).every((call) => call.variables.release === '8')).toBe(true)
    expect(screen.queryByText('Ediția 7 a analizei nu mai este disponibilă')).toBeNull()
  })

  it('says an analytics service that cannot answer as such — never a zero — and keeps the ways in', async () => {
    api.unavailable = (call) => call.op === 'CompanyAnalysisRelease'
    renderHub()
    expect(await screen.findByText('Analiza firmelor nu este disponibilă acum')).toBeInTheDocument()
    expect(screen.queryByTestId('company-hub-figures')).toBeNull()
    expect(screen.queryByText(/^0$/u)).toBeNull()
    expect(screen.getByText('De aici poți începe')).toBeInTheDocument()
    expect(api.calls.every((call) => call.op === 'CompanyAnalysisRelease')).toBe(true)
  })

  it('reads the choices the address holds, and writes a new one in the address', async () => {
    renderHub({ clasament: 'salariati', domenii: 'firme', indicator: 'salariati' })
    await loaded()
    expect(api.calls.find((call) => call.op === 'CompanyAnalysisRecords')?.variables).toMatchObject({ sortMetric: 'EMPLOYEES' })
    const breakdown = (dimension: string) => api.calls.find((call) => call.op === 'CompanyAnalysisBreakdown' && call.variables.dimension === dimension)?.variables
    expect(breakdown('MAIN_CAEN')).toMatchObject({ rankBy: 'FILERS' })
    expect(breakdown('COUNTY')).toMatchObject({ metric: 'EMPLOYEES', rankBy: 'METRIC_SUM' })
    expect(screen.getByTestId('company-hub-sizes')).toHaveTextContent('Firme')
    expect(screen.getByTestId('company-hub-sizes')).not.toHaveTextContent('Cifra de afaceri')

    const layers = screen.getByRole('radiogroup', { name: 'Indicatorul de pe hartă' })
    expect(within(layers).getByRole('radio', { name: 'Salariați' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(layers).getByRole('radio', { name: 'Cifra de afaceri' }))
    const move = router.navigate.mock.calls[0]?.[0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown>; readonly replace: boolean }
    expect(move.replace).toBe(true)
    // The default is not written; the other choices and the site's keys stay.
    expect(move.search({ indicator: 'salariati', clasament: 'salariati', lang: 'en' })).toEqual({ indicator: undefined, clasament: 'salariati', lang: 'en' })
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Domeniile după' })).getByRole('radio', { name: 'Salariați' }))
    const sectors = router.navigate.mock.calls[1]?.[0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown> }
    expect(sectors.search({})).toEqual({ domenii: 'salariati' })
  })

  it('keeps the site’s search, scoped to companies', async () => {
    renderHub()
    await loaded()
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })
})

describe('PrivateCompanyHubPage — the server render', () => {
  it('renders the release’s figures from the loader’s seed, and the browser reads nothing again', async () => {
    const read = await readCompanyHubForSsr({})
    expect(read.complete).toBe(true)
    const html = renderToStaticMarkup(tree(newClient(), {}, read.seed))
    for (const text of ['965,213', '9,007,199.3', 'Firma 1', '4711 · Comerț cu amănuntul', 'Anul fiscal 2024', 'company-hub-county-map', 'company-hub-trend']) expect(html).toContain(text)

    api.calls = []
    renderHub({}, read.seed)
    // Hydrated from the seed: everything is there on the first render.
    expect(figures().getByText('965,213')).toBeInTheDocument()
    expect(screen.getByTestId('company-hub-leaders')).toBeInTheDocument()
    expect(screen.getByTestId('company-hub-county-map')).toBeInTheDocument()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(api.calls).toEqual([])
  })

  it('renders no figure of a release refused on the server — the browser reads, and says the refusal', async () => {
    api.refuse = (call) => call.op === 'CompanyAnalysisStats'
    const read = await readCompanyHubForSsr({})
    expect(read).toEqual({ seed: [], complete: false })
    const html = renderToStaticMarkup(tree(newClient(), {}, read.seed))
    expect(html).not.toContain('965,213')
    expect(html).not.toContain('Firma 1')
    expect(html).toContain('Economia')
    renderHub({}, read.seed)
    expect(await screen.findByText('Ediția 7 a analizei nu mai este disponibilă')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByTestId('company-hub-figures')).toBeNull())
  })
})
