import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchCaseSearchMock,
  fetchCompanyLitigationMock,
  fetchCourtCaseloadMock,
  fetchJusticeOverviewMock,
  fetchJudicialCaseMock,
} from './justice-api.mock'

describe('justice mock API', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns overview partial/stale/error variants through env state', async () => {
    vi.stubEnv('VITE_JUSTICE_MOCK_VARIANT', 'overview-partial')
    await expect(fetchJusticeOverviewMock()).resolves.toMatchObject({
      provenance: { status: 'partial' },
      topCourts: [],
    })

    vi.stubEnv('VITE_JUSTICE_MOCK_VARIANT', 'overview-stale')
    await expect(fetchJusticeOverviewMock()).resolves.toMatchObject({
      provenance: { status: 'stale' },
    })

    vi.stubEnv('VITE_JUSTICE_MOCK_VARIANT', 'overview-error')
    await expect(fetchJusticeOverviewMock()).rejects.toThrow(
      'Mock justice overview error',
    )
  })

  it('sorts and slices case-search rows while keeping total filtered count', async () => {
    const result = await fetchCaseSearchMock({
      page: 2,
      pageSize: 1,
      sort: 'recent',
    })

    expect(result.pagination).toEqual({ page: 2, pageSize: 1, total: 3 })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.caseNumber).toBe('1234/3/2024')
  })

  it('filters by closed metadata fields and recomputes facets', async () => {
    const result = await fetchCaseSearchMock({
      partyKey: 'primaria-municipiului-cluj-napoca',
      partyKind: 'public_entity',
      role: 'Pârât',
      tier: 'tribunal',
      year: 2025,
    })

    expect(result.pagination.total).toBe(1)
    expect(result.rows[0]?.caseNumber).toBe('42/2/2025')
    expect(result.facets.years).toEqual([{ year: 2025, count: 1 }])
    expect(result.facets.roles).toEqual([{ value: 'Pârât', count: 1 }])
    expect(result.facets.categories).toEqual([
      {
        value: 'administrativ',
        label: 'Litigii administrativ-fiscale',
        count: 1,
      },
    ])
  })

  it('uses partyKey as an exact publishable key, not display-name text', async () => {
    const result = await fetchCaseSearchMock({
      partyKey: 'primaria municipiului cluj napoca',
    })

    expect(result.pagination.total).toBe(0)
    expect(result.rows).toEqual([])
  })

  it('supports comma-separated category and stage filters with OR semantics', async () => {
    const result = await fetchCaseSearchMock({
      category: 'comercial,muncii',
      stage: 'in_curs,revizuit',
      sort: 'oldest',
    })

    expect(result.pagination.total).toBe(2)
    expect(result.rows.map((row) => row.caseNumber)).toEqual([
      '909/4/2023',
      '1234/3/2024',
    ])
  })

  it('returns court caseload variants and applies year/category filters', async () => {
    const smallCourt = await fetchCourtCaseloadMock('JU-MOCK-MIC', {
      year: 2025,
      category: 'civil',
    })

    expect(smallCourt?.court.courtLevel).toBe('judecatorie')
    expect(smallCourt?.volumeByYear).toEqual([{ year: 2025, count: 430 }])
    expect(smallCourt?.byCategory).toEqual([
      { category: 'civil', categoryName: 'Litigii civile', count: 780 },
    ])

    const zeroCoverage = await fetchCourtCaseloadMock('NO-COVERAGE')
    expect(zeroCoverage?.headline.totalCases).toBe(0)
    expect(zeroCoverage?.provenance.status).toBe('partial')
  })

  it('returns deterministic company litigation states by CUI', async () => {
    const gated = await fetchCompanyLitigationMock({ cui: '14399840' })
    const publicEntity = await fetchCompanyLitigationMock({
      cui: '9000001',
      page: 1,
      pageSize: 1,
    })
    const candidateCompany = await fetchCompanyLitigationMock({ cui: '9000002' })
    const noCases = await fetchCompanyLitigationMock({ cui: '9000003' })

    expect(gated.laneAvailability.companyCandidates).toBe('gated')
    expect(gated.headline.totalCases).toBeNull()
    expect(publicEntity.headline.asPartyKind).toBe('public_entity')
    expect(publicEntity.pagination).toEqual({ page: 1, pageSize: 1, total: 2 })
    expect(publicEntity.cases).toHaveLength(1)
    expect(candidateCompany.laneAvailability.companyCandidates).toBe('live')
    expect(candidateCompany.matchedNameKeys[0]?.confidence.tier).toBe('B')
    expect(candidateCompany.provenance.status).toBe('unverified')
    expect(noCases.headline.totalCases).toBe(0)
    expect(noCases.cases).toEqual([])
  })

  it('returns extra judicial-case detail states without named persons', async () => {
    const sparse = await fetchJudicialCaseMock('portal-just-sparse-persons')
    const nonstandard = await fetchJudicialCaseMock('portal-just-nonstandard-number')
    const legalRefs = await fetchJudicialCaseMock('portal-just-legal-refs-live')

    expect(sparse?.parties.named).toEqual([])
    expect(sparse?.parties.personCountsByRole.length).toBeGreaterThan(0)
    expect(nonstandard?.case.caseNumber).toBe('DS-LOCAL-2020-EXEMPLU')
    expect(legalRefs?.laneAvailability.legalReferences).toBe('live')
    expect(legalRefs?.legalReferences).toHaveLength(2)
  })
})
