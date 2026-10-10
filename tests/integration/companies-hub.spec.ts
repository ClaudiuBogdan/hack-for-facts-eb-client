/**
 * Integration tests for the /companies hub on the companies analytics API:
 * every figure is ONE release's — the active one — and its default fiscal
 * year, each section its own read pinned to it; nothing asks the registry,
 * its hub stats or its county profile. A section that fails says so beside
 * the others; a release the API refuses withdraws every figure of it, and
 * only the reader moves on. The choices live in the address; the search asks
 * the index for companies only; the legacy `/companies?q=` deep link still
 * reaches the directory.
 *
 * Fixture isolation: the page renders its figures on the server from the API
 * the server is given, which no browser mock reaches. So each test that
 * asserts on scripted figures opens the hub by a client-side navigation from
 * `/public-enterprises` (a page that reads no API): the hub's loader then
 * returns at once and every read goes through the routes below. The server
 * render itself is covered by the unit tests, on a scripted transport.
 *
 * GraphQL is mocked: the analytics operations (and the directory's, for the
 * links that open it) are answered here by a route registered after the
 * fixture layer's, so it runs first and falls back to the fixtures
 * (tests/fixtures/companies-hub-flow/) for the search index and `CompanyResolve`.
 */

import type { Page } from '@playwright/test'
import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

// ───────────────────────────────────────────────── analytics answers (v2) ──

const SOURCE = {
  editionId: '41',
  publicationEpoch: '3',
  sourceSnapshotId: 'onrc-2026-09-30',
  sourcePublishedAt: '2026-09-30',
  interpretationVersion: 'onrc-edition-v1',
  privacyPolicyVersion: 'onrc-privacy-v1',
  dimensionPolicyVersion: 'onrc-dimensions-v1',
  eligibilityPolicyVersion: 'public-legal-person-v1',
}
const ref = (releaseId: string) => ({ releaseId, publishedAt: '2026-10-02T12:00:00Z', active: true, source: SOURCE })
const YEARS = [2022, 2023, 2024]
const coverage = (reported: string) => ({ reported, missing: '10', notAdmitted: '0', heldProfile: '0', heldObservation: '0', heldQuality: '2', heldComponent: '0' })
const UNITS = { TURNOVER: ['RON', 'FLOW'], EMPLOYEES: ['HEADCOUNT', 'HEADCOUNT'], NET_RESULT: ['RON', 'FLOW'] } as const
type Metric = keyof typeof UNITS
const aggregate = (metric: Metric, sum: string | null, contributors: string) => ({
  metric,
  unit: UNITS[metric][0],
  kind: UNITS[metric][1],
  sum,
  contributors,
  mean: sum,
  coverage: coverage(contributors),
})

const release = (releaseId: string) => ({
  release: ref(releaseId),
  publicationId: '3',
  schemaVersion: 'companies-analytics-ch-v2',
  populationPolicyVersion: 'public-onrc-edition-legal-person-v2',
  admissionPolicyVersion: 'admission-v1',
  admissionPolicySha256: null,
  inputSnapshotAt: null,
  companies: '3214',
  companyYears: '7000',
  fiscalYears: YEARS,
  years: YEARS.map((fiscalYear) => ({
    fiscalYear,
    statements: '2431',
    metrics: (['TURNOVER', 'EMPLOYEES', 'NET_RESULT'] as const).map((metric) => ({ metric, offered: true, coverage: coverage('2400') })),
    sizeBands: [],
  })),
  metrics: (['TURNOVER', 'EMPLOYEES', 'NET_RESULT'] as const).map((metric) => ({ metric, unit: UNITS[metric][0], kind: UNITS[metric][1], offeredYears: YEARS })),
  dimensions: [{ dimension: 'COUNTY', yearScoped: false, labelSource: 'territory_hub' }],
  defaults: { fiscalYear: 2024, metric: 'TURNOVER', cohortMode: 'EACH_YEAR', rankBy: 'METRIC_SUM', topN: 10, recordSort: 'METRIC', direction: 'DESC', pageSize: 25 },
  asOf: [],
  nameFilter: false,
  limits: {
    maxSelectedCuis: 500,
    maxCounties: 60,
    maxUats: 500,
    maxLegalForms: 30,
    maxObservedStatuses: 60,
    maxCaenCodes: 200,
    maxFinancialRanges: 6,
    maxMetrics: 21,
    maxRecordMetrics: 8,
    defaultTopN: 10,
    maxTopN: 100,
    defaultPageSize: 25,
    maxPageSize: 100,
  },
  caveats: [],
})

const answer = (releaseId: string) => ({ release: ref(releaseId), scope: { fiscalYear: 2024 }, scopeHash: 'h', fiscalYear: 2024, caveats: [] })

const stats = (releaseId: string) => ({
  ...answer(releaseId),
  companies: '3214',
  filers: '2431',
  nonFilers: '783',
  metrics: [aggregate('TURNOVER', '1234567890123.45', '2400'), aggregate('NET_RESULT', '-1200.50', '2300'), aggregate('EMPLOYEES', '45678', '2200')],
})

type Bucket = Record<string, unknown>
const bucket = (metric: Metric, kind: string, key: string | null, sum: string | null, extra: Bucket = {}): Bucket => ({
  kind,
  key,
  label: null,
  labelSource: null,
  basis: null,
  caen: null,
  groups: 1,
  companies: '10',
  filers: '5',
  metric: aggregate(metric, sum, sum === null ? '0' : '5'),
  ...extra,
})

function breakdown(releaseId: string, variables: Record<string, unknown>) {
  const metric = (variables.metric as Metric | undefined) ?? 'TURNOVER'
  const groups =
    variables.dimension === 'MAIN_CAEN'
      ? [
          bucket(metric, 'GROUP', 'rev2:4711', '700.00', { caen: { code: '4711', revision: 'rev2', basis: 'REVISION_KNOWN', label: 'Comerț cu amănuntul' }, labelSource: 'current_db_catalog' }),
          bucket(metric, 'GROUP', '6201', '200.00', { caen: { code: '6201', revision: null, basis: 'REVISION_UNKNOWN', label: null } }),
        ]
      : variables.dimension === 'EMPLOYEE_SIZE'
        ? [bucket(metric, 'GROUP', 'FROM_1_TO_9', '400.00', { filers: '18' }), bucket(metric, 'GROUP', 'FROM_250', '600.00', { filers: '2' })]
        : [
            bucket(metric, 'GROUP', 'B', '700.00', { label: 'București', labelSource: 'territory_hub' }),
            bucket(metric, 'GROUP', 'CJ', '200.00', { label: 'Cluj', labelSource: 'territory_hub' }),
            bucket(metric, 'GROUP', '(multiple_values)', '100.00', { basis: 'MULTIPLE_VALUES' }),
          ]
  return {
    ...answer(releaseId),
    dimension: variables.dimension,
    metric,
    groupCount: groups.length,
    rankBy: variables.rankBy,
    rankedBy: variables.rankBy,
    topN: variables.topN,
    groups,
    other: bucket(metric, 'OTHER', null, null, { groups: 0, companies: '0', filers: '0' }),
    unknown: bucket(metric, 'UNKNOWN', null, null, { groups: 0, companies: '0', filers: '0' }),
    totals: bucket(metric, 'TOTAL', null, '1000.00', { groups: groups.length, companies: '40', filers: '20' }),
  }
}

const series = (releaseId: string) => ({
  ...answer(releaseId),
  metric: 'TURNOVER',
  unit: 'RON',
  kind: 'FLOW',
  cohortMode: 'EACH_YEAR',
  referenceYear: null,
  cohortCompanies: null,
  fromYear: 2022,
  toYear: 2024,
  points: [
    { fiscalYear: 2022, available: true, gapReason: null, companies: '3214', filers: '2300', metric: aggregate('TURNOVER', '1000000000000.00', '2200') },
    { fiscalYear: 2023, available: false, gapReason: 'NOT_ADMITTED', companies: '3214', filers: '2400', metric: aggregate('TURNOVER', null, '0') },
    { fiscalYear: 2024, available: true, gapReason: null, companies: '3214', filers: '2431', metric: aggregate('TURNOVER', '1234567890123.45', '2400') },
  ],
})

const recordNode = (cui: string, name: string | null, value: string) => ({
  cui,
  currentName: name,
  legalForm: 'SA',
  legalFormBasis: 'SINGLE_OBSERVATION',
  county: { code: 'B', label: 'București', labelSource: 'territory_hub' },
  countyBasis: 'SINGLE_OBSERVATION',
  uat: null,
  uatBasis: 'MISSING',
  observedStatus: { code: '1048', label: 'funcțiune', labelSource: 'api_nomenclature' },
  observedStatusBasis: 'SINGLE_OBSERVATION',
  observedStatusCoverage: 'COMPLETE',
  onrcCaenCoverage: 'COMPLETE',
  onrcRecordedDate: null,
  onrcRecordedYear: null,
  onrcRecordedDateBasis: 'MISSING',
  vatPayer: 'YES',
  fiscallyInactive: 'NO',
  mainCaen: { code: '0610', revision: 'rev2', basis: 'REVISION_KNOWN', label: 'Extracția petrolului brut' },
  filed: true,
  employeeSizeBand: 'FROM_250',
  values: [{ metric: 'TURNOVER', value, status: 'REPORTED' }],
})

const records = (releaseId: string, variables: Record<string, unknown>) => ({
  ...answer(releaseId),
  sort: 'METRIC',
  sortMetric: variables.sortMetric ?? 'TURNOVER',
  direction: 'DESC',
  totalCount: '2',
  edges: [
    { cursor: 'c1', node: recordNode('1590082', 'OMV PETROM SA', '51234567890.12') },
    { cursor: 'c2', node: recordNode('14399840', 'DANTE INTERNATIONAL SA', '9876543210.00') },
  ],
  pageInfo: { hasNextPage: false, endCursor: 'c2' },
})

// ──────────────────────────────────────────────────────────── transport ──

interface AnalyticsApi {
  /** The release the API serves as active. */
  active: string
  /** Reads the API refuses for their release (withdrawn since). */
  refuse: (operation: string, variables: Record<string, unknown>) => boolean
  /** Reads that fail for another reason. */
  fail: (operation: string, variables: Record<string, unknown>) => boolean
  readonly operations: { readonly name: string; readonly variables: Record<string, unknown> }[]
}

/** The operation a request asks for: the transports send the document, not an operation name. */
function operationOf(body: string | null): { readonly name: string | undefined; readonly variables: Record<string, unknown> } {
  try {
    const { query, variables } = JSON.parse(body ?? '{}') as { query?: string; variables?: Record<string, unknown> }
    return { name: /\b(?:query|mutation)\s+(\w+)/.exec(query ?? '')?.[1], variables: variables ?? {} }
  } catch {
    return { name: undefined, variables: {} }
  }
}

const graphqlError = (message: string, extensions: Record<string, unknown>) => ({ errors: [{ message, extensions }], data: null })

/** Answers the analytics operations, recording every operation the page asks for; everything else falls back to the fixtures. */
async function serveAnalytics(page: Page, api: AnalyticsApi): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.fallback()
    const { name, variables } = operationOf(request.postData())
    if (!name) return route.fallback()
    api.operations.push({ name, variables })
    if (!name.startsWith('CompanyAnalysis')) return route.fallback()
    const releaseId = String(variables.release ?? api.active)
    if (api.refuse(name, variables)) return route.fulfill({ json: graphqlError('release refused', { code: 'INVALID_INPUT', field: 'release' }) })
    if (api.fail(name, variables)) return route.fulfill({ json: graphqlError('internal error', { code: 'INTERNAL_SERVER_ERROR' }) })
    switch (name) {
      case 'CompanyAnalysisRelease':
        return route.fulfill({ json: { data: { companyAnalysisRelease: release(releaseId) } } })
      case 'CompanyAnalysisStats':
        return route.fulfill({ json: { data: { companyAnalysisStats: stats(releaseId) } } })
      case 'CompanyAnalysisBreakdown':
        return route.fulfill({ json: { data: { companyAnalysisBreakdown: breakdown(releaseId, variables) } } })
      case 'CompanyAnalysisSeries':
        return route.fulfill({ json: { data: { companyAnalysisSeries: series(releaseId) } } })
      case 'CompanyAnalysisRecords':
        return route.fulfill({ json: { data: { companyAnalysisRecords: records(releaseId, variables) } } })
      default:
        return route.fallback()
    }
  })
}

async function setupMocks(mockApi: MockApiFixture): Promise<void> {
  // The hub's field is the landing search pinned to `docTypes: ['company']`.
  await mockApi.mockGraphQL('SearchEntities', 'search-entities-dante')
  await mockApi.mockGraphQL('CompanyResolve', 'resolve-dante', {
    variables: { q: 'dante' },
  })
  await mockApi.mockGraphQL('CompanyResolve', 'resolve')
}

/** The hub, opened by a client-side navigation: its loader returns at once, and every read is the browser's (and these mocks'). */
async function openHub(page: Page): Promise<void> {
  await page.goto('/public-enterprises')
  await waitForPageReady(page)
  await page.locator('a[href="/companies"]').first().click()
  await expect(page).toHaveURL(/\/companies$/u, { timeout: 30000 })
}

const RETIRED_OPERATIONS = ['CompanyHubStats', 'CompanyRegistry', 'CompanyGroupProfile', 'CompanyCountyProfile']

test.describe('Companies hub', () => {
  let api: AnalyticsApi

  test.beforeEach(async ({ mockApi, page }) => {
    api = { active: '7', refuse: () => false, fail: () => false, operations: [] }
    await setupMocks(mockApi)
    await serveAnalytics(page, api)
  })

  test('shows the release’s figures and sections, read from the analytics API only — pinned to one release', async ({ page }) => {
    await openHub(page)

    const figures = page.getByTestId('company-hub-figures')
    await expect(figures).toContainText('Firme cu situație financiară pe 2024', { timeout: 30000 })
    await expect(figures).toContainText('2.431')
    await expect(page.locator('[data-figure="TURNOVER"]')).toContainText('mld. lei')
    await expect(page.getByTestId('company-hub-source')).toContainText('Anul fiscal 2024')
    await expect(page.getByTestId('company-hub-source')).toContainText('ediția ONRC 41')
    await expect(page.getByTestId('company-hub-leaders')).toContainText('OMV PETROM SA')
    await expect(page.getByTestId('company-hub-sectors')).toContainText('6201 (revizie necunoscută)')
    await expect(page.getByTestId('company-hub-county-rank')).toContainText('București')
    await expect(page.getByTestId('company-hub-county-outside')).toContainText('Fără județ comun')
    await expect(page.getByTestId('company-hub-trend')).toBeVisible()

    const companyOperations = api.operations.filter((operation) => operation.name.startsWith('Company'))
    for (const retired of RETIRED_OPERATIONS) expect(companyOperations.map((operation) => operation.name)).not.toContain(retired)
    expect(companyOperations.every((operation) => operation.name.startsWith('CompanyAnalysis'))).toBe(true)
    expect(companyOperations.filter((operation) => operation.name === 'CompanyAnalysisRelease')).toHaveLength(1)
    expect(companyOperations.filter((operation) => operation.name !== 'CompanyAnalysisRelease').every((operation) => operation.variables.release === '7')).toBe(true)
  })

  test('a section that fails says so beside the others, and its retry reads it again', async ({ page }) => {
    let failing = true
    api.fail = (name, variables) => failing && name === 'CompanyAnalysisBreakdown' && variables.dimension === 'COUNTY'
    await openHub(page)

    const counties = page.locator('section#judete')
    await expect(counties).toContainText('Cifrele nu s-au încărcat.', { timeout: 30000 })
    await expect(page.getByTestId('company-hub-figures')).toContainText('2.431')
    await expect(page.getByTestId('company-hub-sectors')).toBeVisible()
    await expect(page.getByTestId('company-hub-leaders')).toBeVisible()

    failing = false
    await counties.getByRole('button', { name: 'Încearcă din nou' }).click()
    await expect(page.getByTestId('company-hub-county-rank')).toContainText('București', { timeout: 30000 })
  })

  test('a release the API refuses withdraws every figure of it, and only the reader moves on', async ({ page }) => {
    api.refuse = (name, variables) => name === 'CompanyAnalysisStats' && variables.release === '7'
    await openHub(page)

    await expect(page.getByText('Ediția 7 a analizei nu mai este disponibilă')).toBeVisible({ timeout: 30000 })
    for (const id of ['company-hub-figures', 'company-hub-leaders', 'company-hub-sectors', 'company-hub-county-map', 'company-hub-trend']) {
      await expect(page.getByTestId(id)).toHaveCount(0)
    }
    await expect(page.getByTestId('company-hub-start')).toBeVisible()

    api.active = '8'
    await page.getByRole('button', { name: 'Deschide ediția curentă' }).click()
    await expect(page.getByTestId('company-hub-figures')).toContainText('2.431', { timeout: 30000 })
    const after = api.operations.filter((operation) => operation.name.startsWith('CompanyAnalysis') && operation.name !== 'CompanyAnalysisRelease' && operation.variables.release === '8')
    expect(after.length).toBeGreaterThan(0)
  })

  test('the map’s measure is a choice in the address, read for the year', async ({ page }) => {
    await openHub(page)
    await expect(page.getByTestId('company-hub-county-rank')).toBeVisible({ timeout: 30000 })

    await page.getByRole('radiogroup', { name: 'Indicatorul de pe hartă' }).getByRole('radio', { name: 'Salariați' }).click()
    await expect(page).toHaveURL(/indicator=salariati/u)
    await expect
      .poll(() => api.operations.some((operation) => operation.name === 'CompanyAnalysisBreakdown' && operation.variables.dimension === 'COUNTY' && operation.variables.metric === 'EMPLOYEES'))
      .toBe(true)
  })

  test('a county opens the pinned list of the companies the map counted there, and the filers layer links by its own ranking', async ({ page }) => {
    await openHub(page)
    const rank = page.getByTestId('company-hub-county-rank')
    await expect(rank).toContainText('București', { timeout: 30000 })

    const params = async (link: ReturnType<Page['locator']>) => Object.fromEntries(new URL((await link.getAttribute('href')) ?? '', 'http://hub.test').searchParams)
    const county = rank.getByRole('link', { name: /București/u })
    expect(new URL((await county.getAttribute('href')) ?? '', 'http://hub.test').pathname).toBe('/companies/analytics')
    expect(await params(county)).toEqual({ an: '2024', editie: '7', indicator: 'turnover', clasare: 'suma', judet: 'B', depunere: 'da' })

    await page.getByRole('radiogroup', { name: 'Indicatorul de pe hartă' }).getByRole('radio', { name: 'Firme cu situație' }).click()
    await expect(page).toHaveURL(/indicator=firme/u)
    const overview = page.locator('section#judete').getByRole('link', { name: 'Deschide în analiza bilanțurilor →' })
    await expect.poll(async () => (await params(overview)).clasare).toBe('depuneri')
    expect(await params(overview)).toEqual({ an: '2024', editie: '7', indicator: 'turnover', clasare: 'depuneri', vedere: 'defalcare' })
  })

  test('the search asks the index for companies only, and typing navigates nowhere', async ({ page }) => {
    await openHub(page)

    const requests: string[] = []
    page.on('request', (request) => {
      const body = request.postData()
      if (body?.includes('SearchEntities')) requests.push(body)
    })

    await page.getByRole('combobox').first().fill('dante')
    await expect(page.getByRole('option', { name: /DANTE INTERNATIONAL/ })).toBeVisible({ timeout: 30000 })

    // The scope is sent to the server, not applied to a mixed page of hits.
    expect(requests.some((body) => body.includes('"company"'))).toBe(true)
    // Typing is not a commit: the reader is still on the hub.
    await expect(page).toHaveURL(/\/companies$/)
  })

  test('picking a result opens that company profile', async ({ page }) => {
    await openHub(page)

    await page.getByRole('combobox').first().fill('dante')
    await page.getByRole('option', { name: /DANTE INTERNATIONAL/ }).click()

    await expect(page).toHaveURL(/\/companies\/14399840/, { timeout: 30000 })
  })
})

// ─────────────────────────────────────────── the directory (legacy link) ──

const EDITION_7 = {
  source: 'onrc',
  state: 'PUBLISHED',
  editionId: '7',
  sourceSnapshotId: 'firme-7',
  sourcePublishedAt: '2026-09-30',
  interpretationVersion: 'onrc-interp-v1',
  dimensionPolicyVersion: 'onrc-dim-v1',
  eligibilityPolicyVersion: 'onrc-elig-v1',
  publicationEpoch: '3',
  accessEpoch: '11',
  reason: null,
  scopeKey: 'onrc:published:7:3:11',
}

const companyNode = (cui: string, name: string) => ({
  cui,
  orgId: cui,
  name,
  nameSource: 'ONRC_EDITION',
  legalForm: 'SA',
  headlineStatus: { code: '1048', label: 'funcțiune', labelSource: 'API_NOMENCLATURE' },
  county: 'București',
  vatPayer: true,
  declaredFiscallyInactive: false,
  registrationDate: '2001-07-19',
  registrationDatePresent: true,
  registryCuiState: 'IN_EDITION',
  hasActiveObservation: true,
  statusBasis: 'SINGLE_OBSERVATION',
  countyBasis: 'SINGLE_OBSERVATION',
  recordedDateBasis: 'SINGLE_OBSERVATION',
})

/** The directory's registry-bound reads, answered under one edition: the page a legacy link lands on. */
async function serveDirectory(page: Page): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.fallback()
    const { name } = operationOf(request.postData())
    if (name === 'CompanyRegistry') {
      return route.fulfill({
        json: { data: { companyRegistry: { registry: EDITION_7, editions: [], registryFilterFields: ['status', 'county', 'caenCode', 'onrcCaen'], caenRevisions: ['rev0', 'rev1', 'rev2', 'rev3'] } } },
      })
    }
    if (name === 'CompaniesSearch') {
      const node = companyNode('14399840', 'DANTE INTERNATIONAL SA')
      return route.fulfill({
        json: { data: { companies: { edges: [{ cursor: `c-${node.cui}`, node }], pageInfo: { hasNextPage: false, endCursor: null }, totalCount: 1, totalEstimated: false, registry: EDITION_7 } } },
      })
    }
    return route.fallback()
  })
}

test.describe('Companies hub — the legacy address', () => {
  test('a legacy /companies?q= deep link redirects to the directory', async ({ mockApi, page }) => {
    await setupMocks(mockApi)
    await serveDirectory(page)
    await page.goto('/companies?q=dante')

    await expect(page).toHaveURL(/\/companies\/search/, { timeout: 30000 })
    expect(new URL(page.url()).searchParams.get('q')).toBe('dante')
    await expect(page.getByTestId('company-search-results')).toContainText('DANTE INTERNATIONAL SA')
  })
})
