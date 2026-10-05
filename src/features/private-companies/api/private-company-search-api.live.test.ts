import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The directory's live list read through the real transport (`graphqlQuery`;
 * only `fetch` is stubbed): the `CompaniesSearch` variables it sends and the
 * answer's checks. The API's `q` searches names only, so a typed canonical CUI
 * asks for that exact company (`filter.cui.eq`, no `q`) beside every other
 * selector; any other text is the name search it was.
 */

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}))
vi.mock('@/lib/auth', () => ({ getAuthToken: vi.fn(async () => null) }))
// Self-contained: the real module validates the app's env when imported, and CI has none.
vi.mock('@/config/env', () => ({ getApiBaseUrl: () => 'https://api.example.com' }))

import type { PrivateCompanySearchQuery } from '@/schemas/private-company-search'
import { normalizeCompanyCui } from '../lib/normalize-company-cui'
import { CompanyRegistryScopeMovedError, CompanyRegistryUnavailableError } from './company-registry-errors'
import { fetchPrivateCompanySearchLive, resolveCompaniesLive } from './private-company-api.live'

const S1 = 'onrc:published:7:3:11'
const S0 = 'onrc:published:6:2:11'
const CUI = '10817290'

const envelope = (scopeKey: string) => ({
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
  scopeKey,
})

const node = (cui: string) => ({
  cui,
  orgId: cui,
  name: 'FIRMA TEST SRL',
  nameSource: 'ONRC_EDITION',
  legalForm: 'SRL',
  headlineStatus: null,
  county: null,
  vatPayer: true,
  declaredFiscallyInactive: false,
  registrationDate: null,
  registrationDatePresent: false,
  registryCuiState: 'IN_EDITION',
  hasActiveObservation: true,
  statusBasis: 'MULTIPLE_VALUES',
  countyBasis: 'MULTIPLE_VALUES',
  recordedDateBasis: 'MISSING',
})

const listAnswer = (scopeKey: string, cuis: readonly string[] = []) => ({
  data: {
    companies: {
      edges: cuis.map((cui) => ({ cursor: `c-${cui}`, node: node(cui) })),
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: cuis.length,
      totalEstimated: false,
      registry: envelope(scopeKey),
    },
  },
})

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>()
const answer = (body: unknown) => fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))
const sent = () => JSON.parse(String(fetchMock.mock.lastCall?.[1].body)) as { query: string; variables: Record<string, unknown> }

const base: PrivateCompanySearchQuery = { pageSize: 25, scopeKey: S1 }

/** The variables the list read sends for a query (`undefined` ones are not sent). */
async function variablesFor(query: Partial<PrivateCompanySearchQuery>) {
  answer(listAnswer(S1))
  await fetchPrivateCompanySearchLive({ ...base, ...query })
  const body = sent()
  expect(body.query).toMatch(/query CompaniesSearch\(/u)
  return body.variables
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('fetchPrivateCompanySearchLive — a typed canonical CUI', () => {
  it('asks for that exact company and sends no name query', async () => {
    expect(await variablesFor({ q: CUI })).toEqual({ filter: { cui: { eq: CUI } }, first: 25 })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example.com/api/v1/graphql')
  })

  it('keeps every selector, the sort and the page cursor beside it', async () => {
    const selectors = { status: ['1048'], county: ['CJ'], onrcCaen: ['rev3:2361'] }
    expect(await variablesFor({ q: CUI, ...selectors, sort: 'cui', cursor: 'cursor-2' })).toEqual({
      filter: { cui: { eq: CUI }, county: { eq: 'CJ' }, status: { eq: '1048' }, onrcCaen: { eq: 'rev3:2361' } },
      sort: 'CUI',
      first: 25,
      after: 'cursor-2',
    })
    // Every other facet too: the same filter a name query sends, plus the CUI.
    const all = {
      ...selectors,
      legalForm: ['SRL', 'SA'],
      caen: '62',
      regFrom: '2001-01-01',
      regTo: '2020-12-31',
      vat: true,
      inactive: false,
      sort: 'registration-date' as const,
      cursor: 'cursor-3',
    }
    const named = await variablesFor({ q: 'dante', ...all })
    const exact = await variablesFor({ q: CUI, ...all })
    const { q: nameQuery, filter: nameFilter, ...nameRest } = named
    expect(nameQuery).toBe('dante')
    expect(exact).toEqual({ filter: { cui: { eq: CUI }, ...(nameFilter as object) }, ...nameRest })
    expect(exact).toMatchObject({ sort: 'REGISTRATION_DATE', after: 'cursor-3', first: 25 })
  })

  it('trims surrounding whitespace, as the name query always was', async () => {
    for (const typed of [`  ${CUI} `, `\t${CUI}\n`]) {
      expect(await variablesFor({ q: typed })).toEqual({ filter: { cui: { eq: CUI } }, first: 25 })
    }
  })

  it('takes 2 to 10 digits without a leading zero — values the profile route accepts as typed', async () => {
    for (const typed of ['10', '99', '1234567890', '9999999999']) {
      expect(await variablesFor({ q: typed })).toEqual({ filter: { cui: { eq: typed } }, first: 25 })
      expect(normalizeCompanyCui(typed)).toBe(typed)
    }
  })
})

describe('fetchPrivateCompanySearchLive — everything else stays a name query', () => {
  it('sends names, names with digits and non-canonical numbers unchanged as q, with no CUI', async () => {
    for (const typed of [
      'dante',
      'ABC 2000 SRL',
      '1',
      '0',
      '00',
      '0123',
      '0123456789',
      '12345678901',
      '108 17290',
      '10817290.0',
      '-10817290',
      '+10817290',
      'RO10817290',
      'ro 10817290',
      '１０８１７２９０',
    ]) {
      expect(await variablesFor({ q: typed })).toEqual({ q: typed, first: 25 })
    }
  })

  it('keeps the facets of a name query as they were', async () => {
    expect(await variablesFor({ q: '  dante ', county: ['CJ'], status: ['1048'] })).toEqual({
      filter: { county: { eq: 'CJ' }, status: { eq: '1048' } },
      q: 'dante',
      first: 25,
    })
  })

  it('sends neither q nor a CUI for blank text', async () => {
    expect(await variablesFor({ q: '   ' })).toEqual({ first: 25 })
    expect(await variablesFor({})).toEqual({ first: 25 })
  })
})

describe('fetchPrivateCompanySearchLive — the answer’s checks are unchanged', () => {
  it('maps the exact company of the pinned scope', async () => {
    answer(listAnswer(S1, [CUI]))
    const page = await fetchPrivateCompanySearchLive({ ...base, q: CUI })
    expect(page.items.map((item) => item.cui)).toEqual([CUI])
    expect(page.registry.scopeKey).toBe(S1)
    expect(page.totalCount).toBe(1)
  })

  it('refuses an answer under another scope, or without its registry', async () => {
    answer(listAnswer(S0, [CUI]))
    await expect(fetchPrivateCompanySearchLive({ ...base, q: CUI })).rejects.toBeInstanceOf(CompanyRegistryScopeMovedError)
    const { registry: _missing, ...companies } = listAnswer(S1, [CUI]).data.companies
    answer({ data: { companies } })
    await expect(fetchPrivateCompanySearchLive({ ...base, q: CUI })).rejects.toThrow(/registry/u)
  })

  it('classifies a refused continuation and an unpublished registry as before', async () => {
    answer({ data: { companies: null }, errors: [{ message: 'cursor does not match this query; restart pagination', extensions: { code: 'INVALID_INPUT' } }] })
    await expect(fetchPrivateCompanySearchLive({ ...base, q: CUI, cursor: 'stale' })).rejects.toBeInstanceOf(CompanyRegistryScopeMovedError)
    answer({ data: { companies: null }, errors: [{ message: 'registry filters need a published ONRC edition', extensions: { code: 'SERVICE_UNAVAILABLE' } }] })
    await expect(fetchPrivateCompanySearchLive({ ...base, q: CUI, status: ['1048'] })).rejects.toBeInstanceOf(CompanyRegistryUnavailableError)
  })
})

describe('resolveCompaniesLive — the autocomplete’s NAME read is untouched', () => {
  it('still sends typed digits as the NAME query under the page’s scope', async () => {
    answer({ data: { companyResolveResult: { hits: [], degraded: false, ambiguous: false, registry: envelope(S1), scopeKey: S1 } } })
    await resolveCompaniesLive({ dim: 'NAME', q: CUI, limit: 8, registryScope: S1 })
    expect(sent().variables).toEqual({ dim: 'NAME', q: CUI, limit: 8, registryScope: S1 })
  })
})
