import { queryOptions, useQueries } from '@tanstack/react-query'
import type { CountGroup, StageKey } from '@/features/justice/lib/judicial-model'
import { STAGE_KEYS } from '@/features/justice/lib/judicial-model'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { judicialAggregateSchema } from '@/schemas/judicial'
import { comparable, countsBy, filterOf, LEVEL_KEYS, stageCounts, YEARS, type CaseloadFilter, type Columns, type Counts, type Grouping, type LevelKey, type Question } from './analize.model'

/**
 * The analysis page's reads: one `judicialCaseload` per grouping and filter,
 * each its own query (the same read is shared by every part that needs it).
 * The capture is frozen, so a read is kept for the page's life. A stage split
 * costs one read per stage until the API groups by stage (server ask 3).
 */

const CASELOAD = `query JusticeAnalysisCaseload($groupBy: JudicialAggregateGroupBy!, $filter: JudicialCasesFilter) {
  judicialCaseload(groupBy: $groupBy, filter: $filter) { denominator groups { key caseCount } }
}`

export type GroupBy = 'court' | 'category' | 'year' | 'courtLevel'

export interface Caseload {
  readonly total: number
  readonly groups: readonly CountGroup[]
}

const NOTHING: Caseload = { total: 0, groups: [] }

interface ReadSpec {
  readonly groupBy: GroupBy
  /** Null when the question can match no case: nothing is read, and the answer is zero. */
  readonly filter: CaseloadFilter | null
}

/** What a hook reads and how it combines the answers: built pure, read by one `useReads`. */
interface Plan<T> {
  readonly specs: readonly ReadSpec[]
  readonly combine: (results: readonly Caseload[]) => T
}

function caseloadOptions({ groupBy, filter }: ReadSpec) {
  return queryOptions({
    queryKey: ['justice', 'analysis', groupBy, filter] as const,
    queryFn: async ({ signal }): Promise<Caseload> => {
      const data = await graphqlQuery<{ readonly judicialCaseload: unknown }>(CASELOAD, { groupBy, filter }, { operationName: 'JusticeAnalysisCaseload', signal })
      const parsed = judicialAggregateSchema.parse(data.judicialCaseload)
      return {
        total: parsed.denominator,
        groups: parsed.groups.map((group) => ({
          key: group.key,
          count: group.caseCount,
        })),
      }
    },
    enabled: filter !== null,
    staleTime: Infinity,
  })
}

export interface Read<T> {
  /** Undefined while any of its reads is on its way. */
  readonly data: T | undefined
  readonly isError: boolean
  readonly isFetching: boolean
  readonly retry: () => void
}

/** A plan's reads as one: its data once every read is in, combined. */
function useReads<T>({ specs, combine }: Plan<T>): Read<T> {
  return useQueries({
    queries: specs.map(caseloadOptions),
    combine: (results) => {
      const ready = results.every((result, index) => specs[index]!.filter === null || result.data !== undefined)
      return {
        data: ready ? combine(results.map((result, index) => (specs[index]!.filter === null ? NOTHING : result.data!))) : undefined,
        isError: results.some((result) => result.isError),
        isFetching: results.some((result) => result.isFetching),
        retry: () => results.forEach((result) => (result.isError ? void result.refetch() : undefined)),
      }
    },
  })
}

export function groupByOf(grouping: Exclude<Grouping, 'etape'>): GroupBy {
  if (grouping === 'instante' || grouping === 'judete') return 'court'
  return grouping === 'materii' ? 'category' : 'courtLevel'
}

/** The stages a split counts: the question's own, else every group. */
function stagesOf(question: Question): readonly StageKey[] {
  return question.stages.length > 0 ? question.stages : STAGE_KEYS
}

// ──────────────────────────────────────────────────────────── answers ──

export interface Grouped {
  readonly now: Counts
  /** The year before's, when the two compare. */
  readonly before: Counts | null
  readonly total: number
  readonly totalBefore: number | null
}

function groupedPlan(question: Question, grouping: Grouping): Plan<Grouped> {
  const years = comparable(question.year) ? [question.year, question.year - 1] : [question.year]
  if (grouping === 'etape') {
    // Per year: each stage's read, then the year's total (the stages' rest is „Alte etape" when every stage is counted).
    const stages = stagesOf(question)
    const per = stages.length + 1
    const countsOf = (results: readonly Caseload[], offset: number) => {
      const total = results[offset + stages.length]!.total
      const byStage = new Map(stages.map((stage, index) => [stage, results[offset + index]!.total] as const))
      return {
        counts: question.stages.length > 0 ? new Map([...byStage].filter(([, count]) => count > 0)) : stageCounts(byStage, total),
        total,
      }
    }
    return {
      specs: years.flatMap((year) => [
        ...stages.map((stage): ReadSpec => ({
          groupBy: 'courtLevel',
          filter: filterOf(question, { year, stages: [stage] }),
        })),
        {
          groupBy: 'courtLevel',
          filter: filterOf(question, { year }),
        } satisfies ReadSpec,
      ]),
      combine: (results) => {
        const now = countsOf(results, 0)
        const before = years.length > 1 ? countsOf(results, per) : null
        return {
          now: now.counts,
          before: before?.counts ?? null,
          total: now.total,
          totalBefore: before?.total ?? null,
        }
      },
    }
  }
  const groupBy = groupByOf(grouping)
  return {
    specs: years.map((year): ReadSpec => ({
      groupBy,
      filter: filterOf(question, { year }),
    })),
    combine: ([now, before]) => ({
      now: countsBy(grouping, now!.groups),
      before: before ? countsBy(grouping, before.groups) : null,
      total: now!.total,
      totalBefore: before?.total ?? null,
    }),
  }
}

/** One grouping's counts for the question's year and, when they compare, the year before. */
export function useGrouped(question: Question, grouping: Grouping): Read<Grouped> {
  return useReads(groupedPlan(question, grouping))
}

export interface Figures {
  readonly total: number
  readonly totalBefore: number | null
  readonly courts: Counts
  readonly matters: Counts
}

/** The figures band: the year's total and the year before's, its courts and its matters. */
export function useFigures(question: Question): Read<Figures> {
  return useReads({
    specs: [
      { groupBy: 'court', filter: filterOf(question) },
      { groupBy: 'category', filter: filterOf(question) },
      ...(comparable(question.year)
        ? [
            {
              groupBy: 'courtLevel',
              filter: filterOf(question, { year: question.year - 1 }),
            } satisfies ReadSpec,
          ]
        : []),
    ],
    combine: ([courts, matters, before]) => ({
      total: courts!.total,
      totalBefore: before ? before.total : null,
      courts: countsBy('instante', courts!.groups),
      matters: countsBy('materii', matters!.groups),
    }),
  })
}

/** Each level's count for the question's other filters: the pinned bar's tabs. */
export function useLevelCounts(question: Question): Read<Counts> {
  return useReads({
    specs: [{ groupBy: 'courtLevel', filter: filterOf(question, { levels: [] }) }],
    combine: ([read]) => countsBy('niveluri', read!.groups),
  })
}

/** The question in every year of the band. */
export function useYears(question: Question): Read<Counts> {
  return useReads({
    specs: [{ groupBy: 'year', filter: filterOf(question, { year: 'all' }) }],
    combine: ([read]) => new Map(read!.groups.map((group) => [group.key, group.count] as const)),
  })
}

// ─────────────────────────────────────────────────────────── the cross ──

export interface Cross {
  readonly columns: readonly string[]
  /** Each row's count in each column. */
  readonly cells: ReadonlyMap<string, ReadonlyMap<string, number>>
}

/** The column keys of a cross table, in their order. */
export function crossColumns(question: Question, columns: Columns): readonly string[] {
  if (columns === 'ani') return [...YEARS].reverse().map(String)
  if (columns === 'etape') return question.stages.length > 0 ? question.stages : [...STAGE_KEYS, 'alte']
  return question.levels.length > 0 ? question.levels : LEVEL_KEYS
}

/** Whether a grouping can be crossed with a set of columns: not with itself, nor courts with levels (a court is at one level). */
export function crossable(rows: Grouping, columns: Columns): boolean {
  if (columns === 'etape') return rows !== 'etape'
  if (columns === 'niveluri') return rows !== 'niveluri' && rows !== 'instante'
  return true
}

function transpose(byColumn: ReadonlyMap<string, Counts>): ReadonlyMap<string, ReadonlyMap<string, number>> {
  const cells = new Map<string, Map<string, number>>()
  for (const [column, counts] of byColumn) {
    for (const [row, count] of counts) {
      const line = cells.get(row) ?? new Map<string, number>()
      line.set(column, count)
      cells.set(row, line)
    }
  }
  return cells
}

function crossPlan(question: Question, rows: Grouping, columns: Columns): Plan<Cross> {
  const keys = crossColumns(question, columns)
  if (rows === 'etape') {
    const stages = stagesOf(question)
    const groupBy: GroupBy = columns === 'ani' ? 'year' : 'courtLevel'
    const year = columns === 'ani' ? ('all' as const) : question.year
    const byColumn = (read: Caseload): Counts => (columns === 'ani' ? new Map(read.groups.map((group) => [group.key, group.count] as const)) : countsBy('niveluri', read.groups))
    return {
      specs: [
        ...stages.map((stage): ReadSpec => ({
          groupBy,
          filter: filterOf(question, { year, stages: [stage] }),
        })),
        { groupBy, filter: filterOf(question, { year }) },
      ],
      combine: (results) => {
        const totals = byColumn(results[stages.length]!)
        const cells = new Map<string, ReadonlyMap<string, number>>(stages.map((stage, index) => [stage, byColumn(results[index]!)] as const))
        if (question.stages.length === 0) {
          const rest = new Map(keys.map((column) => [column, (totals.get(column) ?? 0) - stages.reduce((sum, stage) => sum + (cells.get(stage)?.get(column) ?? 0), 0)] as const))
          if ([...rest.values()].some((count) => count > 0)) cells.set('alte', rest)
        }
        return { columns: keys, cells }
      },
    }
  }
  const groupBy = groupByOf(rows)
  const counted = keys.filter((column) => column !== 'alte')
  const narrowed = (column: string): CaseloadFilter | null =>
    columns === 'ani' ? filterOf(question, { year: Number(column) }) : columns === 'etape' ? filterOf(question, { stages: [column as StageKey] }) : filterOf(question, { levels: [column as LevelKey] })
  return {
    specs: [
      ...counted.map((column): ReadSpec => ({
        groupBy,
        filter: narrowed(column),
      })),
      ...(keys.includes('alte') ? [{ groupBy, filter: filterOf(question) } satisfies ReadSpec] : []),
    ],
    combine: (results) => {
      const byColumn = new Map<string, Counts>(counted.map((column, index) => [column, countsBy(rows, results[index]!.groups)] as const))
      if (keys.includes('alte')) {
        const totals = countsBy(rows, results[counted.length]!.groups)
        byColumn.set('alte', new Map([...totals].map(([row, total]) => [row, total - counted.reduce((sum, column) => sum + (byColumn.get(column)?.get(row) ?? 0), 0)] as const)))
      }
      return { columns: keys, cells: transpose(byColumn) }
    },
  }
}

/**
 * Rows by one grouping, columns by another: a read per column grouped by the
 * rows — or, for stages as rows, a read per stage grouped by the columns.
 * Stages as columns add „Alte etape" as each row's rest of its total.
 */
export function useCross(question: Question, rows: Grouping, columns: Columns): Read<Cross> {
  return useReads(crossPlan(question, rows, columns))
}
