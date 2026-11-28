import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
  GraphQLRequestError: class GraphQLRequestError extends Error {},
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { withProcurementSearchDefaults } from '@/schemas/procurement-search'
import {
  fetchAuthorityProcurementSliceLive,
  fetchProcurementSearchLive,
  fetchSupplierDirectAnalyticsLive,
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

function aggregateResponse(keyed: (typeof grains)[number] = 'contract') {
  const breakdown = (dimension: string, key?: string) => grains.map((grain) => ({
    grain,
    dimension,
    rankedBy: 'count',
    buckets: grain === keyed && key ? [{
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
function answerByOperation(names: { readonly authorities?: readonly unknown[]; readonly suppliers?: readonly unknown[] } = {}, keyed: (typeof grains)[number] = 'contract') {
  graphqlQueryMock.mockImplementation(async (_query, _variables, options) => {
    switch ((options as { operationName?: string } | undefined)?.operationName) {
      case 'ProcurementAggregates':
        return aggregateResponse(keyed)
      case 'ProcurementCpvDivisions':
        return { procurementCpvDivisions: [{ divisionCode: '45', labelEn: 'Construction work', labelRo: 'Lucrări de construcții' }] }
      case 'ProcurementPartyNames':
        return { authorities: names.authorities ?? [], suppliers: names.suppliers ?? [] }
      case 'ProcurementContracts':
        return { procurementContracts: { total: 0, totalEstimated: false, items: [] } }
      case 'ProcurementSupplierRecords':
        return { procurementSupplierRecords: { total: 0, edges: [], pageInfo: { hasNextPage: false, endCursor: null } } }
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

  it('names a firm’s direct-purchase buyers through the identity spine, asking that grain alone (PROC-001)', async () => {
    answerByOperation({ authorities: [{ cui: '111', canonicalName: 'Municipiul Exemplu', status: 'named' }] }, 'direct_acquisition')

    const analytics = await fetchSupplierDirectAnalyticsLive('222')

    expect(analytics.grain).toBe('direct_acquisition')
    expect(analytics.topAuthorities[0]?.authority?.name).toBe('Municipiul Exemplu')
    expect((callsOf('ProcurementAggregates')[0]?.[1] as { scope: Record<string, unknown> }).scope).toMatchObject({ supplierCui: '222', grain: 'direct_acquisition' })
    // The scope carries the firm's code: no D6 key given, none set; the signal travels with it.
    expect(callsOf('ProcurementAggregates')[0]?.[2]).not.toHaveProperty('disclosureSeen')
    // No legacy read: no contract list, no supplier records.
    expect(callsOf('ProcurementSupplierRecords')).toHaveLength(0)
    expect(callsOf('ProcurementContracts')).toHaveLength(0)
    const names = callsOf('ProcurementPartyNames').map((call) => String(call[0]))
    expect(names.some((query) => query.includes('authorities: organizationLabels'))).toBe(true)
    for (const query of names) {
      expect(query).not.toContain('entity(cui:')
      expect(query).not.toContain('company(cui:')
    }
  })

  it('names ranking rows through the identity spine', async () => {
    answerByOperation({
      suppliers: [{ cui: '222', canonicalName: 'Furnizor Exemplu SRL', status: 'named' }],
    })

    const slice = await fetchAuthorityProcurementSliceLive('111')

    expect(slice.analysisByGrain.contract.topSuppliers[0]?.supplier?.name).toBe('Furnizor Exemplu SRL')
    // Through the identity spine: a role registry cannot name a party that is a state company.
    const names = callsOf('ProcurementPartyNames').map((call) => String(call[0]))
    expect(names.some((query) => query.includes('suppliers: organizationLabels'))).toBe(true)
    for (const query of names) {
      expect(query).not.toContain('entity(cui:')
      expect(query).not.toContain('company(cui:')
    }
  })

  it('asks an institution’s slice for money order, and passes the order on', async () => {
    answerByOperation()

    await fetchAuthorityProcurementSliceLive('111')

    const [aggregates] = callsOf('ProcurementAggregates')
    expect(aggregates?.[0]).toContain('rankBy: $rankBy')
    expect(aggregates?.[1]).toMatchObject({ rankBy: 'value', includeAuthorities: false })
  })
})

describe('the firm’s direct analytics under D6', () => {
  it('sends the aggregates with the caller’s disclosure key and signal', async () => {
    answerByOperation({}, 'direct_acquisition')
    const reader = new AbortController()
    await fetchSupplierDirectAnalyticsLive('222', reader.signal, '2026-11-19T03:10:00.123456Z')
    expect(callsOf('ProcurementAggregates')[0]?.[2]).toMatchObject({ disclosureSeen: '2026-11-19T03:10:00.123456Z', signal: reader.signal })
  })
})

describe('a cancelled slice read (D6 purge)', () => {
  it('asks no names after its first round once its signal is aborted', async () => {
    answerByOperation({ authorities: [{ cui: '111', canonicalName: 'Municipiul Exemplu', status: 'named' }] }, 'direct_acquisition')
    await fetchSupplierDirectAnalyticsLive('222')
    const whole = callsOf('ProcurementPartyNames').length
    expect(whole).toBeGreaterThan(0)
    graphqlQueryMock.mockClear()
    resetProcurementLiveCachesForTests()
    answerByOperation({ authorities: [{ cui: '111', canonicalName: 'Municipiul Exemplu', status: 'named' }] }, 'direct_acquisition')
    const cancelled = new AbortController()
    cancelled.abort()
    await expect(fetchSupplierDirectAnalyticsLive('222', cancelled.signal)).rejects.toThrow()
    expect(callsOf('ProcurementPartyNames').length).toBeLessThan(whole)
  })
})

describe('live procurement reference caches', () => {
  const SIX_HOURS = 6 * 60 * 60 * 1000

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the parties’ names and the CPV divisions for six hours, then reads them again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(0)
    answerByOperation({ authorities: [{ cui: '111', canonicalName: 'Municipiul Exemplu', status: 'named' }] }, 'direct_acquisition')
    await fetchSupplierDirectAnalyticsLive('222')
    const namesRead = callsOf('ProcurementPartyNames').length
    expect(namesRead).toBeGreaterThan(0)
    expect(callsOf('ProcurementCpvDivisions')).toHaveLength(1)

    vi.setSystemTime(SIX_HOURS - 1)
    const kept = await fetchSupplierDirectAnalyticsLive('222')
    expect(kept.topAuthorities[0]?.authority?.name).toBe('Municipiul Exemplu')
    expect(callsOf('ProcurementPartyNames')).toHaveLength(namesRead)
    expect(callsOf('ProcurementCpvDivisions')).toHaveLength(1)

    vi.setSystemTime(SIX_HOURS)
    const again = await fetchSupplierDirectAnalyticsLive('222')
    expect(again.topAuthorities[0]?.authority?.name).toBe('Municipiul Exemplu')
    // The names are read again with the page; the divisions are served stale while one read refreshes them.
    expect(callsOf('ProcurementPartyNames')).toHaveLength(2 * namesRead)
    expect(callsOf('ProcurementCpvDivisions')).toHaveLength(2)
  })

  it('never looks a direct-purchase supplier’s name up: its bucket carries the gated name (DA-009); a contract supplier’s stays kept', async () => {
    const withDaCompany = () => {
      const response = aggregateResponse()
      return {
        ...response,
        suppliers: response.suppliers.map((block) =>
          block.grain === 'direct_acquisition'
            ? { ...block, buckets: [{ key: '333', kind: 'top', displayKind: 'company', recordCount: '1', withValueCount: '1', valueAwardedSum: '5.00', valueSum: '5.00', shareOfScope: '1.0000' }] }
            : block,
        ),
      }
    }
    graphqlQueryMock.mockImplementation(async (_query, variables, options) => {
      const operation = (options as { operationName?: string } | undefined)?.operationName
      if (operation === 'ProcurementAggregates') return withDaCompany()
      if (operation === 'ProcurementPartyNames') {
        const supplierCuis = (variables as { supplierCuis?: readonly string[] }).supplierCuis ?? []
        return { authorities: [], suppliers: supplierCuis.map((cui) => ({ cui, canonicalName: `NUME ${cui}`, status: 'named' })) }
      }
      if (operation === 'ProcurementCpvDivisions') return { procurementCpvDivisions: [] }
      if (operation === 'ProcurementContracts') return { procurementContracts: { total: 0, totalEstimated: false, items: [] } }
      if (operation === 'ProcurementSupplierRecords') return { procurementSupplierRecords: { total: 0, edges: [], pageInfo: { hasNextPage: false, endCursor: null } } }
      throw new Error('unexpected read')
    })
    const asked = () => callsOf('ProcurementPartyNames').flatMap((call) => (call[1] as { supplierCuis?: readonly string[] }).supplierCuis ?? [])
    // DA-009: a direct-purchase supplier is never looked up at all — its bucket carries the API's gated name.
    await fetchAuthorityProcurementSliceLive('111')
    await fetchAuthorityProcurementSliceLive('111')
    expect(asked().filter((cui) => cui === '333')).toHaveLength(0)
    // A contract supplier's name is kept as before.
    expect(asked().filter((cui) => cui === '222')).toHaveLength(1)
  })

  it('holds at most 5 000 parties’ names: past it, the oldest go', async () => {
    answerByOperation()
    const namesAskedFor = (cui: string) =>
      callsOf('ProcurementPartyNames').filter((call) => {
        const variables = call[1] as { readonly authorityCuis?: readonly string[]; readonly supplierCuis?: readonly string[] }
        return [...(variables.authorityCuis ?? []), ...(variables.supplierCuis ?? [])].includes(cui)
      }).length
    // Each institution's own name is one key; the first page also keeps the aggregates' ranked buyer and firm.
    for (let cui = 1; cui <= 5_000; cui += 1) await fetchAuthorityProcurementSliceLive(String(100_000 + cui))
    expect(namesAskedFor('105000')).toBe(1)
    expect(namesAskedFor('100001')).toBe(1)
    // Still kept: the newest firm's name.
    await fetchAuthorityProcurementSliceLive('105000')
    expect(namesAskedFor('105000')).toBe(1)
    // Evicted: the first firm's, the oldest key.
    await fetchAuthorityProcurementSliceLive('100001')
    expect(namesAskedFor('100001')).toBe(2)
  })
})
