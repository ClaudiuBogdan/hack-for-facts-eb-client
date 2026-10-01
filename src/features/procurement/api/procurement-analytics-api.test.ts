// The records list against the answer: the same scope, the same build, one row per counted record.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { queryOf } from '../lib/analytics-model'
import { isStaleBuild, planAnswer, planRecords, readFigures, scopeOf, type AnalyticsCutoff } from './procurement-analytics-api'

const graphql = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/graphql/graphql-client')>()), graphqlQuery: graphql.query }))

const CUTOFF: AnalyticsCutoff = { direct: '2026-05', contract: '2026-05', build: '13' }
const PERIOD = { from: '2025-01', to: '2025-12' }

const party = (cui: string | null, name: string) => ({ cui, name, displayName: name })

beforeEach(() => {
  graphql.query.mockReset()
  graphql.query.mockResolvedValue({ l: { total: '0', items: [], meta: { answerability: 'served' } } })
})

describe('scopeOf', () => {
  it('names the frameworks population explicitly: the API counts purchases by default', () => {
    expect(scopeOf(queryOf({ tip: 'acorduri' }), PERIOD)).toMatchObject({ grain: 'contract', recordKind: 'framework_agreement', frameworkRole: 'framework_ceiling' })
    // The awards keep the API's own purchases population; direct purchases have no role.
    expect(scopeOf(queryOf({ tip: 'contracte' }), PERIOD)).not.toHaveProperty('frameworkRole')
    expect(scopeOf(queryOf({ tip: 'directe' }), PERIOD)).toEqual({ grain: 'direct_acquisition', ...PERIOD })
  })

  it('carries the institution’s place and the firm’s place together', () => {
    const scope = scopeOf(queryOf({ tip: 'directe', judet: 'SB', regiune_firma: 'Bucuresti-Ilfov' }), PERIOD)
    expect(scope).toMatchObject({ buyerCounty: 'SB', supplierRegion: 'Bucuresti-Ilfov' })
    expect(scopeOf(queryOf({ tip: 'contracte', localitate: '179132', localitate_firma: '179141' }), PERIOD)).toMatchObject({ buyerSiruta: '179132', supplierSiruta: '179141' })
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
        meta: { answerability: 'served' },
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
    graphql.query.mockResolvedValue({ l: { total: null, items: [], meta: { answerability: 'abstained' } } })
    const page = await planRecords(queryOf({ tip: 'directe' }), CUTOFF, 'date_desc', 1).read(new AbortController().signal)
    expect(page).toEqual({ total: null, abstained: true, rows: [] })
  })
})

describe('the build pin', () => {
  it('pins the figures to the cutoff’s build', async () => {
    graphql.query.mockResolvedValue({ now: { blocks: [] } })
    await readFigures({ grain: 'direct_acquisition' }, null, '13', new AbortController().signal)
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
