import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
  GraphQLRequestError: class GraphQLRequestError extends Error {},
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { withProcurementSearchDefaults } from '@/schemas/procurement-search'
import {
  fetchAuthorityProcurementSliceLive,
  fetchCpvCategoryPageLive,
  fetchProcedureDetailLive,
  fetchProcurementSearchLive,
  fetchSupplierRecordsLive,
  resetProcurementLiveCachesForTests,
} from './procurement-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)
const party = { cui: '123', name: 'Company', displayName: 'Company' }
const contract = {
  id: 'c1', contractNo: '1', contractDate: '2025-01-01', procedureId: null,
  noticeNo: null, title: null,
  displayTitle: { text: 'Live contract', source: 'procedure', sourceUrl: 'https://example.test/procedure' },
  authority: party, supplier: party,
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
    rankedBy: 'count',
    buckets: grain === 'contract' && key ? [{
      key, kind: 'top', recordCount: '1', withValueCount: '1',
      valueAwardedSum: '10.00', valueSum: '10.00', shareOfScope: '1.0000',
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
      valueEstimatedSum: null, valueCeilingSum: null, valueModAdjustedSum: null,
      valueAwardedMatchedSum: null,
      moneyVerdicts: [], avgValueAwarded: '10.00', minMonth: null,
      maxMonth: null, meta: answerMeta(grain),
    })) },
    authorities: breakdown('authority', '111'),
    suppliers: breakdown('supplier', '222'),
    categories: breakdown('cpvDivision'),
    recordSeries: series('recordCount'),
    valueSeries: series('valueAwardedSum'),
  }
}

/** Each read answered by its operation, as the API would: the aggregates, the divisions, the names, an empty contract list. */
function answerByOperation(names: { readonly authorities?: readonly unknown[]; readonly suppliers?: readonly unknown[] } = {}) {
  graphqlQueryMock.mockImplementation(async (_query, _variables, options) => {
    switch ((options as { operationName?: string } | undefined)?.operationName) {
      case 'ProcurementAggregates':
        return aggregateResponse()
      case 'ProcurementCpvDivisions':
        return { procurementCpvDivisions: [{ divisionCode: '45', labelEn: 'Construction work', labelRo: 'Lucrări de construcții' }] }
      case 'ProcurementPartyNames':
        return { authorities: names.authorities ?? [], suppliers: names.suppliers ?? [] }
      case 'ProcurementContracts':
        return { procurementContracts: { total: 0, totalEstimated: false, items: [] } }
      default:
        throw new Error('unexpected read')
    }
  })
}

const callsOf = (operation: string) => graphqlQueryMock.mock.calls.filter((call) => (call[2] as { operationName?: string } | undefined)?.operationName === operation)

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
      procurementProcedure: {
        procedure: {
          id: 'p1', noticeNo: 'CN1', noticeKind: null, procedureType: 'licitatie deschisa', contractKind: null, title: 'Live procedure',
          authority: party, cpvCode: null, cpvDivisionCode: null, estimatedValueRon: '10.00', awardedValueRon: '10.00', currency: 'RON',
          value: contract.value, status: 'awarded', countyName: null, publicationDate: '2025-01-01', stateDate: null,
          sourceSystem: 'elicitatie', sourceUrl: null, isCanonical: true, dupGroupId: null,
        },
        contracts: [contract],
        perLotWinners: null,
        ted: null,
        duplicates: [],
      },
    })
    const detail = await fetchProcedureDetailLive('p1')
    expect(detail?.record.id).toBe('p1')
    expect(detail?.related.contracts[0]?.id).toBe('c1')
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
    answerByOperation({
      authorities: [{ cui: '111', canonicalName: 'Municipiul Exemplu', status: 'named' }],
      suppliers: [{ cui: '222', canonicalName: 'Furnizor Exemplu SRL', status: 'named' }],
    })

    const page = await fetchCpvCategoryPageLive('45')

    expect(page?.analysisByGrain.contract.topAuthorities[0]?.authority?.name).toBe('Municipiul Exemplu')
    expect(page?.analysisByGrain.contract.topSuppliers[0]?.supplier?.name).toBe('Furnizor Exemplu SRL')
    // One batched read for both roles, through the identity spine: a role registry cannot name a buyer that is a state company.
    const names = callsOf('ProcurementPartyNames')
    expect(names).toHaveLength(1)
    expect(names[0]?.[0]).toContain('authorities: organizationLabels')
    expect(names[0]?.[0]).toContain('suppliers: organizationLabels')
    expect(names[0]?.[0]).not.toContain('entity(cui:')
    expect(names[0]?.[0]).not.toContain('company(cui:')
    // A category page ranks by count.
    expect(callsOf('ProcurementAggregates')[0]?.[1]).toMatchObject({ scope: { cpvDivision: '45' }, rankBy: 'count' })
  })

  it('asks an institution’s slice for money order, and passes the order on', async () => {
    answerByOperation()

    await fetchAuthorityProcurementSliceLive('111')

    const [aggregates] = callsOf('ProcurementAggregates')
    expect(aggregates?.[0]).toContain('rankBy: $rankBy')
    expect(aggregates?.[1]).toMatchObject({ rankBy: 'value', includeAuthorities: false })
  })
})
