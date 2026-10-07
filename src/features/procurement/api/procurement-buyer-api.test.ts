import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { periodOf, type Cutoff } from '../lib/profile-period'

const graphqlQuery = vi.fn()
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: (...args: unknown[]) => graphqlQuery(...args) }))
// SEAP's cutoff is the shared read (tested beside it): here each test says what it is.
const cutoffRead = vi.fn<() => Promise<Cutoff>>()
vi.mock('./procurement-cutoff', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./procurement-cutoff')>()
  return {
    ...actual,
    readProcurementCutoff: () => cutoffRead(),
    readCutoffOutcome: () => cutoffRead().then((cutoff) => ({ cutoff, failed: false }), () => ({ cutoff: actual.NO_CUTOFF, failed: true })),
  }
})

const { buyerProfileFields, fetchProcurementBuyer, fetchProcurementBuyerRecords } = await import('./procurement-buyer-api')

const CUTOFF: Cutoff = { direct: '2026-02', contract: '2026-02' }

/** Every alias of the profile answered empty, as the API answers a scope with no records; a test overrides what it reads. */
function emptyProfile(cui: string, year: number, latest: number): Record<string, unknown> {
  const raw: Record<string, unknown> = {}
  for (const field of buyerProfileFields(cui, periodOf(year, latest, CUTOFF), latest)) {
    raw[field.alias] =
      field.kind === 'stats'
        ? { blocks: [{ recordCount: '0', withValueCount: '0', valueAwardedSum: null }] }
        : field.kind === 'series'
          ? [{ points: [], meta: { buildId: '13' } }]
          : field.kind === 'concentration'
            ? [{ supplierCount: 0 }]
            : [{ rankedBy: 'value', buckets: [] }]
  }
  return raw
}

const series = (points: Record<string, string | null>) => [{ points: Object.entries(points).map(([bucket, value]) => ({ bucket, value })), meta: { buildId: '13' } }]
const top = (key: string, recordCount: string, valueSum: string | null, shareOfScope: string | null = null) => ({ key, kind: 'top', recordCount, valueSum, shareOfScope })

function otopeni(): Record<string, unknown> {
  return {
    ...emptyProfile('4364446', 2025, 2025),
    direct: { blocks: [{ recordCount: '293', withValueCount: '293', valueAwardedSum: '36404736.58' }] },
    directPrev: { blocks: [{ recordCount: '207', withValueCount: '207', valueAwardedSum: '25300000.00' }] },
    awards: { blocks: [{ recordCount: '12', withValueCount: '5', valueAwardedSum: '15067226.00' }] },
    frameworks: { blocks: [{ recordCount: '1', withValueCount: '0', valueAwardedSum: null }] },
    directSellers: [{ supplierCount: 72 }],
    directYearsValue: series({ '2019': '28400000', '2025': '36404736.58', '2026': '2600000' }),
    directYearsCount: series({ '2019': '270', '2025': '293', '2026': '46' }),
    directPartValue: series({ '2026-01': '1000000', '2026-02': '1000000', '2026-03': '600000' }),
    directPartCount: series({ '2026-01': '20', '2026-02': '20', '2026-03': '6' }),
    directSuppliers: [{ rankedBy: 'value', buckets: [top('30153499', '14', '4590000', '0.126'), top('00041200627', '2', '100000', '0.003'), { key: null, kind: 'other', recordCount: '240', valueSum: '15740000', shareOfScope: '0.43' }] }],
    directCounties: [{ rankedBy: 'value', buckets: [top('IF', '97', '18500000', '0.51'), top('B', '137', '12380000', '0.34')] }],
    spanSuppliers: [{ rankedBy: 'value', buckets: [top('9813902', '40', '21600000')] }],
    entity: {
      annualPopulation: { year: 2025, population: '22660' },
      organization: { name: 'ORASUL OTOPENI' },
      territory: { kind: 'town', name: 'ORAȘ OTOPENI', countyCode: 'IF', countyName: 'ILFOV' },
      reference: {
        name: 'ORASUL OTOPENI',
        address: 'Ilfov, Orasul Otopeni, STRADA 23 August, Numar 10, Bloc/Scara , Sector , Cod postal 75100',
        entityType: 'uat',
        isTerritorialExecutive: true,
      },
      budget: { presence: true },
    },
  }
}

function extras(): Record<string, unknown> {
  return {
    s0: series({ '2019': '8000000', '2025': '2960000' }),
    county: { blocks: [{ recordCount: '9000', withValueCount: '9000', valueAwardedSum: '560000000' }] },
    // Positional: the buyer's own label first, then its firms; the foreign identifier answers `unavailable` with no CUI.
    labels: [
      { cui: '4364446', canonicalName: 'ORASUL OTOPENI', status: 'named' },
      { cui: '30153499', canonicalName: 'UPPER LEVEL SRL', status: 'named' },
      { cui: null, canonicalName: null, status: 'unavailable' },
      { cui: '9813902', canonicalName: 'COSTALEX CONSTRUCT SRL', status: 'named' },
    ],
  }
}

describe('fetchProcurementBuyer', () => {
  beforeEach(() => {
    graphqlQuery.mockReset()
    cutoffRead.mockReset()
    cutoffRead.mockResolvedValue(CUTOFF)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-27T10:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  /** Answers each request by its operation: the profile's three with the raw read, the follow-up in turn. */
  function answer(raw: Record<string, unknown>, ...followUps: (() => Promise<unknown>)[]) {
    graphqlQuery.mockImplementation((_query: string, _variables: unknown, options: { readonly operationName: string }) => {
      if (options.operationName === 'ProcurementBuyerIdentity') return Promise.resolve({ entity: raw.entity ?? null })
      if (options.operationName !== 'ProcurementBuyerExtras') return Promise.resolve(raw)
      const next = followUps.shift()
      return next ? next() : Promise.reject(new Error('no follow-up left'))
    })
  }

  const callOf = (operationName: string) =>
    graphqlQuery.mock.calls.find((call) => (call[2] as { readonly operationName: string }).operationName === operationName) as
      | [string, Record<string, unknown>, { readonly operationName: string }]
      | undefined

  it('reads the profile as three requests side by side and the identity in its own, each with only its own fields', async () => {
    answer(otopeni(), () => Promise.resolve(extras()))
    await fetchProcurementBuyer('4364446', 2025)
    const [keys, figures, categories, identity] = ['ProcurementBuyerKeys', 'ProcurementBuyerFigures', 'ProcurementBuyerCategories', 'ProcurementBuyerIdentity'].map((name) =>
      callOf(name),
    )
    expect(Object.keys(keys?.[1] ?? {}).sort()).toEqual(['awardSuppliers', 'buyerCounty', 'directSuppliers', 'spanSuppliers'])
    expect(keys?.[0]).not.toContain('entity(')
    expect(identity?.[0]).toContain('entity(cui: $entityCui)')
    expect(identity?.[1]).toEqual({ entityCui: '4364446', populationYear: 2025 })
    // SEAP's cutoff is the shared read, not the buyer's.
    expect(figures?.[1]).not.toHaveProperty('nationalDirectMonths')
    expect(figures?.[1]).toHaveProperty('directPrev')
    expect(figures?.[1]).toMatchObject({ direct: { authorityCui: '4364446', year: 2025 } })
    expect(figures?.[1]).not.toHaveProperty('modifications')
    expect(figures?.[1]).not.toHaveProperty('directDivisions')
    expect(figures?.[0]).not.toContain('entity(')
    expect(categories?.[1]).toHaveProperty('directDivisions')
    expect(Object.keys(categories?.[1] ?? {}).sort()).toEqual(
      ['Categories', 'Classes', 'Divisions', 'Groups'].flatMap((level) => [`awards${level}`, `direct${level}`]).sort(),
    )
    expect(categories?.[1]).not.toHaveProperty('direct')
  })

  it('names its firms and reads their years and the county once the keys land', async () => {
    answer(otopeni(), () => Promise.resolve(extras()))
    const profile = await fetchProcurementBuyer('4364446', 2025)
    expect(graphqlQuery).toHaveBeenCalledTimes(5)

    expect(profile.identity).toMatchObject({ name: 'Orașul Otopeni', isTownHall: true, hasBudget: true, population: { year: 2025, value: 22_660 } })
    expect(profile.identity.address).toBe('Orasul Otopeni, Str. 23 August, nr. 10, 75100')
    expect(profile).toMatchObject({ period: { kind: 'year', year: 2025, through: null }, latest: 2025, county: 'IF', frameworks: 1, partial: false })
    expect(profile.direct).toEqual({ count: 293, valued: 293, value: 36_404_736.58, suppliers: 72 })
    // The chart's year in progress runs through SEAP's cutoff (February), not through every month it has.
    expect(profile.cutoff).toEqual(CUTOFF)
    expect(profile.directYears.find((point) => point.year === 2026)).toEqual({ year: 2026, value: 2_000_000, count: 40 })
    expect(profile.partYear).toBe(2026)
    // „other" is not a firm; a firm the spine cannot name keeps its CUI.
    expect(profile.directSuppliers.rows.map((row) => row.cui)).toEqual(['30153499', '00041200627'])
    expect(profile.names.get('30153499')).toBe('Upper Level SRL')
    expect(profile.names.has('00041200627')).toBe(false)
    expect(profile.supplierYears[0]).toMatchObject({ cui: '9813902', total: 10_960_000 })
    expect(profile.countyShare?.share).toBeCloseTo(36_404_736.58 / 560_000_000, 6)

    const extrasVariables = callOf('ProcurementBuyerExtras')?.[1] ?? {}
    expect(extrasVariables.cuis).toEqual(['4364446', '30153499', '00041200627', '9813902'])
    expect(extrasVariables.county).toEqual({ buyerCounty: 'IF', year: 2025, grain: 'direct_acquisition' })
  })

  it('asks the budget platform only for a CUI it can hold, and falls back to the county on the records', async () => {
    const raw = otopeni()
    delete raw.entity
    raw.buyerCounty = [{ rankedBy: 'count', buckets: [top('B', '10', null)] }]
    // Nor can the identity spine name it: the CUI is all the page has.
    const unnamed = extras()
    answer(raw, () => Promise.resolve({ ...unnamed, labels: [{ cui: null, canonicalName: null, status: 'unavailable' }, ...(unnamed.labels as unknown[]).slice(1)] }))
    const profile = await fetchProcurementBuyer('123456789012', 2025)
    expect(callOf('ProcurementBuyerIdentity')).toBeUndefined()
    expect(profile.identity).toMatchObject({ name: '123456789012', entityType: null, isTownHall: false, hasBudget: false })
    expect(profile.county).toBe('B')
    expect(callOf('ProcurementBuyerExtras')?.[1].county).toEqual({ buyerCounty: 'B', year: 2025, grain: 'direct_acquisition' })
  })

  it('reads no year before 2019, which does not compare', async () => {
    answer(emptyProfile('4364446', 2019, 2025), () => Promise.resolve(extras()))
    const profile = await fetchProcurementBuyer('4364446', 2019)
    expect(callOf('ProcurementBuyerFigures')?.[1]).not.toHaveProperty('directPrev')
    expect(profile.directPrev).toBeNull()
  })

  it('stands without the budget platform: a failed identity read names the buyer by its label, and is not kept', async () => {
    const raw = otopeni()
    graphqlQuery.mockImplementation((_query: string, _variables: unknown, options: { readonly operationName: string }) => {
      if (options.operationName === 'ProcurementBuyerIdentity') return Promise.reject(new Error('budget database down'))
      if (options.operationName === 'ProcurementBuyerExtras') return Promise.resolve(extras())
      const { entity: _entity, ...rest } = raw
      return Promise.resolve(rest)
    })
    const profile = await fetchProcurementBuyer('4364446', 2025)
    // Served, never kept: the next visit reads the identity again.
    expect(profile).toMatchObject({ partial: true, namesUnread: false, county: null })
    expect(profile.identity).toMatchObject({ name: 'Orasul Otopeni', entityType: null, hasBudget: false })
    expect(profile.names.get('30153499')).toBe('Upper Level SRL')
  })

  it('reads the year in progress through the cutoff month, compared with nothing, its county likewise', async () => {
    cutoffRead.mockResolvedValue({ direct: '2026-06', contract: '2026-05' })
    answer(otopeni(), () => Promise.resolve(extras()))
    const profile = await fetchProcurementBuyer('4364446', 2026)
    const figures = callOf('ProcurementBuyerFigures')?.[1] ?? {}
    expect(figures.direct).toEqual({ authorityCui: '4364446', from: '2026-01', to: '2026-05', grain: 'direct_acquisition' })
    expect(figures).not.toHaveProperty('directPrev')
    expect(callOf('ProcurementBuyerExtras')?.[1].county).toEqual({ buyerCounty: 'IF', from: '2026-01', to: '2026-05', grain: 'direct_acquisition' })
    // The population of a year in progress is the last complete year's.
    expect(callOf('ProcurementBuyerIdentity')?.[1]).toEqual({ entityCui: '4364446', populationYear: 2025 })
    expect(profile).toMatchObject({ period: { kind: 'year', year: 2026, through: '2026-05' }, directPrev: null, partial: false })
  })

  it('cuts the chart’s year in progress where the page’s reads stop: at the earlier population’s cutoff', async () => {
    cutoffRead.mockResolvedValue({ direct: '2026-03', contract: '2026-02' })
    answer(otopeni(), () => Promise.resolve(extras()))
    const profile = await fetchProcurementBuyer('4364446', 2026)
    // March's direct purchases are past the page's month: one date, one total.
    expect(profile).toMatchObject({ period: { through: '2026-02' }, cutoff: { direct: '2026-02', contract: '2026-02' }, partYear: 2026 })
    expect(profile.directYears.find((point) => point.year === 2026)).toEqual({ year: 2026, value: 2_000_000, count: 40 })
  })

  it('keeps a column for the year in progress with contracts and no direct purchase', async () => {
    const raw = { ...otopeni(), directYearsValue: series({ '2025': '36404736.58' }), directYearsCount: series({ '2025': '293' }), directPartValue: series({}), directPartCount: series({}) }
    answer({ ...raw, awardYearsCount: series({ '2025': '12', '2026': '2' }), awardPartCount: series({ '2026-01': '2' }) }, () => Promise.resolve(extras()))
    const profile = await fetchProcurementBuyer('4364446', 2025)
    expect(profile.partYear).toBe(2026)
    expect(profile.awardYears.find((point) => point.year === 2026)).toMatchObject({ count: 2 })
  })

  it('goes partial when the cutoff cannot be read, whatever the year: the chart’s year in progress hangs on it', async () => {
    cutoffRead.mockRejectedValue(new Error('down'))
    answer(otopeni(), () => Promise.resolve(extras()))
    expect(await fetchProcurementBuyer('4364446', 2025)).toMatchObject({ partial: true, cutoff: { direct: null, contract: null } })
    graphqlQuery.mockClear()
    answer(otopeni(), () => Promise.resolve(extras()))
    // The year in progress is read so far, with no date to say.
    expect(await fetchProcurementBuyer('4364446', 2026)).toMatchObject({ partial: true, period: { kind: 'year', year: 2026, through: null } })
    expect(callOf('ProcurementBuyerFigures')?.[1].direct).toEqual({ authorityCui: '4364446', year: 2026, grain: 'direct_acquisition' })
  })

  it('reads the last twelve months through the cutoff, against the twelve before, by month across the two years', async () => {
    cutoffRead.mockResolvedValue({ direct: '2026-06', contract: '2026-05' })
    answer({ ...otopeni(), directMonthsValue: series({ '2025-06': '1000000', '2025-12': '4000000', '2026-05': '500000' }) }, () => Promise.resolve(extras()))
    const profile = await fetchProcurementBuyer('4364446', 'recent')
    const figures = callOf('ProcurementBuyerFigures')?.[1] ?? {}
    expect(figures.direct).toEqual({ authorityCui: '4364446', from: '2025-06', to: '2026-05', grain: 'direct_acquisition' })
    expect(figures.directPrev).toEqual({ authorityCui: '4364446', from: '2024-06', to: '2025-05', grain: 'direct_acquisition' })
    // Distinct firms over the whole window: two calendar years' counts would not add up.
    expect(figures.directSellers).toEqual({ authorityCui: '4364446', from: '2025-06', to: '2026-05', grain: 'direct_acquisition' })
    expect(callOf('ProcurementBuyerFigures')?.[0]).toContain('directSellers: procurementConcentration(scope: $directSellers, basis: count) { supplierCount }')
    expect(callOf('ProcurementBuyerExtras')?.[1].county).toEqual({ buyerCounty: 'IF', from: '2025-06', to: '2026-05', grain: 'direct_acquisition' })
    expect(profile).toMatchObject({ period: { kind: 'recent', year: 2026, from: '2025-06', through: '2026-05' }, partial: false })
    expect(profile.directPrev).not.toBeNull()
    expect(profile.directMonths.map((month) => month.month)).toEqual(['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'])
    expect(profile.directMonths[6]).toMatchObject({ month: '2025-12', value: 4_000_000 })
  })

  it('describes the last complete year, partial, when the last twelve months cannot be told', async () => {
    cutoffRead.mockRejectedValue(new Error('down'))
    answer(otopeni(), () => Promise.resolve(extras()))
    expect(await fetchProcurementBuyer('4364446', 'recent')).toMatchObject({ period: { kind: 'year', year: 2025 }, partial: true })
    // A read that tells no month is no cutoff either: never kept, never cached.
    cutoffRead.mockResolvedValue({ direct: null, contract: null })
    answer(otopeni(), () => Promise.resolve(extras()))
    expect(await fetchProcurementBuyer('4364446', 'recent')).toMatchObject({ period: { kind: 'year', year: 2025 }, partial: true })
    // Its population is the last complete year's, read before the cutoff lands.
    expect(callOf('ProcurementBuyerIdentity')?.[1]).toEqual({ entityCui: '4364446', populationYear: 2025 })
  })

  it('reads the follow-up once more, then shows CUIs rather than failing the page', async () => {
    answer(otopeni(), () => Promise.reject(new Error('down')), () => Promise.reject(new Error('down')))
    const profile = await fetchProcurementBuyer('4364446', 2025)
    expect(graphqlQuery).toHaveBeenCalledTimes(6)
    expect(profile).toMatchObject({ partial: true, namesUnread: true, supplierYears: [], countyShare: null })
    expect(profile.names.size).toBe(0)
  })

  it('fails when the reader left, instead of settling for a partial page', async () => {
    const controller = new AbortController()
    answer(otopeni(), () => {
      controller.abort()
      return Promise.reject(new Error('aborted'))
    })
    await expect(fetchProcurementBuyer('4364446', 2025, controller.signal)).rejects.toThrow('aborted')
  })

  it('leaves no rejection unhandled when the reader leaves while the last twelve months wait for the cutoff', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    const controller = new AbortController()
    let release: () => void = () => undefined
    cutoffRead.mockReturnValue(new Promise<Cutoff>((resolve) => (release = () => resolve(CUTOFF))))
    // Every request settles only when the reader leaves, as a fetch with its signal does.
    graphqlQuery.mockImplementation((_query: string, _variables: unknown, options: { readonly signal?: AbortSignal }) => new Promise((_resolve, reject) => options.signal?.addEventListener('abort', () => reject(options.signal?.reason), { once: true })))
    const read = fetchProcurementBuyer('4364446', 'recent', controller.signal)
    controller.abort()
    await expect(read).rejects.toBeDefined()
    await new Promise((resolve) => setTimeout(resolve, 0))
    process.off('unhandledRejection', unhandled)
    release()
    expect(unhandled).not.toHaveBeenCalled()
  })
})

describe('fetchProcurementBuyerRecords', () => {
  // A block body: a hook that returns a function (mockReset returns the mock) has it called as its teardown.
  beforeEach(() => {
    graphqlQuery.mockReset()
    cutoffRead.mockReset()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-27T10:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads the year in progress through the cutoff’s last day, and fails without the cutoff rather than run past it', async () => {
    graphqlQuery.mockResolvedValue({ procurementContracts: { items: [] }, procurementDirectAcquisitions: { items: [] } })
    cutoffRead.mockResolvedValue({ direct: '2026-06', contract: '2026-05' })
    await fetchProcurementBuyerRecords('4364446', 2026, 8)
    const filters = graphqlQuery.mock.calls.map(([, variables]) => (variables as { filter: Record<string, unknown> }).filter)
    expect(filters).toContainEqual(expect.objectContaining({ contractDate: { gte: '2026-01-01', lte: '2026-05-31' } }))
    expect(filters).toContainEqual(expect.objectContaining({ publicationDate: { gte: '2026-01-01', lte: '2026-05-31' } }))
    cutoffRead.mockRejectedValue(new Error('down'))
    await expect(fetchProcurementBuyerRecords('4364446', 2026, 8)).rejects.toThrow('down')
    // A complete year needs no cutoff.
    await expect(fetchProcurementBuyerRecords('4364446', 2025, 8)).resolves.toBeDefined()
    // The last twelve months likewise: their first day to the cutoff's last.
    cutoffRead.mockResolvedValue({ direct: '2026-06', contract: '2026-05' })
    graphqlQuery.mockClear()
    await fetchProcurementBuyerRecords('4364446', 'recent', 8)
    const recent = graphqlQuery.mock.calls.map(([, variables]) => (variables as { filter: Record<string, unknown> }).filter)
    expect(recent).toContainEqual(expect.objectContaining({ contractDate: { gte: '2025-06-01', lte: '2026-05-31' } }))
  })

  it('reads the year’s largest awards and direct purchases for the buyer, dating a purchase by its finalization', async () => {
    const party = (cui: string, name: string) => ({ cui, name, displayName: null })
    graphqlQuery.mockImplementation((query: string) =>
      Promise.resolve(
        query.includes('procurementContracts')
          ? {
              procurementContracts: {
                items: [
                  { id: 'c1', contractNo: '7', contractDate: '2025-04-15', title: null, cpvCode: '45214200', authority: party('4364446', 'ORASUL OTOPENI'), supplier: party('16634489', 'CONSTRUCT & ACTING SRL'), value: { valueAccepted: true, valueRonComparable: '9610000' } },
                ],
              },
            }
          : {
              procurementDirectAcquisitions: {
                items: [
                  { id: 'd1', publicationDate: null, finalizationDate: '2025-06-02', title: 'LUCRARI DE AMENAJARE PARC', cpvCode: '45112711', authority: party('4364446', 'ORASUL OTOPENI'), supplier: party('30153499', 'UPPER LEVEL SRL'), value: { valueAccepted: true, valueRonComparable: '899000' } },
                ],
              },
            },
      ),
    )
    const records = await fetchProcurementBuyerRecords('4364446', 2025, 8)
    const filters = graphqlQuery.mock.calls.map(([, variables]) => (variables as { filter: Record<string, unknown> }).filter)
    expect(filters).toContainEqual(expect.objectContaining({ authorityCui: { eq: '4364446' }, contractDate: { gte: '2025-01-01', lte: '2025-12-31' }, recordKind: { in: ['contract_award'] } }))
    expect(filters).toContainEqual(expect.objectContaining({ authorityCui: { eq: '4364446' }, publicationDate: { gte: '2025-01-01', lte: '2025-12-31' } }))
    expect(records.contracts[0]).toMatchObject({ id: 'c1', value: 9_610_000, winners: [{ cui: '16634489', name: 'Construct & Acting SRL' }] })
    expect(records.direct[0]).toMatchObject({ id: 'd1', date: '2025-06-02', title: 'Lucrari de amenajare parc', value: 899_000 })
  })
})
