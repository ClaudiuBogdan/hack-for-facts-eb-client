// The analytics query's contract with its address: every question and drill survives the round trip, an address it cannot read is said, never widened, and periods compare like with like.
import { describe, expect, it } from 'vitest'
import { QUESTIONS } from './analytics-questions'
import {
  AXES,
  AXIS_ORDER,
  POPULATIONS,
  bucketsBetween,
  clippedBucket,
  drilled,
  queryOf,
  resolvePeriod,
  dropsFilters,
  searchOf,
  unreadParams,
  withCategory,
  withTitle,
  type GroupBy,
  type PopulationId,
  type Query,
} from './analytics-model'

const SAMPLE_KEYS: Record<string, string> = { cumparator: '4305857', furnizor: '14399840', cpv: '45000000', loc: 'CJ', loc_firma: 'B', procedura: 'Licitatie deschisa' }

function roundTrip(query: Query): Query {
  return queryOf(searchOf(query))
}

describe('analytics URL round trip', () => {
  for (const question of QUESTIONS) {
    it(`keeps ${question.id}`, () => {
      expect(roundTrip(question.query)).toEqual(question.query)
    })
  }
  it('keeps every drill from every population and axis', () => {
    for (const tip of Object.keys(POPULATIONS) as PopulationId[]) {
      for (const axisId of AXIS_ORDER) {
        const axis = AXES[axisId]
        if (!axis.populations.includes(tip)) continue
        const group: GroupBy = { axis: axisId, level: axis.levels[0]!.id }
        const start = queryOf({ tip })
        const key = axisId === 'loc' || axisId === 'loc_firma' ? 'Centru' : (SAMPLE_KEYS[axisId] ?? 'x')
        const next = drilled({ ...start, dupa: group }, group, axisId === 'cpv' ? '45000000' : key)
        expect(roundTrip(next)).toEqual(next)
      }
    }
  })
})

describe('another population’s count', () => {
  it('is a wider question’s when that population cannot take one of the filters', () => {
    const procedure = queryOf({ tip: 'contracte', cpv: '45', procedura: 'Licitatie deschisa' })
    expect(dropsFilters(procedure, 'directe')).toBe(true)
    expect(dropsFilters(procedure, 'acorduri')).toBe(false)
    expect(dropsFilters(queryOf({ cpv: '45', judet: 'SB' }), 'contracte')).toBe(false)
  })
})

describe('a category picked, a step up its path, none', () => {
  it('takes a grouping the reader did not choose with it: what is inside first', () => {
    const code = queryOf({ cpv: '33600000' })
    expect(code.dupa).toEqual({ axis: 'furnizor', level: 'cui' })
    expect(withCategory(code, '33').dupa).toEqual({ axis: 'cpv', level: 'grup' })
    expect(withCategory(code, '336').dupa).toEqual({ axis: 'cpv', level: 'clasa' })
    expect(withCategory(queryOf({}), '45').dupa).toEqual({ axis: 'cpv', level: 'grup' })
    expect(withCategory(queryOf({ cpv: '45' }), null)).toEqual(queryOf({}))
  })

  it('leaves a grouping the reader chose where it is', () => {
    const chosen = queryOf({ cpv: '33600000', dupa: 'institutie' })
    expect(withCategory(chosen, '33').dupa).toEqual({ axis: 'cumparator', level: 'cui' })
    expect(searchOf(withCategory(chosen, '33'))).toMatchObject({ cpv: '33', dupa: 'institutie' })
  })
})

describe('analytics URL it cannot read', () => {
  it('ignores keys the prototype holds', () => {
    expect(queryOf({ dupa: 'constructor' }).dupa).toEqual(queryOf({}).dupa)
    expect(queryOf({ tip: 'constructor' }).tip).toBe('directe')
    expect(unreadParams({ dupa: 'constructor', tip: '__proto__' }).map((item) => item.param)).toEqual(['tip', 'dupa'])
  })
  it('reads the forms readers paste', () => {
    expect(queryOf({ cumparator: 'RO4305857' }).filters.cumparator).toEqual({ level: 'cui', values: ['4305857'] })
    expect(queryOf({ cpv: '45000000-7' }).filters.cpv).toEqual({ level: 'cod', values: ['45000000'] })
    expect(queryOf({ judet: 'cj' }).filters.loc).toEqual({ level: 'judet', values: ['CJ'] })
  })
  it('says a value range with an end it cannot read, and keeps the end it can', () => {
    expect(unreadParams({ valoare: '1000..oops' }).map((item) => item.param)).toEqual(['valoare'])
    expect(queryOf({ valoare: '1000..oops' }).valoare).toEqual({ min: 1000, max: null })
    expect(unreadParams({ valoare: '1000..' })).toEqual([])
  })
  it('says what it dropped', () => {
    expect(unreadParams({ cumparator: 'abc', titlu: 'ab', procedura: 'Licitatie deschisa', perioada: '9999', valoare: 'x..y' }).map((item) => item.param)).toEqual(['perioada', 'cumparator', 'procedura', 'titlu', 'valoare'])
    expect(unreadParams({ tip: 'contracte', procedura: 'Licitatie deschisa', judet: 'CJ', perioada: '2025' })).toEqual([])
  })
})

describe('analytics periods', () => {
  it('compares the same months a whole number of years before', () => {
    expect(resolvePeriod({ kind: 'year', year: 2026 }, '2026-05').previous).toEqual({ from: '2025-01', to: '2025-05' })
    expect(resolvePeriod({ kind: 'recent' }, '2026-05').previous).toEqual({ from: '2024-06', to: '2025-05' })
    expect(resolvePeriod({ kind: 'months', from: '2023-01', to: '2026-12' }, '2026-05').previous).toEqual({ from: '2019-01', to: '2022-05' })
  })
  it('answers a period after the data with the last twelve months, said', () => {
    const period = resolvePeriod({ kind: 'year', year: 2030 }, '2026-05')
    expect(period).toMatchObject({ from: '2025-06', to: '2026-05', replaced: true })
  })
  it('fills every bucket and says which the window cuts', () => {
    expect(bucketsBetween('2025-06', '2026-05', 'quarter')).toEqual(['2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1', '2026-Q2'])
    expect(bucketsBetween('2025-11', '2026-02', 'month')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
    expect(clippedBucket('2025', { from: '2025-06', to: '2026-05' })).toEqual({ from: '2025-06', to: null })
    expect(clippedBucket('2026', { from: '2025-06', to: '2026-05' })).toEqual({ from: null, to: '2026-05' })
    expect(clippedBucket('2025-Q3', { from: '2025-06', to: '2026-05' })).toBeNull()
  })
})

describe('analytics records', () => {
  it('reads and writes the records as a group-by', () => {
    const query = queryOf({ dupa: 'inregistrari' })
    expect(query.dupa).toEqual({ axis: 'inregistrari' })
    expect(searchOf(query).dupa).toBe('inregistrari')
    expect(roundTrip(query)).toEqual(query)
  })
  it('opens a title search on its records', () => {
    expect(queryOf({ titlu: 'laptop' }).dupa).toEqual({ axis: 'inregistrari' })
    expect(searchOf(queryOf({ titlu: 'laptop' })).dupa).toBeUndefined()
  })
  it('lets an unchosen group-by follow the title, and keeps a chosen one', () => {
    const fresh = queryOf({})
    expect(withTitle(fresh, 'laptop').dupa).toEqual({ axis: 'inregistrari' })
    expect(withTitle(withTitle(fresh, 'laptop'), null).dupa).toEqual(fresh.dupa)
    const chosen = queryOf({ dupa: 'firma' })
    expect(withTitle(chosen, 'laptop').dupa).toEqual({ axis: 'furnizor', level: 'cui' })
  })
})
