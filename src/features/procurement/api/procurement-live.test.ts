/**
 * Live-pipeline tests: mocked `graphqlQuery` returning canned raw payloads →
 * response-schema parse → mappers → bundle assembly. This is what exercises
 * the live adapter until the server ships the spec.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
  GraphQLRequestError: class GraphQLRequestError extends Error {},
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { procurementSearchPageSchema, procurementLandingSchema } from '@/schemas/procurement'
import { withProcurementSearchDefaults } from '@/schemas/procurement-search'
import {
  fetchContractDetailLive,
  fetchProcurementLandingLive,
  fetchProcurementSearchLive,
  fetchSupplierRecordsLive,
  resetProcurementLiveCachesForTests,
} from './procurement-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)

const rawParty = { cui: '123', name: 'X', displayName: 'X' }

const rawGates = {
  procurementGrainQuality: [
    {
      sourceGrain: 'direct_acquisition',
      rowsCount: '100',
      authorityCuiCoverageRate: '0.99',
      supplierCuiCoverageRate: '0.99',
      amountCoverageRate: '0.99',
      cpvCoverageRate: '0.99',
      dateCoverageRate: '0.99',
      filterAnswersAllowed: true,
      spendRankingsAllowed: true,
      supplierRegionFiltersAllowed: false,
      blockers: [],
      dataAsOf: '2026-06-25',
      cadence: 'zilnic',
    },
    {
      sourceGrain: 'procurement_contract',
      rowsCount: '50',
      authorityCuiCoverageRate: '0.8',
      supplierCuiCoverageRate: '0.8',
      amountCoverageRate: '0.8',
      cpvCoverageRate: '0.8',
      dateCoverageRate: '0.8',
      filterAnswersAllowed: false,
      spendRankingsAllowed: false,
      supplierRegionFiltersAllowed: false,
      blockers: ['amount'],
      dataAsOf: null,
      cadence: null,
    },
  ],
}

const rawStats = {
  totalValueRon: '1000.00',
  contractsCount: '2',
  directAcquisitionsCount: '3',
  proceduresCount: '1',
  buyersCount: '2',
  suppliersCount: '2',
  firstFlowDate: '2025-01-01',
  lastFlowDate: '2025-06-01',
}

const rawAggregates = {
  procurementStats: rawStats,
  procurementTopAuthorities: [],
  procurementTopSuppliers: [],
  procurementCategoryBreakdown: [],
  procurementSpendOverTime: [],
}

const rawContract = {
  id: 'c1',
  contractNo: '1',
  contractDate: '2025-01-01',
  procedureId: null,
  noticeNo: null,
  title: 'T',
  authority: rawParty,
  supplier: rawParty,
  cpvCode: null,
  cpvDivisionCode: null,
  valueRon: '10.00',
  estimatedValueRon: null,
  currency: null,
  isRon: true,
  valueSuspect: false,
  status: 'awarded',
  sourceSystem: 'seap_contracts',
  sourceUrl: null,
  isCanonical: true,
  dupGroupId: null,
  modifications: [],
}

function respondByOperation(
  responses: Record<string, unknown>,
): void {
  graphqlQueryMock.mockImplementation((query: string) => {
    for (const [marker, response] of Object.entries(responses)) {
      if (query.includes(marker)) return Promise.resolve(response)
    }
    return Promise.reject(new Error(`no canned response for query: ${query.slice(0, 80)}`))
  })
}

beforeEach(() => {
  graphqlQueryMock.mockReset()
  resetProcurementLiveCachesForTests()
})

describe('fetchProcurementLandingLive', () => {
  it('assembles a schema-valid landing bundle from aggregates + gates', async () => {
    respondByOperation({
      'query ProcurementAggregates': rawAggregates,
      'query ProcurementGrainQuality': rawGates,
    })
    const landing = await fetchProcurementLandingLive()
    expect(() => procurementLandingSchema.parse(landing)).not.toThrow()
    expect(landing.headline.recordsCount).toBe(5)
    expect(landing.gate.sourceGrain).toBe('direct_acquisition')
  })

  it('fails loud on a malformed payload instead of partially fabricating', async () => {
    respondByOperation({
      'query ProcurementAggregates': { procurementStats: { nope: true } },
      'query ProcurementGrainQuality': rawGates,
    })
    await expect(fetchProcurementLandingLive()).rejects.toThrow()
  })
})

describe('fetchProcurementSearchLive', () => {
  it('dispatches on grain and attaches the matching gate', async () => {
    respondByOperation({
      'query ProcurementContracts': {
        procurementContracts: {
          total: 42,
          totalEstimated: false,
          items: [rawContract],
        },
      },
      'query ProcurementGrainQuality': rawGates,
    })
    const page = await fetchProcurementSearchLive(
      withProcurementSearchDefaults({ grain: 'contracts' }),
    )
    expect(() => procurementSearchPageSchema.parse(page)).not.toThrow()
    expect(page.records[0]?.grain).toBe('contract')
    expect(page.page.total).toBe(42)
    expect(page.gate.sourceGrain).toBe('procurement_contract')
  })

  it('passes a null total through (unknown / too large)', async () => {
    respondByOperation({
      'query ProcurementDirectAcquisitions': {
        procurementDirectAcquisitions: {
          total: null,
          totalEstimated: true,
          items: [],
        },
      },
      'query ProcurementGrainQuality': rawGates,
    })
    const page = await fetchProcurementSearchLive(
      withProcurementSearchDefaults({ grain: 'direct_acquisitions' }),
    )
    expect(page.page.total).toBeNull()
  })
})

describe('fetchContractDetailLive', () => {
  it('returns null when the root field is null (unknown id)', async () => {
    respondByOperation({
      'query ProcurementContractDetail': { procurementContract: null },
    })
    await expect(fetchContractDetailLive('missing')).resolves.toBeNull()
  })

  it('maps the detail bundle with the trail from the contract node', async () => {
    respondByOperation({
      'query ProcurementContractDetail': {
        procurementContract: {
          contract: {
            ...rawContract,
            modifications: [
              {
                id: 'm1',
                contractId: 'c1',
                linkMethod: 'notice_no',
                linkConfidence: 1,
                modificationDate: '2025-02-01',
                valueBeforeRon: '10.00',
                valueAfterRon: '12.00',
                valueDeltaRon: '2.00',
                modificationType: 'ACT ADITIONAL',
              },
            ],
          },
          procedure: null,
          ted: null,
          duplicates: [{ sourceSystem: 'elicitatie_ca_award', id: 'c1-el' }],
          gate: rawGates.procurementGrainQuality[1],
        },
      },
    })
    const detail = await fetchContractDetailLive('c1')
    expect(detail?.related.modifications).toHaveLength(1)
    expect(detail?.related.duplicates[0]?.sourceSystem).toBe(
      'elicitatie_ca_award',
    )
  })
})

describe('fetchSupplierRecordsLive', () => {
  it('maps the cursor connection onto the supplier records page', async () => {
    respondByOperation({
      'query ProcurementSupplierRecords': {
        procurementSupplierRecords: {
          total: 2,
          edges: [
            {
              cursor: 'a',
              node: { __typename: 'ProcurementContract', ...rawContract },
            },
          ],
          pageInfo: { hasNextPage: true, endCursor: 'a' },
        },
      },
    })
    const page = await fetchSupplierRecordsLive('123')
    expect(page.records[0]?.grain).toBe('contract')
    expect(page.hasNextPage).toBe(true)
    expect(page.endCursor).toBe('a')
  })
})
