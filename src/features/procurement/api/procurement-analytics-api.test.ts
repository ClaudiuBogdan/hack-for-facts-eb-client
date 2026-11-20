// The records list against the answer: the same scope, the same build, one row per counted record.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { queryOf } from '../lib/analytics-model'
import { DisclosureMismatchError, resetDaReleaseForTests } from './procurement-da-release-status'
import { isStaleBuild, planAnswer, planRecords, readConcentration, readFigures, readNames, readRanking, readRecords, scopeOf, type AnalyticsCutoff } from './procurement-analytics-api'
/** The publication with D6 off, as the release's status names it. */
const OFF = 'off:-:nod6:-'

const graphql = vi.hoisted(() => ({ query: vi.fn() }))
// The switches: direct purchases' supplier figures readable unless a test says otherwise.
const supplierReads = vi.hoisted(() => ({ figures: true }))
// The publication the API reads now: what a fresh check sees.
const release = vi.hoisted(() => ({ version: 'v1' as string | null, fresh: 0 }))
vi.mock('./procurement-da-release-status', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./procurement-da-release-status')>()),
  daSupplierReads: () => Promise.resolve({ figures: supplierReads.figures, places: false, known: true }),
  disclosureVersion: (options?: { readonly fresh?: boolean }) => {
    if (options?.fresh) release.fresh += 1
    return Promise.resolve(release.version)
  },
}))
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()), graphqlQuery: graphql.query }))

const CUTOFF: AnalyticsCutoff = { direct: '2026-05', contract: '2026-05', builds: { direct: '13', contract: '13' }, build: '13', disclosure: 'off:-:nod6:-' }
const PERIOD = { from: '2025-01', to: '2025-12' }

const party = (cui: string | null, name: string) => ({ cui, name, displayName: name })

beforeEach(() => {
  resetDaReleaseForTests()
  release.version = 'v1'
  release.fresh = 0
  graphql.query.mockReset()
  graphql.query.mockResolvedValue({ l: { total: '0', items: [], meta: { answerability: 'served', disclosureKey: 'off' } } })
})

describe('scopeOf', () => {
  it('names the frameworks population explicitly: the API counts purchases by default', () => {
    expect(scopeOf(queryOf({ tip: 'acorduri' }), PERIOD)).toMatchObject({ grain: 'contract', recordKind: 'framework_agreement', frameworkRole: 'framework_ceiling' })
    // The awards keep the API's own purchases population; direct purchases have no role.
    expect(scopeOf(queryOf({ tip: 'contracte' }), PERIOD)).not.toHaveProperty('frameworkRole')
    expect(scopeOf(queryOf({ tip: 'directe' }), PERIOD)).toEqual({ grain: 'direct_acquisition', ...PERIOD })
  })

  it('carries the institution’s place and the firm’s place together', () => {
    const scope = scopeOf(queryOf({ tip: 'contracte', judet: 'SB', regiune_firma: 'Bucuresti-Ilfov' }), PERIOD)
    expect(scope).toMatchObject({ buyerCounty: 'SB', supplierRegion: 'Bucuresti-Ilfov' })
    // Direct purchases have no firm's place (release 1, D6): the institution's stands, the firm's is not read.
    const direct = scopeOf(queryOf({ tip: 'directe', judet: 'SB', regiune_firma: 'Bucuresti-Ilfov' }), PERIOD)
    expect(direct).toMatchObject({ buyerCounty: 'SB' })
    expect(direct).not.toHaveProperty('supplierRegion')
    expect(scopeOf(queryOf({ tip: 'contracte', localitate: '179132', localitate_firma: '179141' }), PERIOD)).toMatchObject({ buyerSiruta: '179132', supplierSiruta: '179141' })
  })
})

describe('builds per population', () => {
  // Direct acquisitions release 1 publishes direct purchases on their own clock: each population pins its own build.
  const split: AnalyticsCutoff = { direct: '2026-05', contract: '2026-05', builds: { direct: '1795000000000000', contract: '13' }, build: '1795000000000000|13', disclosure: 'on:t1:d6:p1' }

  it('a direct-purchase list is kept under the direct build and the disclosure publication, a contract list under the contract build', () => {
    expect(planRecords(queryOf({ tip: 'directe', perioada: '2025' }), split, 'value_desc', 1).key).toContain('1795000000000000|on:t1:d6:p1')
    expect(planRecords(queryOf({ tip: 'contracte', perioada: '2025' }), split, 'value_desc', 1).key).toContain('13')
  })

  it('a new supplier-privacy publication keeps direct-purchase answers apart, though the build did not move', () => {
    const next = { ...split, disclosure: 'on:t1:d6:p2' }
    expect(planRecords(queryOf({ tip: 'directe', perioada: '2025' }), next, 'value_desc', 1).key).not.toEqual(planRecords(queryOf({ tip: 'directe', perioada: '2025' }), split, 'value_desc', 1).key)
  })
})

describe('planRecords', () => {
  it('lists the figures’ own scope on the figures’ build', () => {
    const query = queryOf({ tip: 'directe', localitate_firma: '143450', judet: 'CJ', perioada: '2025' })
    const records = planRecords(query, CUTOFF, 'value_desc', 1)
    const figures = planAnswer(query, CUTOFF, { topN: 25, years: false }).figures
    expect(records.enabled).toBe(true)
    // Key: [..., 'records', build, scope, sort, page]; the figures' key carries the same build and scope.
    expect(records.key.slice(3, 5)).toEqual([figures.key[3], figures.key[4]])
    expect(records.key.slice(-2)).toEqual(['value_desc', 1])
  })

  it('keys every page and order apart, so a page change reads a new page', () => {
    const query = queryOf({ tip: 'contracte', judet_firma: 'SB' })
    const keys = [planRecords(query, CUTOFF, 'date_desc', 1).key, planRecords(query, CUTOFF, 'date_desc', 2).key, planRecords(query, CUTOFF, 'value_desc', 1).key]
    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(3)
  })

  it('reads one row per counted record, with the API’s total and no regrouping', async () => {
    graphql.query.mockResolvedValue({
      l: {
        total: '5',
        meta: { answerability: 'served', disclosureKey: 'off' },
        items: [
          { id: '1', date: '2025-03-02', title: null, displayTitle: { text: 'Lucrări de drumuri' }, authority: party('4270740', 'Primăria Sibiu'), supplier: party('111', 'A SRL'), valueRon: '1000.50' },
          // The consortium's second member: the same award, its value attributed once.
          { id: '2', date: '2025-03-02', title: null, displayTitle: { text: 'Lucrări de drumuri' }, authority: party('4270740', 'Primăria Sibiu'), supplier: party('222', 'B SRL'), valueRon: null },
          { id: '3', date: null, title: null, displayTitle: null, authority: party('4270740', 'Primăria Sibiu'), supplier: party(null, 'Ion Pop'), valueRon: null },
          // A blank title is no title: the display title stands in, and a blank one of those is none.
          { id: '4', date: null, title: '  ', displayTitle: { text: 'Servicii de pază' }, authority: party('4270740', 'Primăria Sibiu'), supplier: party('333', 'C SRL'), valueRon: null },
          { id: '5', date: null, title: '', displayTitle: { text: ' ' }, authority: party('4270740', 'Primăria Sibiu'), supplier: party('444', 'D SRL'), valueRon: null },
        ],
      },
    })
    const query = queryOf({ tip: 'contracte', judet_firma: 'SB', judet: 'SB', perioada: '2025' })
    const page = await planRecords(query, CUTOFF, 'date_desc', 2).read(new AbortController().signal)
    expect(page.total).toBe(5)
    expect(page.abstained).toBe(false)
    expect(page.rows.map((row) => [row.id, row.title, row.supplier.name, row.value])).toEqual([
      ['1', 'Lucrări de drumuri', 'A SRL', 1000.5],
      ['2', 'Lucrări de drumuri', 'B SRL', null],
      ['3', null, 'Ion Pop', null],
      ['4', 'Servicii de pază', 'C SRL', null],
      ['5', null, 'D SRL', null],
    ])
    expect(page.rows[0]!.href).toBe('/procurement/contracts/1')
    const [document, variables] = graphql.query.mock.calls[0]!
    expect(document).toContain('procurementRecords(scope: $s, build: $build, sort: date_desc, page: 2, pageSize: 25)')
    expect(variables).toEqual({ s: scopeOf(query, { from: '2025-01', to: '2025-12' }), build: '13' })
  })

  it('says when the figures abstain instead of listing nothing', async () => {
    graphql.query.mockResolvedValue({ l: { total: null, items: [], meta: { answerability: 'abstained', disclosureKey: 'off' } } })
    const page = await planRecords(queryOf({ tip: 'directe' }), CUTOFF, 'date_desc', 1).read(new AbortController().signal)
    expect(page).toEqual({ total: null, abstained: true, rows: [] })
  })
})

describe('a value order the spend gate refuses (DA-008)', () => {
  const scope = { grain: 'contract' as const, recordKind: 'contract_award' as const, from: '2025-06', to: '2026-05' }
  const refusal = (field: string) =>
    new GraphQLRequestError('GraphQL errors', { graphQLErrors: [{ message: 'a value order is unavailable: the spend gate withholds this grain’s money', path: ['l'], extensions: { code: 'INVALID_INPUT', field } }] })

  it('reads the page again newest first, and says the value order was withheld', async () => {
    graphql.query.mockRejectedValueOnce(refusal('sort')).mockResolvedValueOnce({ l: { total: '3', items: [], meta: { answerability: 'degraded' } } })
    const records = await readRecords(scope, '16', 'value_desc', 2, new AbortController().signal)
    expect(records).toMatchObject({ total: 3, valueOrderWithheld: true })
    const queries = graphql.query.mock.calls.map(([query]) => query as string)
    expect(queries).toHaveLength(2)
    expect(queries[0]).toContain('sort: value_desc, page: 2')
    expect(queries[1]).toContain('sort: date_desc, page: 2')
  })

  it('does not fall back on any other refusal, nor from the date order', async () => {
    graphql.query.mockRejectedValueOnce(refusal('scope'))
    await expect(readRecords(scope, '16', 'value_desc', 1, new AbortController().signal)).rejects.toBeInstanceOf(GraphQLRequestError)
    graphql.query.mockRejectedValueOnce(refusal('sort'))
    await expect(readRecords(scope, '16', 'date_desc', 1, new AbortController().signal)).rejects.toBeInstanceOf(GraphQLRequestError)
    expect(graphql.query).toHaveBeenCalledTimes(2)
  })

  it('the figures carry the spend gate’s verdict on the awarded money', async () => {
    const block = (answerability: string) => ({ recordCount: '37412', withValueCount: '33362', valueAwardedSum: null, avgValueAwarded: null, meta: null, moneyVerdicts: [{ measure: 'valueEstimatedSum', answerability: 'abstained' }, { measure: 'valueAwardedSum', answerability }] })
    graphql.query.mockResolvedValueOnce({ now: { blocks: [block('abstained')] } })
    expect((await readFigures(scope, null, '16', new AbortController().signal)).now?.awardedWithheld).toBe(true)
    graphql.query.mockResolvedValueOnce({ now: { blocks: [block('degraded')] } })
    expect((await readFigures(scope, null, '16', new AbortController().signal)).now?.awardedWithheld).toBe(false)
    // No verdict served: unknown, not served.
    graphql.query.mockResolvedValueOnce({ now: { blocks: [{ ...block('served'), moneyVerdicts: null }] } })
    expect((await readFigures(scope, null, '16', new AbortController().signal)).now?.awardedWithheld).toBeUndefined()
    graphql.query.mockResolvedValueOnce({ now: { blocks: [{ ...block('served'), moneyVerdicts: [{ measure: 'valueEstimatedSum', answerability: 'served' }] }] } })
    expect((await readFigures(scope, null, '16', new AbortController().signal)).now?.awardedWithheld).toBeUndefined()
    expect(graphql.query.mock.calls[0]?.[0]).toContain('moneyVerdicts { measure answerability }')
  })

  it('a list the API orders by value says nothing withheld', async () => {
    const records = await readRecords(scope, '16', 'value_desc', 1, new AbortController().signal)
    expect(records.valueOrderWithheld).toBeUndefined()
  })
})

describe('the build pin', () => {
  it('pins the figures to the cutoff’s build', async () => {
    graphql.query.mockResolvedValue({ now: { blocks: [{ recordCount: '1', withValueCount: '1', valueAwardedSum: '1', avgValueAwarded: '1', meta: { answerability: 'served', provisional: false, caveats: [], undatedInScope: null, disclosureKey: 'off' } }] } })
    await readFigures({ grain: 'direct_acquisition' }, null, '13', new AbortController().signal, OFF)
    const [document, variables] = graphql.query.mock.calls[0]!
    expect(document).toContain('procurementStats(scope: $now, build: $build)')
    expect(variables).toEqual({ now: { grain: 'direct_acquisition' }, build: '13' })
  })

  it('tells a refused pin from any other refusal', () => {
    const refusal = (extensions: Record<string, unknown>) => new GraphQLRequestError('refused', { graphQLErrors: [{ message: 'refused', extensions }] })
    expect(isStaleBuild(refusal({ code: 'INVALID_INPUT', field: 'build' }))).toBe(true)
    expect(isStaleBuild(refusal({ code: 'INVALID_INPUT', field: 'grain' }))).toBe(false)
    expect(isStaleBuild(new Error('network'))).toBe(false)
  })
})

describe('D6 on direct purchases, whatever the release flag', () => {
  const party = (cui: string | null, name: string | null, displayKind: string | null) => ({ cui, name, displayName: null, displayKind })
  const record = (supplier: ReturnType<typeof party>) => ({ id: 'r1', date: '2025-06-02', title: null, displayTitle: null, cpvLabel: 'Aranjamente florale', authority: party('361684', 'BNR', 'authority'), supplier, valueRon: '100.00' })

  it('a record’s supplier is named only when the API serves it as a company', async () => {
    graphql.query.mockResolvedValueOnce({
      l: { total: '3', items: [record(party('14837428', 'FLORARIA IRIS', 'company')), record(party('9446547', 'POPESCU ION', null)), record(party(null, null, 'natural_person'))], meta: { answerability: 'answered', disclosureKey: 'off' } },
    })
    const records = await readRecords({ grain: 'direct_acquisition', from: '2025-01', to: '2025-12' }, '13', 'value_desc', 1, new AbortController().signal, OFF)
    expect(records.rows.map((row) => row.supplier)).toEqual([
      { cui: '14837428', name: 'FLORARIA IRIS' },
      { cui: null, name: null, withheld: true },
      { cui: null, name: null, withheld: true },
    ])
    // A withheld title: the category names the record.
    expect(records.rows[0]?.title).toBe('Aranjamente florale')
  })

  it('a contract record’s supplier is not D6’s', async () => {
    graphql.query.mockResolvedValueOnce({ l: { total: '1', items: [record(party('9446547', 'POPESCU ION', null))], meta: { answerability: 'answered' } } })
    const records = await readRecords({ grain: 'contract', from: '2025-01', to: '2025-12' }, '13', 'value_desc', 1, new AbortController().signal)
    expect(records.rows[0]?.supplier).toEqual({ cui: '9446547', name: 'POPESCU ION' })
  })

  it('a supplier the address names is named by its own direct purchases, only as a company', async () => {
    graphql.query.mockResolvedValueOnce({
      // Each answer names the D6 state it was served under (API doc 10); 'v1' plans D6 off.
      da0: { meta: { disclosureKey: 'off' }, items: [{ supplier: party('14837428', 'FLORARIA IRIS', 'company') }] },
      da1: { meta: { disclosureKey: 'off' }, items: [{ supplier: party(null, null, 'natural_person') }] },
      da2: { meta: { disclosureKey: 'off' }, items: [] },
    })
    const names = await readNames([], [], new AbortController().signal, ['14837428', '9446547', '1234'], 'v1')
    expect([...names.daSuppliers.entries()]).toEqual([['14837428', 'FLORARIA IRIS']])
    expect(release.fresh).toBe(1)
    // Kept apart from the registry's names: a buyer of the same CUI never names the supplier.
    expect(names.orgs.size).toBe(0)
    const [query, variables] = graphql.query.mock.calls[graphql.query.mock.calls.length - 1] as [string, Record<string, unknown>]
    expect(query).not.toContain('organizationLabels(cuis: $cuis) @include(if: true)')
    expect(variables).toMatchObject({ withOrgs: false, da0: '14837428', da1: '9446547', da2: '1234' })
  })
})

describe('D6: a direct-purchase supplier\'s name is kept only under the publication it was read in', () => {
  const supplier = { cui: '14837428', name: 'FLORARIA IRIS', displayName: 'FLORARIA IRIS', displayKind: 'company' }
  const answer = { da0: { meta: { disclosureKey: 'off' }, items: [{ supplier }] } }

  it('drops a name whose answer was served under another publication than planned, even when the fresh status agrees', async () => {
    const planned = 'on:t1:d6:2026-11-18T03:10:00.123456Z'
    release.version = planned
    graphql.query.mockResolvedValueOnce({ da0: { meta: { disclosureKey: '2026-11-18T03:10:00.123456Z' }, items: [{ supplier }] } })
    expect([...(await readNames([], [], new AbortController().signal, ['14837428'], planned)).daSuppliers.keys()]).toEqual(['14837428'])
    graphql.query.mockResolvedValueOnce({ da0: { items: [{ supplier }] } })
    expect((await readNames([], [], new AbortController().signal, ['14837428'], planned)).daSuppliers.size).toBe(0)
    // Served under a newer publication: dropped (and that publication is now the newest seen).
    graphql.query.mockResolvedValueOnce({ da0: { meta: { disclosureKey: '2026-11-19T03:10:00.123456Z' }, items: [{ supplier }] } })
    expect((await readNames([], [], new AbortController().signal, ['14837428'], planned)).daSuppliers.size).toBe(0)
  })

  it('keeps the names when the publication is still the planned one', async () => {
    graphql.query.mockResolvedValueOnce(answer)
    expect([...(await readNames([], [], new AbortController().signal, ['14837428'], 'v1')).daSuppliers.keys()]).toEqual(['14837428'])
  })

  it('drops the names when a publish came between the plan and the answer', async () => {
    graphql.query.mockResolvedValueOnce(answer)
    release.version = 'v2'
    const names = await readNames([], [], new AbortController().signal, ['14837428'], 'v1')
    expect(names.daSuppliers.size).toBe(0)
  })

  it('drops them when the publication cannot be read afresh', async () => {
    graphql.query.mockResolvedValueOnce(answer)
    release.version = null
    expect((await readNames([], [], new AbortController().signal, ['14837428'], 'v1')).daSuppliers.size).toBe(0)
  })

  it('asks none under an unknown publication', async () => {
    graphql.query.mockResolvedValueOnce({})
    await readNames([], [], new AbortController().signal, ['14837428'], null)
    const [, variables] = graphql.query.mock.calls[graphql.query.mock.calls.length - 1] as [string, Record<string, unknown>]
    expect(variables).not.toHaveProperty('da0')
  })
})

describe('D6 enforced while the release is off', () => {
  it('a direct-purchase supplier ranking is said unavailable, and no concentration is read — nothing asked of the API', async () => {
    supplierReads.figures = false
    graphql.query.mockClear()
    try {
      const scope = { grain: 'direct_acquisition', from: '2025-01', to: '2025-12' }
      await expect(readRanking(scope, 'supplier', 25, 'value', null, new AbortController().signal)).resolves.toMatchObject({ unavailable: true, buckets: [] })
      await expect(readConcentration(scope, 'value', null, new AbortController().signal)).resolves.toMatchObject({ unavailable: true, firms: null })
      expect(graphql.query).not.toHaveBeenCalled()
    } finally {
      supplierReads.figures = true
    }
  })
})

describe('D6: an unclassified supplier never enters the kept ranking', () => {
  it('its CUI is replaced before the ranking is cached; a company’s and the group’s stand', async () => {
    graphql.query.mockResolvedValueOnce({
      r: [
        {
          rankedBy: 'value',
          valueWithheldAssociationSum: null,
          buckets: [
            { key: '14837428', kind: 'top', displayKind: 'company', recordCount: '3', withValueCount: '3', valueSum: '300', shareOfScope: '0.3' },
            { key: '1234567890123', kind: 'top', displayKind: null, recordCount: '2', withValueCount: '2', valueSum: '200', shareOfScope: '0.2' },
            { key: 'natural_person', kind: 'top', displayKind: 'natural_person', recordCount: '9', withValueCount: '9', valueSum: '900', shareOfScope: '0.5' },
          ],
          meta: { disclosureKey: 'p1' },
        },
      ],
    })
    const ranking = await readRanking({ grain: 'direct_acquisition', from: '2025-01', to: '2025-12' }, 'supplier', 25, 'value', null, new AbortController().signal, 'on:t1:d6:p1')
    expect(ranking.buckets.map((bucket) => bucket.key)).toEqual(['14837428', 'unnamed-1', 'natural_person'])
    expect(JSON.stringify(ranking)).not.toContain('1234567890123')
  })
})

describe('D6: a name-bearing direct-purchase answer is kept only under the state it was served under', () => {
  const scope = { grain: 'direct_acquisition', from: '2025-01', to: '2025-12' }
  const ranking = (disclosureKey: string) => ({ r: [{ rankedBy: 'value', valueWithheldAssociationSum: null, buckets: [], meta: { disclosureKey } }] })

  it('matches by the supplier-privacy publication, as the same instant at full precision', async () => {
    graphql.query.mockResolvedValueOnce(ranking('2026-11-18T03:10:00.123456Z'))
    await expect(readRanking(scope, 'supplier', 25, 'value', null, new AbortController().signal, 'on:t1:d6:2026-11-18T03:10:00.123456Z')).resolves.toMatchObject({ buckets: [] })
    graphql.query.mockResolvedValueOnce(ranking('2026-11-18 03:10:00.123456+00:00'))
    await expect(readRanking(scope, 'supplier', 25, 'value', null, new AbortController().signal, 'on:t1:d6:2026-11-18T03:10:00.123456Z')).resolves.toMatchObject({ buckets: [] })
  })

  it('refuses two publications within the same millisecond', async () => {
    graphql.query.mockResolvedValueOnce(ranking('2026-11-18T03:10:00.123456Z'))
    await expect(readRanking(scope, 'supplier', 25, 'value', null, new AbortController().signal, 'on:t1:d6:2026-11-18T03:10:00.123Z')).rejects.toBeInstanceOf(DisclosureMismatchError)
    graphql.query.mockResolvedValueOnce(ranking('2026-11-18T03:10:00.123457Z'))
    await expect(readRanking(scope, 'supplier', 25, 'value', null, new AbortController().signal, 'on:t1:d6:2026-11-18T03:10:00.123456Z')).rejects.toBeInstanceOf(DisclosureMismatchError)
  })

  it('refuses an answer of another publication, and one with names under an unknown publication', async () => {
    graphql.query.mockResolvedValueOnce(ranking('2026-11-19T03:10:00Z'))
    await expect(readRanking(scope, 'supplier', 25, 'value', null, new AbortController().signal, 'on:t1:d6:2026-11-18T03:10:00Z')).rejects.toBeInstanceOf(DisclosureMismatchError)
    graphql.query.mockResolvedValueOnce(ranking('off'))
    await expect(readRanking(scope, 'supplier', 25, 'value', null, new AbortController().signal, null)).rejects.toBeInstanceOf(DisclosureMismatchError)
    graphql.query.mockResolvedValueOnce({ l: { total: '0', items: [], meta: { answerability: 'served', disclosureKey: 'p2' } } })
    await expect(readRecords(scope, '13', 'value_desc', 1, new AbortController().signal, 'on:t1:d6:p1')).rejects.toBeInstanceOf(DisclosureMismatchError)
  })

  it('a late P1 ranking after a P2 one is neither returned nor kept (API doc 10)', async () => {
    const { QueryClient } = await import('@tanstack/react-query')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const P1 = '2026-11-18T03:10:00.123456Z'
    const P2 = '2026-11-19T03:10:00.123456Z'
    graphql.query.mockResolvedValueOnce(ranking(P2))
    await client.fetchQuery({ queryKey: ['procurement', 'r', P2], queryFn: ({ signal }) => readRanking(scope, 'supplier', 25, 'value', null, signal, `on:t2:d6:${P2}`) })
    graphql.query.mockResolvedValueOnce(ranking(P1))
    await expect(
      client.fetchQuery({ queryKey: ['procurement', 'r', P1], queryFn: ({ signal }) => readRanking(scope, 'supplier', 25, 'value', null, signal, `on:t1:d6:${P1}`) }),
    ).rejects.toBeInstanceOf(DisclosureMismatchError)
    expect(client.getQueryData(['procurement', 'r', P1])).toBeUndefined()
  })

  it('never keeps an answer served unavailable, under any publication (API contract d534ebd0)', async () => {
    graphql.query.mockResolvedValueOnce(ranking('unavailable'))
    await expect(readRanking(scope, 'supplier', 25, 'value', null, new AbortController().signal, null)).rejects.toBeInstanceOf(DisclosureMismatchError)
    graphql.query.mockResolvedValueOnce(ranking('unavailable'))
    await expect(readRanking(scope, 'supplier', 25, 'value', null, new AbortController().signal, 'on:t1:d6:p1')).rejects.toBeInstanceOf(DisclosureMismatchError)
    graphql.query.mockResolvedValueOnce({ l: { total: '0', items: [], meta: { answerability: 'served', disclosureKey: 'unavailable' } } })
    await expect(readRecords(scope, '13', 'value_desc', 1, new AbortController().signal, null)).rejects.toBeInstanceOf(DisclosureMismatchError)
  })
})
