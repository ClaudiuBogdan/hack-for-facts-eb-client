import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { companyProfile } from '@/features/private-companies/lib/company-profile.fixture'
import { homeYear } from '../lib/home-model'
import { periodOf } from '../lib/profile-period'
import type { SupplierDay, SupplierRow } from './graphql/procurement-supplier-queries'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: (...args: unknown[]) => graphqlQuery(...args) }))
const fetchPrivateCompanyProfile = vi.fn()
vi.mock('@/features/private-companies/api/private-company-api', () => ({ fetchPrivateCompanyProfile: (...args: unknown[]) => fetchPrivateCompanyProfile(...args) }))

const { fetchProcurementSupplier, fetchProcurementSupplierDirect, supplierContractPicture, supplierFigureFields, supplierKeyFields } = await import(
  './procurement-supplier-api'
)

type Raw = Record<string, unknown>

const LATEST = homeYear()
const PART = LATEST + 1
const series = (points: Record<string, string | null>) => [{ points: Object.entries(points).map(([bucket, value]) => ({ bucket, value })), meta: { buildId: '13' } }]
const top = (key: string, recordCount: string, valueSum: string | null, shareOfScope: string | null = null) => ({ key, kind: 'top', recordCount, withValueCount: recordCount, valueSum, shareOfScope })
const months = (year: number, count: string, through = 12) =>
  Object.fromEntries(Array.from({ length: through }, (_, index) => [`${year}-${String(index + 1).padStart(2, '0')}`, count]))

/** Every analysis alias of a request answered empty, as the API answers a scope with no records. */
function emptyAnalysis(query: string): Raw {
  const raw: Raw = {}
  for (const [, alias, kind] of query.matchAll(/(\w+): procurement(Stats|Series|Breakdown)\(/g)) {
    raw[alias as string] =
      kind === 'Stats'
        ? { blocks: [{ recordCount: '0', withValueCount: '0', valueAwardedSum: null }] }
        : kind === 'Series'
          ? [{ points: [], meta: { buildId: '13' } }]
          : [{ rankedBy: 'value', buckets: [] }]
  }
  return raw
}

function row(id: string, fields: Partial<SupplierRow> = {}): SupplierRow {
  return {
    id,
    noticeNo: `CAN-${id}`,
    contractNo: `N-${id}`,
    contractDate: `${LATEST}-03-26`,
    title: null,
    cpvCode: '45232150',
    authority: { cui: '2665900', name: 'SC COMPANIA REGIONALA DE APA BACAU SA', displayName: null },
    supplier: { cui: '103029862', name: 'HYDROSTROY AD', displayName: null },
    value: { valueAccepted: true, valueRonComparable: '33012397.00' },
    ...fields,
  }
}

/** Another firm's row on the same award. */
const member = (id: string, of: SupplierRow, cui: string | null, name: string): SupplierRow => ({ ...of, id, supplier: { cui, name, displayName: null } })

interface Answers {
  readonly rows?: readonly SupplierRow[]
  readonly total?: number
  /** Other firms' rows, found on their buyer's day. */
  readonly others?: readonly SupplierRow[]
  readonly analysis?: Readonly<Record<string, Raw>>
  readonly failing?: readonly string[]
}

/** The API, answering each request by its operation name. */
function answer({ rows = [], total = rows.length, others = [], analysis = {}, failing = [] }: Answers) {
  graphqlQuery.mockImplementation(async (query: string, variables: Raw, options: { readonly operationName: string }) => {
    const { operationName } = options
    if (failing.includes(operationName)) throw new Error(`${operationName} failed`)
    if (operationName === 'ProcurementSupplierRows') {
      const raw: Raw = { rows: { total, items: rows } }
      for (const alias of Object.keys(variables)) if (alias !== 'rows') raw[alias] = { total: alias === `y${LATEST}` ? total : 0 }
      return raw
    }
    if (operationName === 'ProcurementSupplierPartners') {
      const raw: Raw = {}
      for (const [alias, filter] of Object.entries(variables)) {
        const { authorityCui, contractDate } = filter as { readonly authorityCui: { eq: string }; readonly contractDate: { gte: string } }
        const items = [...rows, ...others].filter((item) => item.authority.cui === authorityCui.eq && item.contractDate === contractDate.gte)
        raw[alias] = { total: items.length, items }
      }
      return raw
    }
    if (operationName === 'ProcurementSupplierDirect') return { procurementDirectAcquisitions: { items: [] } }
    return { ...emptyAnalysis(query), ...(operationName === 'ProcurementSupplierNames' ? { labels: [] } : {}), ...(analysis[operationName] ?? {}) }
  })
}

const calls = (operationName: string) => graphqlQuery.mock.calls.filter(([, , options]) => (options as { operationName: string }).operationName === operationName)
const call = (operationName: string) => calls(operationName)[0]

beforeEach(() => {
  graphqlQuery.mockReset()
  fetchPrivateCompanyProfile.mockReset()
  fetchPrivateCompanyProfile.mockResolvedValue(companyProfile({ cui: '103029862', legalName: 'HYDROSTROY AD' }))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the fields', () => {
  it('scopes a complete year by the year, and compares with the whole year before', () => {
    const fields = supplierFigureFields('9813902', periodOf(LATEST, LATEST, null))
    expect(fields.find((field) => field.alias === 'direct')?.scope).toEqual({ supplierCui: '9813902', year: LATEST, grain: 'direct_acquisition' })
    expect(fields.find((field) => field.alias === 'directPrev')?.scope).toEqual({ supplierCui: '9813902', year: LATEST - 1, grain: 'direct_acquisition' })
  })

  it('scopes the year in progress through its cutoff, and compares it with nothing', () => {
    const period = periodOf(PART, LATEST, { direct: `${PART}-06`, contract: `${PART}-05` })
    const fields = supplierFigureFields('9813902', period)
    expect(fields.find((field) => field.alias === 'awards')?.scope).toEqual({ supplierCui: '9813902', from: `${PART}-01`, to: `${PART}-05`, grain: 'contract', recordKind: 'contract_award' })
    expect(fields.some((field) => field.alias === 'directPrev')).toBe(false)
    expect(supplierKeyFields('9813902', period)[0]?.scope).toMatchObject({ from: `${PART}-01`, to: `${PART}-05` })
    expect(supplierFigureFields('9813902', periodOf(PART, LATEST, null)).some((field) => field.alias === 'directPrev')).toBe(false)
  })
})

describe('supplierContractPicture', () => {
  const read = (rows: readonly SupplierRow[], total: number | null = rows.length) => ({ total: total ?? rows.length, counted: total !== null, rows, years: new Map(), partMonths: new Map() })
  /** Every buyer's day the rows fall on, as the scan reads it: all its award rows, or `total` of them. */
  const daysOf = (rows: readonly SupplierRow[], total?: number): ReadonlyMap<string, SupplierDay> => {
    const days = new Map<string, SupplierDay['items']>()
    for (const item of rows) {
      const day = `${item.authority.cui}|${item.contractDate}`
      days.set(day, [...(days.get(day) ?? []), item])
    }
    return new Map([...days].map(([day, items]) => [day, { total: total ?? items.length, items }]))
  }
  const priced = (value: string) => ({ value: { valueAccepted: true, valueRonComparable: value } })

  it('counts rows, names each award’s partners once, and takes an award published twice once in the money', () => {
    const alone = row('r2', { noticeNo: 'CAN2', contractNo: 'R1161', ...priced('60699268.97'), authority: { cui: '16868757', name: 'SC AQUACARAS SA', displayName: null } })
    const first = row('r1', { noticeNo: 'CAN1', contractNo: '1642', ...priced('59018046.00') })
    const again = row('r1b', { noticeNo: 'CAN1', contractNo: '1642 ', ...priced('59018046.20') })
    const own = [alone, first, again]
    const days = daysOf([...own, member('x1', first, '15993042', 'DEXAMART SRL'), member('x2', first, null, '"PATSTROY VDH" EAD'), member('x3', again, '15993042', 'DEXAMART SRL')])
    const picture = supplierContractPicture('103029862', 'Hydrostroy AD', read(own), days, new Map([['2665900', 'BC'], ['16868757', 'CS']]))
    expect(picture).toMatchObject({ count: 3, scanned: 3, together: 2, togetherContracts: 1, togetherValued: 1, togetherValue: 59_018_046 })
    // A partner counts once per award, however many rows the award has.
    expect(picture.partners.map((entry) => [entry.name, entry.contracts])).toEqual([
      ['"Patstroy Vdh" EAD', 1],
      ['Dexamart SRL', 1],
    ])
    expect(picture.partners[0]?.cui).toBeNull()
    expect(picture.largest.map((record) => record.winners.map((winner) => winner.name))).toEqual([['Hydrostroy AD'], ['Hydrostroy AD', 'Dexamart SRL', '"Patstroy Vdh" EAD']])
    expect(picture.clients?.rows.map((client) => [client.cui, client.count])).toEqual([
      ['2665900', 2],
      ['16868757', 1],
    ])
    expect(picture.counties?.map((county) => county.code)).toEqual(['BC', 'CS'])
    expect(picture.categories?.[0]?.count).toBe(2)
    expect(picture).toMatchObject({ buyers: 2, unresolved: 0 })
  })

  it('lists each value of a contract published at several, never sums them, and keeps a partner on every value a consortium', () => {
    const values = ['8780743.00', '9054097.00', '9313000.00']
    const own = values.map((value, index) => row(`v${index}`, { noticeNo: 'SCNA1099802', contractNo: '121', ...priced(value), supplier: { cui: '15993042', name: 'DEXAMART SRL', displayName: null } }))
    const partner = own.map((mine, index) => member(`p${index}`, mine, '1', 'ROMAN IMPEX SRL'))
    const picture = supplierContractPicture('15993042', 'Dexamart SRL', read(own), daysOf([...own, ...partner]), null)
    expect(picture.largest.map((record) => record.value)).toEqual([9_313_000, 9_054_097, 8_780_743])
    expect(picture).toMatchObject({ count: 3, together: 3, togetherContracts: 1, togetherValued: 0, togetherValue: null })
    expect(picture.partners.map((entry) => [entry.name, entry.contracts])).toEqual([['Roman Impex SRL', 1]])
    expect(picture.categories?.[0]).toMatchObject({ count: 3, value: null })
  })

  it('does not call a framework’s lots a consortium: each lot has its own competing distributors', () => {
    const lot = (id: string, value: string, title: string | null) =>
      row(id, { noticeNo: 'CAN1018401', contractNo: '4808', title, ...priced(value), authority: { cui: '4557951', name: 'SPITALUL JUDETEAN', displayName: null } })
    const framework = [lot('a', '120000.00', 'Acord-cadru furnizare medicamente'), lot('b', '80000.00', 'Acord-cadru furnizare medicamente')]
    // The same partner on every lot, but a framework by its title.
    const alike = supplierContractPicture('9', 'Farma SRL', read(framework), daysOf([...framework, member('x', framework[0]!, '7', 'MEDIC SRL'), member('y', framework[1]!, '7', 'MEDIC SRL')]), null)
    expect(alike).toMatchObject({ together: 0, togetherContracts: 0, partners: [] })
    expect(alike.largest.map((record) => record.winners.length)).toEqual([1, 1])
    // No framework in the title, but other firms on each lot.
    const untitled = framework.map((own) => ({ ...own, title: null }))
    const lots = supplierContractPicture('9', 'Farma SRL', read(untitled), daysOf([...untitled, member('x', untitled[0]!, '7', 'MEDIC SRL'), member('y', untitled[1]!, '8', 'PHARMA SRL')]), null)
    expect(lots).toMatchObject({ together: 0, partners: [] })
  })

  it('takes a member row with no value into the award when the contract has one value, and cannot place it when it has several', () => {
    const own = row('r1', priced('451166312.00'))
    const blank = { ...member('p1', own, '206474936', '"PATSTROY VDH" EAD'), value: { valueAccepted: false, valueRonComparable: null } }
    expect(supplierContractPicture('103029862', 'Hydrostroy AD', read([own]), daysOf([own, blank]), null)).toMatchObject({ together: 1, unresolved: 0 })
    const lot = member('p2', { ...own, ...priced('9000.00') }, '5', 'ALTA SRL')
    expect(supplierContractPicture('103029862', 'Hydrostroy AD', read([own]), daysOf([own, blank, lot]), null)).toMatchObject({ together: 0, unresolved: 1 })
  })

  it('reads a twin row with no buyer by its award, and a day fuller than the read as unresolved', () => {
    const own = row('r1')
    const twin = { ...own, id: 'r1b', authority: { cui: null, name: 'SC COMPANIA REGIONALA DE APA BACAU SA', displayName: null } }
    const withTwin = supplierContractPicture('103029862', 'Hydrostroy AD', read([own, twin]), daysOf([own, member('x', own, '15993042', 'DEXAMART SRL')]), null)
    expect(withTwin).toMatchObject({ together: 2, unresolved: 0, togetherContracts: 1 })
    expect(supplierContractPicture('103029862', 'Hydrostroy AD', read([own]), daysOf([own], 150), null)).toMatchObject({ together: 0, unresolved: 1 })
    expect(supplierContractPicture('103029862', 'Hydrostroy AD', read([own]), null, null)).toMatchObject({ together: 0, unresolved: 1 })
  })

  it('counts every client institution, and ranks the first ten', () => {
    const rows = Array.from({ length: 12 }, (_, index) => row(`r${index}`, { authority: { cui: String(1000 + index), name: `PRIMARIA ${index}`, displayName: null } }))
    const picture = supplierContractPicture('103029862', 'Hydrostroy AD', read(rows), daysOf(rows), null)
    expect(picture.buyers).toBe(12)
    expect(picture.clients?.rows).toHaveLength(10)
  })

  it('leaves clients, categories and counties to the analysis when not every row was read, or the rows were not counted', () => {
    const cut = supplierContractPicture('103029862', 'Hydrostroy AD', read([row('r1')], 250), null, null)
    expect(cut).toMatchObject({ count: 250, scanned: 1, clients: null, buyers: null, categories: null, counties: null })
    expect(supplierContractPicture('103029862', 'Hydrostroy AD', read([row('r1')], null), null, null)).toMatchObject({ count: 1, clients: null, categories: null })
  })
})

describe('fetchProcurementSupplier', () => {
  it('finds co-winners on their buyer’s day by notice and contract number, whatever their value', async () => {
    const own = row('r1', { noticeNo: 'CAN1136776', contractNo: '92/110645', value: { valueAccepted: true, valueRonComparable: '451166312.00' }, authority: { cui: '16054368', name: 'CNAIR', displayName: null } })
    answer({
      rows: [own],
      others: [
        // A member whose row carries no value is still a member.
        { ...member('p1', own, '206474936', '"PATSTROY VDH" EAD'), value: { valueAccepted: false, valueRonComparable: null } },
        // Another award of the same buyer and day is not.
        row('n1', { noticeNo: 'CAN9', contractNo: '93/1', authority: own.authority, supplier: { cui: '1', name: 'ALTA SRL', displayName: null } }),
      ],
      analysis: { ProcurementSupplierPlaces: { c0: [{ rankedBy: 'count', buckets: [top('B', '10', null)] }] } },
    })
    const profile = await fetchProcurementSupplier('103029862', LATEST)
    expect(profile).toMatchObject({ name: 'Hydrostroy AD', partial: false, countiesOf: 'contracts', period: { kind: 'year', year: LATEST, through: null } })
    expect(profile.contracts).toMatchObject({ count: 1, together: 1, unresolved: 0 })
    expect(profile.contracts.partners.map((partner) => partner.name)).toEqual(['"Patstroy Vdh" EAD'])
    expect(profile.counties).toEqual([{ code: 'B', count: 1, value: null, share: 1 }])
    expect(call('ProcurementSupplierPartners')?.[1]).toEqual({
      d0: { authorityCui: { eq: '16054368' }, contractDate: { gte: `${LATEST}-03-26`, lte: `${LATEST}-03-26` }, recordKind: { in: ['contract_award'] } },
    })
  })

  it('counts a row with no notice or contract number as unresolved, and says no partnership for it', async () => {
    answer({ rows: [row('r1', { noticeNo: null })] })
    const profile = await fetchProcurementSupplier('103029862', LATEST)
    expect(profile.contracts).toMatchObject({ together: 0, unresolved: 1 })
    expect(calls('ProcurementSupplierPartners')).toHaveLength(0)
  })

  it('searches forty buyer-days per request at most, and places every buyer in requests of fifty', async () => {
    const rows = Array.from({ length: 60 }, (_, index) => row(`r${index}`, { authority: { cui: String(1000 + index), name: `PRIMARIA ${index}`, displayName: null } }))
    answer({ rows })
    const profile = await fetchProcurementSupplier('103029862', LATEST)
    expect(calls('ProcurementSupplierPartners').map(([, variables]) => Object.keys(variables as Raw).length)).toEqual([40, 20])
    expect(calls('ProcurementSupplierPlaces').map(([query]) => ((query as string).match(/: procurementBreakdown\(/g) ?? []).length)).toEqual([50, 10])
    expect(profile.partial).toBe(false)
  })

  it('names the firm by the registry, and weighs it in its largest clients’ own purchases', async () => {
    fetchPrivateCompanyProfile.mockResolvedValue(companyProfile({ cui: '9813902', legalName: 'COSTALEX CONSTRUCT SRL' }))
    answer({
      analysis: {
        ProcurementSupplierKeys: { directClients: [{ rankedBy: 'value', buckets: [top('4540313', '1', '491597', '0.1')] }] },
        ProcurementSupplierWeights: {
          w0: { blocks: [{ recordCount: '9', withValueCount: '9', valueAwardedSum: '1695162' }] },
          f0: [{ rankedBy: 'value', buckets: [top('9813902', '1', '491597')] }],
        },
        ProcurementSupplierNames: {
          labels: [
            { cui: '9813902', canonicalName: 'COSTALEX CONSTRUCT SRL', status: 'named' },
            { cui: '4540313', canonicalName: 'GRADINITA NR 1 OTOPENI', status: 'named' },
          ],
        },
      },
    })
    const profile = await fetchProcurementSupplier('9813902', LATEST)
    expect(profile.name).toBe('Costalex Construct SRL')
    expect(profile.names.get('4540313')).toBe('Gradinita Nr 1 Otopeni')
    expect(profile.weights.get('4540313')?.first).toBe(true)
    expect(profile.weights.get('4540313')?.share).toBeCloseTo(0.29, 2)
  })

  it('names an institution the spine cannot from the firm’s own direct purchase from it', async () => {
    answer({
      analysis: {
        ProcurementSupplierKeys: { directClients: [{ rankedBy: 'value', buckets: [top('4540054', '2', '663935', '0.13')] }] },
        ProcurementSupplierNames: { labels: [{ cui: '103029862', canonicalName: 'HYDROSTROY AD', status: 'named' }, { cui: '4540054', canonicalName: null, status: 'placeholder' }] },
        ProcurementSupplierDirectNames: { n0: { items: [{ authority: { cui: '4540054', name: 'LICEUL TEORETIC IOAN PETRUS OTOPENI', displayName: null } }] } },
      },
    })
    const profile = await fetchProcurementSupplier('103029862', LATEST)
    expect(profile.names.get('4540054')).toBe('Liceul Teoretic Ioan Petrus Otopeni')
    expect(call('ProcurementSupplierDirectNames')?.[1]).toEqual({ n0: { supplierCui: { eq: '103029862' }, authorityCui: { eq: '4540054' } } })
  })

  it('builds the years from the months', async () => {
    answer({ analysis: { ProcurementSupplierFigures: { directMonthsValue: series({ '2019-01': '100', '2019-02': '50' }), directMonthsCount: series({ '2019-01': '2', '2019-02': '1' }) } } })
    const profile = await fetchProcurementSupplier('9813902', LATEST)
    expect(profile.directYears).toEqual([{ year: 2019, value: 150, count: 3 }])
  })

  it('stays whole without the registry’s record of a foreign firm, and goes partial when the registry fails', async () => {
    answer({})
    fetchPrivateCompanyProfile.mockResolvedValue(null)
    expect(await fetchProcurementSupplier('103029862', LATEST)).toMatchObject({ partial: false, registryFailed: false })
    fetchPrivateCompanyProfile.mockRejectedValue(new Error('registry down'))
    expect(await fetchProcurementSupplier('103029862', LATEST)).toMatchObject({ partial: true, registry: null, registryFailed: true })
  })

  it('goes partial, not failing, when a follow-up fails; fails when a first read does', async () => {
    answer({ rows: [row('r1')], failing: ['ProcurementSupplierPartners'] })
    expect((await fetchProcurementSupplier('103029862', LATEST)).partial).toBe(true)
    answer({ failing: ['ProcurementSupplierFigures'] })
    await expect(fetchProcurementSupplier('103029862', LATEST)).rejects.toThrow('ProcurementSupplierFigures failed')
  })

  it('reads the year in progress through the cutoff, and counts its contracts to that month', async () => {
    // Past the kept national read of the tests before.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 60 * 60 * 1000)
    answer({
      analysis: {
        ProcurementCutoff: {
          nationalDirectMonths: series({ ...months(LATEST, '160000'), ...months(PART, '150000', 6) }),
          nationalAwardMonths: series({ ...months(LATEST, '3000'), ...months(PART, '3000', 5) }),
        },
      },
    })
    const profile = await fetchProcurementSupplier('103029862', PART)
    expect(profile).toMatchObject({ period: { kind: 'year', year: PART, through: `${PART}-05` }, partial: false })
    expect((call('ProcurementSupplierRows')?.[1] as { rows: { contractDate: unknown } }).rows.contractDate).toEqual({ gte: `${PART}-01-01`, lte: `${PART}-05-31` })
    expect((call('ProcurementSupplierFigures')?.[1] as Raw).direct).toMatchObject({ from: `${PART}-01`, to: `${PART}-05` })
  })

  it('goes partial when the cutoff cannot be read, whatever the year: the chart’s year in progress hangs on it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000)
    answer({ failing: ['ProcurementCutoff'] })
    expect(await fetchProcurementSupplier('103029862', PART)).toMatchObject({ period: { through: null }, partial: true, directPrev: null })
    // A complete year still reads whole, with its comparison.
    expect(await fetchProcurementSupplier('103029862', LATEST)).toMatchObject({ period: { through: null }, partial: true, cutoff: { direct: null, contract: null } })
    expect(call('ProcurementSupplierFigures')?.[1]).toMatchObject({ direct: { year: PART } })
  })

  it('reads the last twelve months through the cutoff, against the twelve before; their institutions through the ranking, a floor at a hundred', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 3 * 60 * 60 * 1000)
    const clients = (count: number, rest = '0') => [
      { rankedBy: 'count', buckets: [...Array.from({ length: count }, (_, index) => top(String(1000 + index), '1', null)), { key: null, kind: 'other', recordCount: rest, withValueCount: rest, valueSum: null, shareOfScope: null }] },
    ]
    answer({
      analysis: {
        ProcurementCutoff: {
          nationalDirectMonths: series({ ...months(LATEST, '160000'), ...months(PART, '150000', 6) }),
          nationalAwardMonths: series({ ...months(LATEST, '3000'), ...months(PART, '3000', 5) }),
        },
        ProcurementSupplierFigures: { directBuyers: clients(7) },
      },
    })
    const profile = await fetchProcurementSupplier('9813902', 'recent')
    expect(profile).toMatchObject({ period: { kind: 'recent', from: `${LATEST}-06`, through: `${PART}-05` }, direct: { clients: 7, clientsAtLeast: false } })
    const figures = call('ProcurementSupplierFigures')?.[1] as Raw
    expect(figures.direct).toMatchObject({ from: `${LATEST}-06`, to: `${PART}-05` })
    expect(figures.directPrev).toMatchObject({ from: `${LATEST - 1}-06`, to: `${LATEST}-05` })
    expect(call('ProcurementSupplierFigures')?.[0]).toContain('directBuyers: procurementBreakdown(scope: $directBuyers, dimension: authority, topN: 100, rankBy: count)')
    expect((call('ProcurementSupplierRows')?.[1] as { rows: { contractDate: unknown } }).rows.contractDate).toEqual({ gte: `${LATEST}-06-01`, lte: `${PART}-05-31` })
    // Past the ranking's hundred, the rest of the records are other institutions': a floor. Exactly a hundred is a hundred.
    answer({ analysis: { ProcurementSupplierFigures: { directBuyers: clients(100, '629') } } })
    expect((await fetchProcurementSupplier('8971726', 'recent')).direct).toMatchObject({ clients: 100, clientsAtLeast: true })
    answer({ analysis: { ProcurementSupplierFigures: { directBuyers: clients(100) } } })
    expect((await fetchProcurementSupplier('8971726', 'recent')).direct).toMatchObject({ clients: 100, clientsAtLeast: false })
  })

  it('fails when the reader leaves, even while a read it cannot cancel is still out', async () => {
    const controller = new AbortController()
    answer({})
    fetchPrivateCompanyProfile.mockImplementation(() => new Promise(() => undefined))
    const read = fetchProcurementSupplier('103029862', LATEST, controller.signal)
    controller.abort(new Error('left'))
    await expect(read).rejects.toThrow('left')
  })
})

describe('fetchProcurementSupplierDirect', () => {
  it('reads the year’s largest direct purchases by the firm, valued ones only', async () => {
    graphqlQuery.mockResolvedValue({
      procurementDirectAcquisitions: {
        items: [
          { id: 'd1', publicationDate: null, finalizationDate: '2025-12-16', title: 'STATIE POMPARE APE PLUVIALE', cpvCode: '45232150', authority: { cui: '4364446', name: 'ORASUL OTOPENI', displayName: null }, supplier: { cui: '9813902', name: 'COSTALEX', displayName: null }, value: { valueAccepted: true, valueRonComparable: '899122.00' } },
          { id: 'd2', publicationDate: null, finalizationDate: '2025-12-17', title: null, cpvCode: null, authority: { cui: '4364446', name: 'ORASUL OTOPENI', displayName: null }, supplier: { cui: '9813902', name: 'COSTALEX', displayName: null }, value: { valueAccepted: false, valueRonComparable: null } },
        ],
      },
    })
    const records = await fetchProcurementSupplierDirect('9813902', LATEST, 8)
    expect(records.map((record) => [record.id, record.value, record.title])).toEqual([['d1', 899_122, 'Statie pompare ape pluviale']])
    expect(graphqlQuery.mock.calls[0]?.[1]).toMatchObject({ filter: { supplierCui: { eq: '9813902' }, publicationDate: { gte: `${LATEST}-01-01`, lte: `${LATEST}-12-31` } }, rows: 8 })
  })
})
