import { hashKey } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { ANALYSIS_CASELOAD_QUERY } from '../api/judicial-analysis-api'
import { analysisFixtureReads } from '../fixtures/judicial-fixtures'
import { DEFAULT_QUESTION, type Question } from './analysis-model'
import { analysisReads, caseloadKey, figuresPlan, groupedPlan, levelsPlan, NO_CASES, yearsPlan, type AnalysisPlan, type CaseloadRead } from './analysis-plans'

/** A plan's answer from the recorded reads (`analysis-reads.json`): every read it makes must be one of them. */
function answered<T>(plan: AnalysisPlan<T>): T {
  return plan.combine(
    plan.reads.map((read) => {
      if (read.filter === null) return NO_CASES
      const recorded = analysisFixtureReads.find((item) => hashKey(caseloadKey(item)) === hashKey(caseloadKey(read)))
      if (!recorded) throw new Error(`no recorded read for ${JSON.stringify(read)}`)
      return recorded.answer
    }),
  )
}

const sum = (counts: ReadonlyMap<string, number>) => [...counts.values()].reduce((total, count) => total + count, 0)
const CONTENCIOS: Question = { ...DEFAULT_QUESTION, matters: ['contenciosadministrativsifiscal'], dupa: 'etape' }

describe('the reads an answer makes', () => {
  it('reads a grouping in the question’s year and the year before, when the two compare', () => {
    expect(groupedPlan(DEFAULT_QUESTION, 'instante').reads).toEqual([
      { groupBy: 'court', filter: { year: { eq: 2025 } } },
      { groupBy: 'court', filter: { year: { eq: 2024 } } },
    ])
    expect(groupedPlan({ ...DEFAULT_QUESTION, year: 2026 }, 'materii').reads).toEqual([{ groupBy: 'category', filter: { year: { eq: 2026 } } }])
  })

  it('reads the stages one by one with each year’s total (server ask 3)', () => {
    const reads = groupedPlan(DEFAULT_QUESTION, 'etape').reads
    expect(reads).toHaveLength(12)
    expect(reads[0]).toEqual({ groupBy: 'courtLevel', filter: { stage: { in: ['Fond'] }, year: { eq: 2025 } } })
    expect(reads[5]).toEqual({ groupBy: 'courtLevel', filter: { year: { eq: 2025 } } })
  })

  it('reads no year before for the ÎCCJ’s archive alone, whose years do not compare', () => {
    const iccj: Question = { ...DEFAULT_QUESTION, levels: ['inalta_curte'] }
    expect(groupedPlan(iccj, 'materii').reads).toHaveLength(1)
    expect(figuresPlan(iccj).reads).toHaveLength(2)
  })

  it('reads the stages picked once each, their sum the total: no read twice', () => {
    const reads = groupedPlan({ ...DEFAULT_QUESTION, stages: ['apel'] }, 'etape').reads
    expect(reads).toEqual([
      { groupBy: 'courtLevel', filter: { stage: { in: ['Apel'] }, year: { eq: 2025 } } },
      { groupBy: 'courtLevel', filter: { stage: { in: ['Apel'] }, year: { eq: 2024 } } },
    ])
    const plan = groupedPlan({ ...DEFAULT_QUESTION, stages: ['apel', 'recurs'] }, 'etape')
    const answer = plan.combine([10, 4, 8, 3].map((total) => ({ total, groups: [] })))
    expect(answer).toEqual({ now: new Map([['apel', 10], ['recurs', 4]]), before: new Map([['apel', 8], ['recurs', 3]]), total: 14, totalBefore: 11 })
  })

  it('reads the levels’ counts without the question’s own levels, and the years without its year', () => {
    const question: Question = { ...DEFAULT_QUESTION, levels: ['tribunal'] }
    expect(levelsPlan(question).reads).toEqual([{ groupBy: 'courtLevel', filter: { year: { eq: 2025 } } }])
    expect(yearsPlan(question).reads).toEqual([{ groupBy: 'year', filter: { courtLevel: { in: ['tribunal'] }, year: { gte: 2013 } } }])
  })

  it('shares reads between the parts of a page: the figures’ courts are the courts grouping’s', () => {
    const reads = analysisReads(DEFAULT_QUESTION)
    const unique = new Set(reads.map((read: CaseloadRead) => hashKey(caseloadKey(read))))
    expect(reads).toHaveLength(7)
    expect(unique.size).toBe(6)
  })

  it('asks the API for counts only: a group’s key and count, and the total', () => {
    expect(ANALYSIS_CASELOAD_QUERY).toContain('denominator groups { key caseCount }')
    expect(ANALYSIS_CASELOAD_QUERY).not.toMatch(/name|object|label|solution/u)
  })
})

describe('the answers, from the API’s recorded answers', () => {
  it('ranks the year’s courts with the year before, and they add up to the figures’ total', () => {
    const grouped = answered(groupedPlan(DEFAULT_QUESTION, 'instante'))
    const figures = answered(figuresPlan(DEFAULT_QUESTION))
    expect(grouped.total).toBe(figures.total)
    expect(sum(grouped.now)).toBe(grouped.total)
    expect(grouped.before).not.toBeNull()
    expect(sum(grouped.before!)).toBe(grouped.totalBefore)
    expect(figures.courts.size).toBeGreaterThan(200)
  })

  it('counts every case once across the levels, the bar’s tabs adding up to the total', () => {
    const levels = answered(levelsPlan(DEFAULT_QUESTION))
    expect(sum(levels)).toBe(answered(figuresPlan(DEFAULT_QUESTION)).total)
    expect([...levels.keys()]).toEqual(expect.arrayContaining(['judecatorie', 'tribunal', 'curte_de_apel', 'inalta_curte', 'militare']))
  })

  it('merges the ÎCCJ’s own spelling of a matter into the Portal’s, one row per matter', () => {
    const matters = answered(figuresPlan(DEFAULT_QUESTION)).matters
    expect(matters.has('contenciosadministrativsifiscal')).toBe(true)
    expect([...matters.keys()].every((key) => /^[a-z]+$/u.test(key))).toBe(true)
  })

  it('splits a matter by stage, „Alte etape" taking the rest, so the stages add up to the total', () => {
    const stages = answered(groupedPlan(CONTENCIOS, 'etape'))
    expect(sum(stages.now)).toBe(stages.total)
    expect(stages.now.get('fond')).toBeGreaterThan(0)
    expect(sum(stages.before!)).toBe(stages.totalBefore)
  })

  it('draws the years from the crawl’s start, the capture’s whole years the largest', () => {
    const years = answered(yearsPlan(DEFAULT_QUESTION))
    expect(years.get('2025')).toBe(answered(figuresPlan(DEFAULT_QUESTION)).total)
    expect(years.get('2024')!).toBeGreaterThan(years.get('2022')!)
  })
})
