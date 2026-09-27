import { beforeEach, describe, expect, it, vi } from 'vitest'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: (...args: unknown[]) => graphqlQuery(...args) }))

const { fetchProcurementHomeBigContracts, fetchProcurementHomeNational, fetchProcurementHomeRecentDirect, mapProcurementHomeCategories } = await import('./procurement-home-api')
const { procurementHomeCategoriesResponseSchema } = await import('./graphql/procurement-home-queries')

const series = (points: Record<string, string | null>) => [{ points: Object.entries(points).map(([bucket, value]) => ({ bucket, value })) }]
const breakdown = (rankedBy: string, buckets: readonly { key: string | null; kind?: string; recordCount?: string; valueSum?: string | null; shareOfScope?: string | null }[], withheld?: string | null) => [
  {
    rankedBy,
    buckets: buckets.map((bucket) => ({ kind: 'top', recordCount: '0', valueSum: null, shareOfScope: null, ...bucket })),
    valueWithheldAssociationSum: withheld ?? null,
  },
]
const stats = (recordCount: string | null, withValueCount: string | null, valueAwardedSum: string | null) => ({ blocks: [{ recordCount, withValueCount, valueAwardedSum }] })

function nationalResponse() {
  return {
    awards: stats('39539', '28839', '103594626884.40'),
    frameworks: stats('88105', '0', null),
    direct: stats('2014671', '2011031', '17993943804.96'),
    awardsBuyerCount: series({ '2025': '3446' }),
    directBuyerCount: series({ '2025': '14660' }),
    awardsSellerCount: series({ '2025': '8614' }),
    directSellerCount: series({ '2025': '93119' }),
    directYearValue: series({ '2019': '9052652725.93', '2025': '17993943804.96' }),
    directYearCount: series({ '2019': '1627228', '2025': '2014671' }),
    awardsMonthCount: series({ '2025-01': '4000', '2025-02': '4000', '2025-03': '4000', '2026-01': '3000', '2026-02': '100' }),
    directMonthCount: series({ '2025-01': '100', '2025-02': '100', '2025-03': '100', '2026-01': '90', '2026-02': '80', '2026-03': '10' }),
    directMonthValue: series({ '2025-01': '1000', '2025-02': '1000', '2025-03': '1000', '2026-01': '900', '2026-02': '800', '2026-03': '100' }),
    awardsBuyers: breakdown('count', [{ key: '1590120', recordCount: '1985', valueSum: '119300000', shareOfScope: '0.05' }]),
    directBuyers: breakdown('value', [{ key: '1590120', recordCount: '7293', valueSum: '93900000', shareOfScope: '0.005' }]),
    awardsSellers: breakdown('value', [{ key: '520042185', recordCount: '1', valueSum: '10330000000' }, { key: null, kind: 'other', recordCount: '38000', valueSum: '38967459325.40' }], '54297167559.00'),
    directSellers: breakdown('value', [{ key: '11805367', recordCount: '44181', valueSum: '68800000', shareOfScope: '0.004' }]),
    procedures: breakdown('count', [{ key: 'Licitatie deschisa', recordCount: '17524', valueSum: '72791764938.30', shareOfScope: '0.443' }]),
    awardsCounties: breakdown('count', [{ key: 'B', recordCount: '10729', valueSum: '60260000000' }, { key: null, kind: 'unknown', recordCount: '985' }]),
    directCounties: breakdown('value', [{ key: 'CJ', recordCount: '108940', valueSum: '783700000' }]),
  }
}

describe('fetchProcurementHomeNational', () => {
  beforeEach(() => graphqlQuery.mockReset())

  it('reads the national picture, then names the ranked parties in one bounded request', async () => {
    graphqlQuery.mockResolvedValueOnce(nationalResponse()).mockResolvedValueOnce({
      authorities: [{ cui: '1590120', canonicalName: 'REGIA NATIONALA A PADURILOR ROMSILVA RA', status: 'named' }],
      suppliers: [{ cui: '11805367', canonicalName: null, status: 'placeholder' }],
    })
    const read = await fetchProcurementHomeNational(2025)

    const [, variables] = graphqlQuery.mock.calls[0] as [string, Record<string, Record<string, unknown>>]
    expect(variables.awards).toEqual({ grain: 'contract', recordKind: 'contract_award', year: 2025 })
    expect(variables.frameworks).toEqual({ grain: 'contract', recordKind: 'framework_agreement', year: 2025 })
    expect(variables.directYears).toEqual({ grain: 'direct_acquisition', from: '2019-01', to: '2026-12' })
    const [, names] = graphqlQuery.mock.calls[1] as [string, Record<string, unknown>]
    // One CUI asked once, whatever the rankings it is in.
    expect(names).toMatchObject({ authorityCuis: ['1590120'], supplierCuis: ['11805367'] })

    expect(read.contract).toEqual({ count: 39_539, valued: 28_839, value: 103_594_626_884.4, buyers: 3_446, suppliers: 8_614 })
    expect(read.frameworks).toBe(88_105)
    expect(read.buyers.direct.rows[0]).toMatchObject({ label: 'Regia Nationala a Padurilor Romsilva RA', count: 7_293, value: 93_900_000 })
    // A placeholder label is no name: the row shows its CUI.
    expect(read.directSellers.rows[0]?.label).toBe('11805367')
    expect(read.buyers.contract.rankedBy).toBe('count')
    // The consortia's money over all the awards' money: firms + the rest + consortia.
    expect(read.consortium?.withheld).toBeCloseTo(54_297_167_559)
    expect(read.consortium?.total).toBeCloseTo(10_330_000_000 + 38_967_459_325.4 + 54_297_167_559)
    expect(read.counties.contract).toEqual([{ code: 'B', value: 60_260_000_000, count: 10_729 }])
    expect(read.cutoff).toEqual({ contract: '2026-01', direct: '2026-02' })
    expect(read.directYears.map((point) => point.year)).toEqual([2019, 2025])
    // The year in progress would only count through its cutoff month; the series here has none of 2026.
  })

  it('keeps an unknown count unknown', async () => {
    graphqlQuery.mockResolvedValueOnce({ ...nationalResponse(), awards: stats(null, null, null), awardsBuyerCount: series({}) }).mockResolvedValueOnce({ authorities: [], suppliers: [] })
    const read = await fetchProcurementHomeNational(2025)
    expect(read.contract.count).toBeNull()
    expect(read.contract.buyers).toBeNull()
  })
})

describe('mapProcurementHomeCategories', () => {
  it('builds the categories for both populations and the roads’ consortium share', () => {
    const empty = breakdown('value', [])
    const read = mapProcurementHomeCategories(procurementHomeCategoriesResponseSchema.parse({
      awardsDivisions: breakdown('value', [{ key: '45', recordCount: '10', valueSum: '100' }]),
      awards_c45: breakdown('value', [{ key: '45230000', recordCount: '10', valueSum: '100' }]),
      awards_k4523: breakdown('value', [{ key: '45233000', recordCount: '10', valueSum: '100' }]),
      directDivisions: breakdown('value', [{ key: '71', recordCount: '5', valueSum: '50' }]),
      roads0: breakdown('value', [{ key: '1', recordCount: '1', valueSum: '11' }], '89'),
      roads1: empty,
    }))
    expect(read.contract.map((row) => [row.category.key, row.value])).toEqual([['drumuri', 100]])
    expect(read.direct.map((row) => [row.category.key, row.value])).toEqual([['proiectare', 50]])
    expect(read.roadsConsortium).toEqual({ withheld: 89, total: 100 })
  })
})

describe('fetchProcurementHomeBigContracts', () => {
  beforeEach(() => graphqlQuery.mockReset())

  it('reads the year’s accepted-value awards and groups a consortium into one contract', async () => {
    const item = (id: string, supplier: string, value = '6143000000') => ({
      id,
      contractNo: '101/1888',
      contractDate: '2025-03-31',
      title: null,
      cpvCode: '45233100',
      authority: { cui: '36727850', name: 'COMPANIA NATIONALA DE INVESTITII RUTIERE', displayName: null },
      supplier: { cui: supplier, name: supplier, displayName: null },
      value: { valueAccepted: true, valueRonComparable: value },
    })
    graphqlQuery.mockResolvedValueOnce({
      procurementContracts: {
        items: [item('1', 'TEHNOSTRADE S.R.L.'), item('2', 'SPEDITION UMB'), { ...item('3', 'X'), value: { valueAccepted: false, valueRonComparable: '999' } }],
      },
    })
    const contracts = await fetchProcurementHomeBigContracts(2025, 8)
    const [, variables] = graphqlQuery.mock.calls[0] as [string, { filter: Record<string, unknown>; rows: number }]
    expect(variables.filter).toMatchObject({ contractDate: { gte: '2025-01-01', lte: '2025-12-31' }, recordKind: { in: ['contract_award'] } })
    expect(variables.rows).toBe(48)
    expect(contracts).toHaveLength(1)
    expect(contracts[0]?.winners.map((winner) => winner.name)).toEqual(['Spedition Umb', 'Tehnostrade S.R.L.'])
    expect(contracts[0]?.buyer.name).toBe('Compania Nationala de Investitii Rutiere')
  })

  const row = (id: string, contractNo: string, value: number) => ({
    id,
    contractNo,
    contractDate: '2025-03-31',
    title: null,
    cpvCode: '45233100',
    authority: { cui: '1', name: 'CNAIR', displayName: null },
    supplier: { cui: id, name: `Firma ${id}`, displayName: null },
    value: { valueAccepted: true, valueRonComparable: String(value) },
  })
  const page = (items: readonly ReturnType<typeof row>[]) => ({ procurementContracts: { items } })

  it('reads on while a full page ends inside a consortium, and keeps only whole contracts', async () => {
    // 1 row per page: page 1 ends on a contract whose other member may follow.
    graphqlQuery
      .mockResolvedValueOnce(page(Array.from({ length: 6 }, (_, index) => row(`a${index}`, 'A', 900))))
      .mockResolvedValueOnce(page([row('a6', 'A', 900), row('b', 'B', 500), row('c', 'C', 400), row('d', 'D', 300), row('e', 'E', 200), row('f', 'F', 100)]))
    const contracts = await fetchProcurementHomeBigContracts(2025, 1)
    expect(graphqlQuery).toHaveBeenCalledTimes(2)
    expect(contracts).toHaveLength(1)
    expect(contracts[0]?.winners).toHaveLength(7)
  })

  it('fails instead of claiming no contracts when every page read ends in one tie', async () => {
    graphqlQuery.mockResolvedValue(page(Array.from({ length: 6 }, (_, index) => row(`t${index}`, `T${index}`, 700))))
    await expect(fetchProcurementHomeBigContracts(2025, 1)).rejects.toThrow('no contract is whole')
    expect(graphqlQuery).toHaveBeenCalledTimes(3)
  })
})

describe('fetchProcurementHomeRecentDirect', () => {
  beforeEach(() => graphqlQuery.mockReset())

  it('dates each purchase by its finalization, the date the month filter selects on', async () => {
    const item = (id: string, publicationDate: string | null, finalizationDate: string) => ({
      id,
      publicationDate,
      finalizationDate,
      title: 'Servicii de proiectare',
      cpvCode: '71320000',
      authority: { cui: '1', name: 'PRIMARIA', displayName: null },
      supplier: { cui: '2', name: 'FIRMA', displayName: null },
      value: { valueAccepted: true, valueRonComparable: '270000' },
    })
    graphqlQuery.mockResolvedValueOnce({ procurementDirectAcquisitions: { items: [item('1', '2026-04-28', '2026-05-03'), item('2', null, '2026-05-20')] } })
    const records = await fetchProcurementHomeRecentDirect('2026-05', 8)
    const [, variables] = graphqlQuery.mock.calls[0] as [string, { filter: Record<string, unknown> }]
    expect(variables.filter).toMatchObject({ publicationDate: { gte: '2026-05-01', lte: '2026-05-31' } })
    expect(records.map((record) => record.date)).toEqual(['2026-05-03', '2026-05-20'])
  })
})
