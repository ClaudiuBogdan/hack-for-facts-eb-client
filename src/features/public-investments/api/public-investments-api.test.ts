import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getEvidenceDetail,
  getLandingData,
  getObjectiveBundle,
  getPaymentsLedgerData,
  getTerritoryData,
  searchObjectives,
} from '../api/public-investments-api'
import {
  MOCK_OBJECTIVE_DETAIL_BUNDLES,
  MOCK_OBJECTIVE_SUMMARIES,
  REDACTED_RAW_PAYLOAD_NAPOCA,
} from '../mocks/public-investments-mock-data'

// Mock the env-gating helper so we can toggle mock mode per test without
// touching import.meta.env (which is frozen in Vitest).
vi.mock('../lib/mock-mode', () => ({
  isPublicInvestmentsMockEnabled: vi.fn(() => true),
}))

import { isPublicInvestmentsMockEnabled } from '../lib/mock-mode'
import { REDACTED_NAME_MARKER, REDACTED_NAME_MARKER_KEY } from '../lib/filters'

const isMockEnabledMock = isPublicInvestmentsMockEnabled as unknown as ReturnType<
  typeof vi.fn
>

afterEach(() => {
  isMockEnabledMock.mockReset()
  isMockEnabledMock.mockReturnValue(true)
})

describe('API — mock gating', () => {
  it('returns a blocked result when mock mode is disabled', async () => {
    isMockEnabledMock.mockReturnValue(false)
    const landing = await getLandingData()
    expect(landing.kind).toBe('blocked')
    if (landing.kind === 'blocked') {
      expect(landing.status).toBe('live-not-connected')
      expect(landing.messageKey).toBe(
        'publicInvestments.blocked.liveNotConnected',
      )
    }

    const search = await searchObjectives({})
    expect(search.kind).toBe('blocked')

    const bundle = await getObjectiveBundle('pi-anghel-cj-apahida')
    expect(bundle.kind).toBe('blocked')

    const territory = await getTerritoryData('locality', '58728')
    expect(territory.kind).toBe('blocked')

    const evidence = await getEvidenceDetail('evidence-anghel-apahida-contract')
    expect(evidence.kind).toBe('blocked')
  })

  it('serves landing data when mock mode is enabled', async () => {
    isMockEnabledMock.mockReturnValue(true)
    const landing = await getLandingData()
    expect(landing.kind).toBe('available')
    if (landing.kind === 'available') {
      expect(landing.data.status.snapshotDate).toBe('2026-05-18')
      expect(landing.data.coverage.length).toBe(4)
      // Trusted KPI total excludes the suspect PNCCRS row.
      expect(landing.data.kpis.contractedTotal.amount).toBe(14_450_000)
      const suspectPoint = landing.data.mapPoints.find(
        (row) => row.objectiveId === 'pi-pnccrs-bv-fagaras',
      )
      expect(suspectPoint?.contracted?.amount).toBeNull()
      expect(suspectPoint?.contracted?.confidence).toBe('suspect_x1000')
    }
  })

  it('serves search results and surfaces excludedSuspectCount', async () => {
    isMockEnabledMock.mockReturnValue(true)
    const result = await searchObjectives({
      amountField: 'contracted',
      amountMin: 1_000_000,
      amountMax: 10_000_000,
      page: 1,
      pageSize: 25,
    })
    expect(result.kind).toBe('available')
    if (result.kind === 'available') {
      // The PNCCRS suspect row is excluded from the range and counted.
      expect(result.data.excludedSuspectCount).toBe(1)
      expect(
        result.data.rows.find((row) => row.objectiveId === 'pi-pnccrs-bv-fagaras'),
      ).toBeUndefined()
    }
  })

  it('does not expose gated identifiers through search/list results', async () => {
    isMockEnabledMock.mockReturnValue(true)
    const result = await searchObjectives({ q: 'Popescu' })
    expect(result.kind).toBe('available')
    if (result.kind === 'available') {
      expect(result.data.rows).toEqual([])
      const serialized = JSON.stringify(result.data)
      expect(serialized).not.toContain('Popescu Ion Aurel')
      expect(serialized).not.toContain('99887766')
    }
  })

  it('returns a not-found blocked result for an unknown objective', async () => {
    isMockEnabledMock.mockReturnValue(true)
    const bundle = await getObjectiveBundle('does-not-exist')
    expect(bundle.kind).toBe('blocked')
    if (bundle.kind === 'blocked') {
      expect(bundle.status).toBe('not-found')
    }
  })

  it('sanitizes gated parties everywhere in the objective bundle', async () => {
    isMockEnabledMock.mockReturnValue(true)
    const bundle = await getObjectiveBundle('pi-anghel-cl-napoca-gated')
    expect(bundle.kind).toBe('available')
    if (bundle.kind === 'available') {
      const gatedParty = bundle.data.parties.find(
        (party) => party.partyId === 'party-contractor-napoca-pfa',
      )
      expect(gatedParty).toBeDefined()
      expect(gatedParty?.displayName).toBeNull()
      expect(gatedParty?.cui).toBeNull()

      const contractParty = bundle.data.contracts[0]?.contractor
      expect(contractParty?.partyId).toBe('party-contractor-napoca-pfa')
      expect(contractParty?.displayName).toBeNull()
      expect(contractParty?.cui).toBeNull()
      expect(JSON.stringify(bundle.data)).not.toContain('99887766')
      expect(JSON.stringify(bundle.data)).not.toContain('Popescu Ion Aurel')
    }
  })

  it('scrubs gated party names from the evidence excerpt', async () => {
    isMockEnabledMock.mockReturnValue(true)
    const evidence = await getEvidenceDetail(
      'evidence-anghel-cl-napoca-gated-contract',
      'pi-anghel-cl-napoca-gated',
    )
    expect(evidence.kind).toBe('available')
    if (evidence.kind === 'available') {
      const excerpt = evidence.data.rawPayloadExcerpt ?? ''
      expect(excerpt).not.toContain('Popescu Ion Aurel')
      expect(excerpt).not.toContain('99887766')
      expect(excerpt).toContain(REDACTED_NAME_MARKER)
      expect(evidence.data.redactionMarkerKey).toBe(REDACTED_NAME_MARKER_KEY)
      // The redacted excerpt matches the pre-scrubbed fixture.
      expect(excerpt).toBe(REDACTED_RAW_PAYLOAD_NAPOCA)
    }
  })

  it('serves territory data for a known locality and county', async () => {
    isMockEnabledMock.mockReturnValue(true)
    const locality = await getTerritoryData('locality', '58728')
    expect(locality.kind).toBe('available')
    if (locality.kind === 'available') {
      expect(locality.data.scope).toBe('locality')
      expect(locality.data.localityName).toBe('Comuna Apahida')
    }

    const county = await getTerritoryData('county', 'cj')
    expect(county.kind).toBe('available')
    if (county.kind === 'available') {
      expect(county.data.scope).toBe('county')
      expect(county.data.countyName).toBe('Cluj')
      // County summary aggregates only trusted CJ objectives (no PNCCRS suspect row here).
      expect(county.data.summary.contractedTotal.amount).toBe(11_000_000)
    }
  })

  it('returns a blocked result for an unknown territory', async () => {
    isMockEnabledMock.mockReturnValue(true)
    const unknown = await getTerritoryData('locality', '00000000')
    expect(unknown.kind).toBe('blocked')
    if (unknown.kind === 'blocked') {
      expect(unknown.status).toBe('not-found')
      expect(unknown.messageKey).toBe('publicInvestments.blocked.localityNotFound')
    }
  })

  it('applies territory filters and recomputes trusted summaries', async () => {
    isMockEnabledMock.mockReturnValue(true)
    const county = await getTerritoryData('county', 'cj', {
      domains: ['apa_canalizare'],
      sort: 'contracted',
      order: 'desc',
    })
    expect(county.kind).toBe('available')
    if (county.kind === 'available') {
      expect(county.data.objectives.map((row) => row.objectiveId)).toEqual([
        'pi-anghel-cj-apahida',
      ])
      expect(county.data.summary.objectiveCount).toBe(1)
      expect(county.data.summary.contractedTotal.amount).toBe(5_800_000)
      expect(county.data.byDomain).toEqual([
        expect.objectContaining({ key: 'apa_canalizare', count: 1 }),
      ])
      expect(county.data.childUats).toEqual([
        expect.objectContaining({ siruta: '58728', objectiveCount: 1 }),
      ])
    }
  })

  it('serves the payments ledger in chronological order by default', async () => {
    isMockEnabledMock.mockReturnValue(true)
    const ledger = await getPaymentsLedgerData('pi-anghel-cj-apahida')
    expect(ledger.kind).toBe('available')
    if (ledger.kind === 'available') {
      expect(ledger.data.payments.map((payment) => payment.paymentId)).toEqual([
        'pay-anghel-apahida-001',
        'pay-anghel-apahida-002',
      ])
      expect(ledger.data.cumulativeSeries).toHaveLength(2)
      expect(ledger.data.totals.reimbursedTotal.amount).toBe(2_320_000)
      expect(ledger.data.totals.suspectCount).toBe(0)
    }
  })

  it('mock fixture sanity: complete bundle exists for the Anghel Apahida objective', async () => {
    isMockEnabledMock.mockReturnValue(true)
    const bundle = await getObjectiveBundle('pi-anghel-cj-apahida')
    expect(bundle.kind).toBe('available')
    if (bundle.kind === 'available') {
      expect(bundle.data.objective.objectiveId).toBe('pi-anghel-cj-apahida')
      expect(bundle.data.payments.length).toBe(2)
      expect(bundle.data.contracts.length).toBe(1)
      // The fixture has a complete bundle.
      expect(MOCK_OBJECTIVE_DETAIL_BUNDLES['pi-anghel-cj-apahida']).toBeDefined()
      expect(MOCK_OBJECTIVE_SUMMARIES.length).toBe(5)
    }
  })
})
