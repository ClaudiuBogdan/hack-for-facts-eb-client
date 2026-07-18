import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
  GraphQLRequestError: class GraphQLRequestError extends Error {},
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { withProcurementSearchDefaults } from '@/schemas/procurement-search'
import {
  fetchContractDetailLive,
  fetchProcurementLandingLive,
  fetchProcurementSearchLive,
  fetchSupplierRecordsLive,
  resetProcurementLiveCachesForTests,
} from './procurement-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)
const party = { cui: '123', name: 'Company', displayName: 'Company' }
const contract = {
  id: 'c1', contractNo: '1', contractDate: '2025-01-01', procedureId: null,
  noticeNo: null, title: 'Live contract', authority: party, supplier: party,
  cpvCode: null, cpvDivisionCode: null, valueRon: '10.00', estimatedValueRon: null,
  currency: 'RON', status: 'awarded',
  value: {
    valueState: 'official_exact', valueStateRule: 'own_value', valueAccepted: true,
    valueRonComparable: '10.00', valueComparableBasis: 'official',
    valueRulesVersion: 2, valueResolvedAt: null,
  },
  sourceSystem: 'seap_contracts', sourceUrl: null, isCanonical: true,
  dupGroupId: null, canonicalValueSource: 'seap_own', valueDisagreement: false,
  modifications: [],
}

const grains = ['procedure', 'contract', 'direct_acquisition'] as const

function answerMeta(grain: (typeof grains)[number]) {
  return {
    answerability: 'served', reason: null, policyKey: 'procurement.count', grain,
    valueBasis: null, dateBasis: 'canonical_date', population: 'canonical records',
    buildId: '2', counts: { rows: '1', withValue: '1' }, undatedInScope: null,
    provisional: false, caveats: [], canonicalScope: `grain=${grain}`,
  }
}

function aggregateResponse() {
  const breakdown = (dimension: string, key?: string) => grains.map((grain) => ({
    grain,
    dimension,
    rankedBy: 'recordCount',
    buckets: grain === 'contract' && key ? [{
      key, kind: 'top', recordCount: '1', withValueCount: '1',
      valueAwardedSum: '10.00', shareOfScope: '1.0000',
    }] : [],
    meta: answerMeta(grain),
  }))
  const series = (measure: string) => grains.map((grain) => ({
    grain, measure, bucket: 'month', points: [], meta: answerMeta(grain),
  }))
  return {
    procurementStats: { blocks: grains.map((grain) => ({
      grain, recordCount: '1', withValueCount: '1', withEstimatedCount: '0',
      valueAwardedSum: grain === 'procedure' ? null : '10.00',
      valueEstimatedSum: null, avgValueAwarded: '10.00', minMonth: null,
      maxMonth: null, meta: answerMeta(grain),
    })) },
    authorities: breakdown('authority', '111'),
    suppliers: breakdown('supplier', '222'),
    categories: breakdown('cpvDivision'),
    recordSeries: series('recordCount'),
    valueSeries: series('valueAwardedSum'),
  }
}

beforeEach(() => {
  graphqlQueryMock.mockReset()
  resetProcurementLiveCachesForTests()
})

describe('live procurement adapter', () => {
  it('parses and maps a live search response without a gate call', async () => {
    graphqlQueryMock.mockResolvedValue({
      procurementContracts: { total: 1, totalEstimated: false, items: [contract] },
    })
    const page = await fetchProcurementSearchLive(
      withProcurementSearchDefaults({ grain: 'contracts' }),
    )
    expect(page.records[0]?.grain).toBe('contract')
    expect(page.page.total).toBe(1)
    expect(graphqlQueryMock).toHaveBeenCalledTimes(1)
  })

  it('surfaces malformed transport data', async () => {
    graphqlQueryMock.mockResolvedValue({ procurementContracts: { items: null } })
    await expect(fetchProcurementSearchLive(
      withProcurementSearchDefaults({ grain: 'contracts' }),
    )).rejects.toThrow()
  })

  it('maps canonical detail without synthesizing gate metadata', async () => {
    graphqlQueryMock.mockResolvedValue({
      procurementContract: {
        contract,
        procedure: null,
        ted: null,
        duplicates: [],
      },
    })
    const detail = await fetchContractDetailLive('c1')
    expect(detail?.record.id).toBe('c1')
    expect(detail).not.toHaveProperty('gate')
  })

  it('maps the supplier records cursor connection', async () => {
    graphqlQueryMock.mockResolvedValue({
      procurementSupplierRecords: {
        total: null,
        edges: [{ cursor: 'a', node: { __typename: 'ProcurementContract', ...contract } }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })
    const page = await fetchSupplierRecordsLive('123')
    expect(page.total).toBeNull()
    expect(page.records[0]?.grain).toBe('contract')
  })

  it('batches canonical authority and supplier names into ranking rows', async () => {
    graphqlQueryMock
      .mockResolvedValueOnce(aggregateResponse())
      .mockResolvedValueOnce({ procurementCpvDivisions: [] })
      .mockResolvedValueOnce({
        authorities: {
          edges: [{ node: { cui: '111', name: 'Municipiul Exemplu' } }],
        },
        suppliers: {
          edges: [{ node: { cui: '222', name: 'Furnizor Exemplu SRL' } }],
        },
      })

    const landing = await fetchProcurementLandingLive({
      dateFrom: '2024-05-17',
      dateTo: '2024-06-02',
    })

    expect(
      landing.analysisByGrain.contract.topAuthorities[0]?.authority?.name,
    ).toBe('Municipiul Exemplu')
    expect(
      landing.analysisByGrain.contract.topSuppliers[0]?.supplier?.name,
    ).toBe('Furnizor Exemplu SRL')
    expect(graphqlQueryMock).toHaveBeenCalledTimes(3)
    expect(graphqlQueryMock.mock.calls[0]?.[1]).toMatchObject({
      scope: { from: '2024-05', to: '2024-06' },
    })
    expect(graphqlQueryMock.mock.calls[2]?.[0]).toContain(
      'query ProcurementPartyNames',
    )
    expect(graphqlQueryMock.mock.calls[2]?.[0]).toContain(
      'referencePublicEntities',
    )
    expect(graphqlQueryMock.mock.calls[2]?.[0]).toContain('suppliers: companies')
    expect(graphqlQueryMock.mock.calls[2]?.[0]).not.toContain('entity(cui:')
    expect(graphqlQueryMock.mock.calls[2]?.[0]).not.toContain('company(cui:')
  })

  it('scopes landing analytics by buyer region without unsupported rankings', async () => {
    graphqlQueryMock
      .mockResolvedValueOnce({
        ...aggregateResponse(),
        authorities: undefined,
        suppliers: undefined,
      })
      .mockResolvedValueOnce({ procurementCpvDivisions: [] })

    const landing = await fetchProcurementLandingLive({
      buyerRegion: 'Nord-Vest',
    })

    expect(landing.analysisByGrain.contract.topAuthorities).toEqual([])
    expect(landing.analysisByGrain.contract.topSuppliers).toEqual([])
    expect(graphqlQueryMock).toHaveBeenCalledTimes(2)
    expect(graphqlQueryMock.mock.calls[0]?.[1]).toMatchObject({
      scope: { buyerRegion: 'Nord-Vest' },
      includeAuthorities: false,
      includeSuppliers: false,
      includeCategories: true,
    })
  })

  it('labels a county as a regional approximation before querying analytics', async () => {
    graphqlQueryMock
      .mockResolvedValueOnce({
        referenceRegions: [
          { region: 'Nord-Vest', countyCount: 6, uatCount: 452 },
        ],
        referenceCounties: [
          {
            countyCode: 'CJ',
            countyName: 'CLUJ',
            region: 'Nord-Vest',
            uatCount: 82,
          },
        ],
      })
      .mockResolvedValueOnce({
        ...aggregateResponse(),
        authorities: undefined,
        suppliers: undefined,
      })
      .mockResolvedValueOnce({ procurementCpvDivisions: [] })

    await fetchProcurementLandingLive({ buyerCounty: 'CJ' })

    expect(graphqlQueryMock.mock.calls[0]?.[0]).toContain(
      'query ProcurementGeographyOptions',
    )
    expect(graphqlQueryMock.mock.calls[1]?.[1]).toMatchObject({
      scope: { buyerRegion: 'Nord-Vest' },
    })
  })
})
