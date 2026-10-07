import { comparable, countsBy, filterOf, stageCounts, type CaseloadFilter, type Counts, type Grouping, type Question } from './analysis-model'
import { STAGE_KEYS, type CountGroup, type StageKey } from './judicial-model'
import { justiceKeys } from './justice-keys'

/**
 * The analysis page's reads, planned pure (design.md §15): which
 * `judicialCaseload` reads an answer needs — a grouping and a filter each —
 * and how it combines them, so the browser's queries and the server's read
 * plan the same keys. A stage split costs a read per stage until the API
 * groups by stage (server ask 3).
 */

export type CaseloadGroupBy = 'court' | 'category' | 'year' | 'courtLevel'

export interface Caseload {
  readonly total: number
  readonly groups: readonly CountGroup[]
}

export interface CaseloadRead {
  readonly groupBy: CaseloadGroupBy
  /** Null when the question can match no case: nothing is read, and the answer is zero. */
  readonly filter: CaseloadFilter | null
}

/** What an answer reads and how it combines the answers, in the reads' order. */
export interface AnalysisPlan<T> {
  readonly reads: readonly CaseloadRead[]
  readonly combine: (results: readonly Caseload[]) => T
}

/** The answer of a read that has nothing to read. */
export const NO_CASES: Caseload = { total: 0, groups: [] }

/** The reads the server made for a document, by the key the page's query has. */
export type AnalysisSeed = readonly { readonly key: readonly unknown[]; readonly data: Caseload }[]

export function caseloadKey(read: CaseloadRead) {
  return justiceKeys.caseload(read.groupBy, read.filter)
}

export function groupByOf(grouping: Exclude<Grouping, 'etape'>): CaseloadGroupBy {
  if (grouping === 'instante' || grouping === 'judete') return 'court'
  return grouping === 'materii' ? 'category' : 'courtLevel'
}

export interface Grouped {
  readonly now: Counts
  /** The year before's, when the two compare. */
  readonly before: Counts | null
  readonly total: number
  readonly totalBefore: number | null
}

/** One grouping's counts for the question's year and, when the two compare, the year before. */
export function groupedPlan(question: Question, grouping: Grouping): AnalysisPlan<Grouped> {
  const years = comparable(question) ? [question.year, question.year - 1] : [question.year]
  if (grouping === 'etape') {
    // Per year, each stage's read. With every stage counted, the year's total too: the stages' rest is „Alte etape". With the
    // question's own stages, they are the whole set (their raw stages do not overlap): their sum is the total, read once.
    const picked = question.stages.length > 0
    const stages: readonly StageKey[] = picked ? question.stages : STAGE_KEYS
    const per = picked ? stages.length : stages.length + 1
    const countsOf = (results: readonly Caseload[], offset: number) => {
      const byStage = new Map(stages.map((stage, index) => [stage, results[offset + index]!.total] as const))
      if (picked) return { counts: new Map([...byStage].filter(([, count]) => count > 0)), total: [...byStage.values()].reduce((sum, count) => sum + count, 0) }
      const total = results[offset + stages.length]!.total
      return { counts: stageCounts(byStage, total), total }
    }
    return {
      reads: years.flatMap((year) => [
        ...stages.map((stage): CaseloadRead => ({ groupBy: 'courtLevel', filter: filterOf(question, { year, stages: [stage] }) })),
        ...(picked ? [] : [{ groupBy: 'courtLevel', filter: filterOf(question, { year }) } satisfies CaseloadRead]),
      ]),
      combine: (results) => {
        const now = countsOf(results, 0)
        const before = years.length > 1 ? countsOf(results, per) : null
        return { now: now.counts, before: before?.counts ?? null, total: now.total, totalBefore: before?.total ?? null }
      },
    }
  }
  const groupBy = groupByOf(grouping)
  return {
    reads: years.map((year): CaseloadRead => ({ groupBy, filter: filterOf(question, { year }) })),
    combine: ([now, before]) => ({
      now: countsBy(grouping, now!.groups),
      before: before ? countsBy(grouping, before.groups) : null,
      total: now!.total,
      totalBefore: before?.total ?? null,
    }),
  }
}

export interface Figures {
  readonly total: number
  readonly totalBefore: number | null
  readonly courts: Counts
  readonly matters: Counts
}

/** The figures band: the year's total and the year before's, its courts and its matters. */
export function figuresPlan(question: Question): AnalysisPlan<Figures> {
  return {
    reads: [
      { groupBy: 'court', filter: filterOf(question) },
      { groupBy: 'category', filter: filterOf(question) },
      ...(comparable(question) ? [{ groupBy: 'courtLevel', filter: filterOf(question, { year: question.year - 1 }) } satisfies CaseloadRead] : []),
    ],
    combine: ([courts, matters, before]) => ({
      total: courts!.total,
      totalBefore: before ? before.total : null,
      courts: countsBy('instante', courts!.groups),
      matters: countsBy('materii', matters!.groups),
    }),
  }
}

/** Each level's count for the question's other filters: the pinned bar's tabs. */
export function levelsPlan(question: Question): AnalysisPlan<Counts> {
  return { reads: [{ groupBy: 'courtLevel', filter: filterOf(question, { levels: [] }) }], combine: ([read]) => countsBy('niveluri', read!.groups) }
}

/** The question in every year of the band. */
export function yearsPlan(question: Question): AnalysisPlan<Counts> {
  return { reads: [{ groupBy: 'year', filter: filterOf(question, { year: 'all' }) }], combine: ([read]) => new Map(read!.groups.map((group) => [group.key, group.count] as const)) }
}

/** Every read the page makes for a question: the server reads them all before the page is sent. */
export function analysisReads(question: Question): readonly CaseloadRead[] {
  return [levelsPlan(question), figuresPlan(question), groupedPlan(question, question.dupa), yearsPlan(question)].flatMap((plan) => plan.reads)
}
