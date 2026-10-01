// The records list against the answer: it lists a selection only when its filter is the answer's, never a wider one.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryOf, resolvePeriod } from '../lib/analytics-model'
import { readRecords, recordsProblem } from './procurement-analytics-api'

const graphql = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/graphql/graphql-client', () => ({ graphqlQuery: graphql.query }))

const PERIOD = resolvePeriod({ kind: 'year', year: 2025 }, '2026-05')

beforeEach(() => {
  graphql.query.mockReset()
  graphql.query.mockResolvedValue({ l: { total: 0, totalEstimated: false, items: [] } })
})

describe('recordsProblem', () => {
  it('refuses a firm’s place alone: the API cannot filter the list by it', () => {
    expect(recordsProblem(queryOf({ tip: 'contracte', localitate_firma: '143450' }), PERIOD)).toBe('supplier-place')
  })

  it('lists a firm in its place: a firm has one place, so the firm alone is the same selection', () => {
    expect(recordsProblem(queryOf({ tip: 'contracte', localitate_firma: '143450', furnizor: '15399342' }), PERIOD)).toBeNull()
  })
})

describe('readRecords', () => {
  it('asks for the firm alone when a firm and its place are picked', async () => {
    await readRecords(queryOf({ tip: 'contracte', judet_firma: 'SB', furnizor: '15399342', judet: 'CJ' }), PERIOD, 'value_desc', 1, new AbortController().signal)
    const filter = graphql.query.mock.calls[0]![1].f as Record<string, unknown>
    expect(filter.supplierCui).toEqual({ eq: '15399342' })
    expect(filter.supplierCounty).toBeUndefined()
    // The buyer's place is the list's own filter: it stays.
    expect(filter.buyerCounty).toEqual({ eq: 'CJ' })
  })
})
