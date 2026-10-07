import { createContext, useContext } from 'react'
import { hashKey, queryOptions, useQueries } from '@tanstack/react-query'
import { fetchCaseload } from '../api/judicial-analysis-api'
import {
  caseloadKey,
  figuresPlan,
  groupedPlan,
  levelsPlan,
  NO_CASES,
  yearsPlan,
  type AnalysisPlan,
  type AnalysisSeed,
  type Caseload,
  type CaseloadRead,
  type Figures,
  type Grouped,
} from '../lib/analysis-plans'
import type { Counts, Grouping, Question } from '../lib/analysis-model'

/**
 * The analysis page's reads in the browser. What the server read for the
 * document seeds each query under the same key (`justice-analysis-ssr.ts`),
 * so a server-rendered answer is not read again; a question asked later is
 * read here. The capture is frozen: an hour keeps a return visit from
 * reading again.
 */

const STALE_TIME = 60 * 60 * 1000

/** The server's reads, by their query key's hash. */
export const AnalysisSeedContext = createContext<ReadonlyMap<string, Caseload>>(new Map())

export function analysisSeedMap(seed: AnalysisSeed | undefined): ReadonlyMap<string, Caseload> {
  return new Map((seed ?? []).map((read) => [hashKey(read.key), read.data]))
}

function caseloadQueryOptions(read: CaseloadRead, seed: ReadonlyMap<string, Caseload>) {
  const key = caseloadKey(read)
  const seeded = seed.get(hashKey(key))
  return queryOptions({
    queryKey: key,
    queryFn: ({ signal }) => fetchCaseload(read, signal),
    enabled: read.filter !== null,
    staleTime: STALE_TIME,
    ...(seeded ? { initialData: seeded } : {}),
  })
}

export interface Read<T> {
  /** Undefined while any of its reads is on its way, or failed. */
  readonly data: T | undefined
  readonly isError: boolean
  readonly isFetching: boolean
  readonly retry: () => void
}

/**
 * A plan's reads as one: its data once every read is in, combined; a read
 * with nothing to read answers zero without asking. A read a plan makes
 * twice (a question no case can match makes every read the same) is one
 * query, its answer given to both.
 */
export function useAnalysisPlan<T>({ reads, combine }: AnalysisPlan<T>): Read<T> {
  const seed = useContext(AnalysisSeedContext)
  const hashes = reads.map((read) => hashKey(caseloadKey(read)))
  const uniqueHashes = [...new Set(hashes)]
  return useQueries({
    queries: uniqueHashes.map((hash) => caseloadQueryOptions(reads[hashes.indexOf(hash)]!, seed)),
    combine: (results) => {
      const answerOf = (index: number) => (reads[index]!.filter === null ? NO_CASES : results[uniqueHashes.indexOf(hashes[index]!)]!.data)
      const answers = reads.map((_, index) => answerOf(index))
      return {
        data: answers.every((answer) => answer !== undefined) ? combine(answers as readonly Caseload[]) : undefined,
        isError: results.some((result) => result.isError),
        isFetching: results.some((result) => result.isFetching),
        retry: () => results.forEach((result) => (result.isError ? void result.refetch() : undefined)),
      }
    },
  })
}

export function useAnalysisGrouped(question: Question, grouping: Grouping): Read<Grouped> {
  return useAnalysisPlan(groupedPlan(question, grouping))
}

export function useAnalysisFigures(question: Question): Read<Figures> {
  return useAnalysisPlan(figuresPlan(question))
}

export function useAnalysisLevels(question: Question): Read<Counts> {
  return useAnalysisPlan(levelsPlan(question))
}

export function useAnalysisYears(question: Question): Read<Counts> {
  return useAnalysisPlan(yearsPlan(question))
}
