/**
 * Integration tests for the /companies hub under the ONRC edition contract:
 * the server HTML carries no registry figure (the publicly cached page can
 * hold none past a withdrawal) and no retired business figure; in the
 * browser every figure is `companyHubStats` of the edition the page pinned
 * from its own `companyRegistry` read, with that edition named; a registry
 * that cannot answer is a state, never a zero; the figures open the
 * directory; the search asks the index for companies only; and the legacy
 * `/companies?q=` deep link still reaches the directory.
 *
 * GraphQL is mocked. The registry-bound operations (CompanyRegistry,
 * CompanyHubStats, CompaniesSearch, CompanyGroupProfile) are answered here in
 * the API19 shape — each answer carries its registry envelope — by a route
 * registered after the fixture layer's, so it runs first and falls back to the
 * fixtures (tests/fixtures/companies-hub-flow/) for the search index and
 * `CompanyResolve`.
 */

import type { Page } from '@playwright/test'
import { test, expect } from '../utils/integration-base'
import { waitForPageReady } from '../utils/test-helpers'
import type { MockApiFixture } from '../utils/types'

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

const UNPUBLISHED = {
  ...EDITION_7,
  state: 'UNPUBLISHED',
  editionId: null,
  sourceSnapshotId: null,
  sourcePublishedAt: null,
  eligibilityPolicyVersion: null,
  publicationEpoch: null,
  reason: 'no accessible published edition',
  scopeKey: 'onrc:unpublished:-:-:11',
}

type Envelope = typeof EDITION_7 | typeof UNPUBLISHED

const capabilities = (registry: Envelope) => ({
  companyRegistry: {
    registry,
    editions: [],
    registryFilterFields: ['status', 'county', 'caenCode', 'onrcCaen'],
    caenRevisions: ['rev0', 'rev1', 'rev2', 'rev3'],
  },
})

const hubStats = (registry: Envelope) => ({
  companyHubStats: {
    totalCompanies: 3_214,
    activeCompanies: 2_431,
    statusMix: [
      { key: '1048', label: 'funcțiune', count: 2_514, basis: null },
      { key: '(multiple_values)', label: null, count: 300, basis: 'MULTIPLE_VALUES' },
      { key: '(not_in_edition)', label: null, count: 400, basis: 'NOT_IN_EDITION' },
    ],
    topCounties: [
      { key: 'B', label: 'București', count: 801, basis: null },
      { key: 'CJ', label: 'Cluj', count: 512, basis: null },
    ],
    caenDivisions: [
      { key: 'rev2:47', label: null, count: 1_203, basis: null },
      { key: 'rev0:52', label: null, count: 707, basis: null },
    ],
    coverage: { territoryMatched: null, territoryUnmatched: null },
    registry,
    computedAt: '2026-10-04T08:00:00.000Z',
  },
})

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

const companiesPage = (registry: Envelope, nodes: readonly ReturnType<typeof companyNode>[]) => ({
  companies: {
    edges: nodes.map((node) => ({ cursor: `c-${node.cui}`, node })),
    pageInfo: { hasNextPage: false, endCursor: null },
    totalCount: nodes.length,
    totalEstimated: false,
    registry,
  },
})

const countyProfile = (registry: Envelope) => ({
  companyCountyProfile: {
    groupBy: 'COUNTY',
    denominator: 2_431,
    groups: [
      { key: 'B', label: 'București', count: 801, basis: null },
      { key: 'CJ', label: 'Cluj', count: 512, basis: null },
    ],
    registry,
  },
})

/** The operation a request asks for: the transports send the document, not an operation name. */
function operationOf(body: string | null): { readonly name: string | undefined; readonly variables: Record<string, unknown> } {
  try {
    const { query, variables } = JSON.parse(body ?? '{}') as { query?: string; variables?: Record<string, unknown> }
    return { name: /\b(?:query|mutation)\s+(\w+)/.exec(query ?? '')?.[1], variables: variables ?? {} }
  } catch {
    return { name: undefined, variables: {} }
  }
}

/** Answers the registry-bound operations under one registry; everything else falls back to the fixtures. */
async function serveRegistry(page: Page, registry: Envelope): Promise<void> {
  await page.route('**/graphql', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') return route.fallback()
    const { name, variables } = operationOf(request.postData())
    switch (name) {
      case 'CompanyRegistry':
        return route.fulfill({ json: { data: capabilities(registry) } })
      case 'CompanyHubStats':
        return route.fulfill({ json: { data: hubStats(registry) } })
      case 'CompanyGroupProfile':
        return route.fulfill({ json: { data: countyProfile(registry) } })
      case 'CompaniesSearch':
        return route.fulfill({
          json: { data: companiesPage(registry, variables.q === 'dante' ? [companyNode('14399840', 'DANTE INTERNATIONAL SA')] : [companyNode('1590082', 'OMV PETROM SA')]) },
        })
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

/** The router JSON-encodes array search params, so read them back decoded. */
function searchParam(url: string, key: string): string | null {
  return new URL(url).searchParams.get(key)
}

test.describe('Companies hub — the server HTML', () => {
  test.use({ javaScriptEnabled: false })

  test('carries no registry figure and no retired business figure, only the ways in', async ({ page }) => {
    await page.goto('/companies')

    await expect(page.getByRole('heading', { name: /Economia/, level: 1 })).toBeVisible({ timeout: 30000 })
    const figures = page.getByTestId('company-hub-figures')
    await expect(figures.locator('[data-count-value]')).toHaveCount(0)
    await expect(figures).not.toContainText('Firme în directorul platformei')
    for (const band of ['company-hub-status', 'company-hub-counties', 'company-hub-leaders', 'company-hub-sectors', 'company-hub-sizes', 'company-hub-new-sectors']) {
      await expect(page.getByTestId(band)).toHaveCount(0)
    }
    await expect(page.getByTestId('company-hub-start')).toBeVisible()
  })
})

test.describe('Companies hub', () => {
  test.beforeEach(async ({ mockApi, page }) => {
    await setupMocks(mockApi)
    await serveRegistry(page, EDITION_7)
  })

  test('shows the pinned edition’s counts and bands, names the edition, and asks for nothing else', async ({ page }) => {
    const operations: string[] = []
    page.on('request', (request) => {
      const { name } = operationOf(request.postData())
      if (name) operations.push(name)
    })

    await page.goto('/companies')
    await waitForPageReady(page)

    const figures = page.getByTestId('company-hub-figures')
    await expect(figures).toContainText('Firme în directorul platformei', { timeout: 30000 })
    await expect(figures.locator('[data-count-value="3214"]')).toHaveCount(1)
    await expect(page.getByTestId('company-hub-source')).toContainText(/ediția 7 publicată pe/)
    await expect(page.getByTestId('company-hub-status')).toContainText('Înscrieri cu valori diferite')
    await expect(page.getByTestId('company-hub-counties')).toContainText('Cluj')
    await expect(page.getByTestId('company-hub-divisions-rev0')).toContainText('Diviziunea 52 (CAEN Rev.0)')
    // The retired static figures are gone for good.
    for (const band of ['company-hub-leaders', 'company-hub-sectors', 'company-hub-sizes', 'company-hub-new-sectors']) {
      await expect(page.getByTestId(band)).toHaveCount(0)
    }

    // The page's own registry read, then the edition's figures; the search may warm up; nothing else.
    expect(operations.filter((name) => name !== 'SearchEntities').sort()).toEqual(['CompanyHubStats', 'CompanyRegistry'])
  })

  test('the „în funcțiune” figure opens the directory with its status applied', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

    await page.getByTestId('company-hub-figures').getByRole('link', { name: /Cu înscriere „în funcțiune”/ }).click({ timeout: 30000 })

    await expect(page).toHaveURL(/\/companies\/search/, { timeout: 30000 })
    expect(searchParam(page.url(), 'status')).toBe('["1048"]')
    await expect(page.getByTestId('company-search-results')).toContainText('OMV PETROM SA')
  })

  test('the search asks the index for companies only, and typing navigates nowhere', async ({ page }) => {
    await page.goto('/companies')
    await waitForPageReady(page)

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
    await page.goto('/companies')
    await waitForPageReady(page)

    await page.getByRole('combobox').first().fill('dante')
    await page.getByRole('option', { name: /DANTE INTERNATIONAL/ }).click()

    await expect(page).toHaveURL(/\/companies\/14399840/, { timeout: 30000 })
  })

  test('a legacy /companies?q= deep link redirects to the directory', async ({ page }) => {
    await page.goto('/companies?q=dante')

    await expect(page).toHaveURL(/\/companies\/search/, { timeout: 30000 })
    expect(searchParam(page.url(), 'q')).toBe('dante')
    await expect(page.getByTestId('company-search-results')).toContainText('DANTE INTERNATIONAL SA')
  })
})

test.describe('Companies hub — a registry with no published edition', () => {
  test.beforeEach(async ({ mockApi, page }) => {
    await setupMocks(mockApi)
    await serveRegistry(page, UNPUBLISHED)
  })

  test('says the state instead of a zero, and asks for no figure', async ({ page }) => {
    const operations: string[] = []
    page.on('request', (request) => {
      const { name } = operationOf(request.postData())
      if (name) operations.push(name)
    })

    await page.goto('/companies')
    await waitForPageReady(page)

    await expect(page.getByTestId('company-registry-state')).toContainText('nu are încă o ediție publicată', { timeout: 30000 })
    await expect(page.getByTestId('company-hub-figures').locator('[data-count-value]')).toHaveCount(0)
    await expect(page.getByTestId('company-hub-start')).toBeVisible()
    expect(operations).not.toContain('CompanyHubStats')
  })
})
