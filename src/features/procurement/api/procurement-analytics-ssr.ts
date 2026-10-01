import { hashKey } from '@tanstack/react-query'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import type { AnalyticsSeed } from '../hooks/use-procurement-analytics'
import { procurementAnalyticsKeys } from '../lib/analytics-keys'
import { categoryLandingOf } from '../lib/analytics-head'
import { analyticsSearchOf, cpvKey, POPULATION_ORDER, queryOf, repaired, urlSearchOf, withPopulation } from '../lib/analytics-model'
import { homeYear } from '../lib/home-model'
import {
  defaultRecordsSort,
  firmPlaceGate,
  nameKeys,
  planAnswer,
  planNames,
  planRecords,
  readAnalyticsCutoff,
  readCpvDivisions,
  type AnalyticsCutoff,
  type Names,
  type PlannedRead,
  type Ranking,
} from './procurement-analytics-api'
import { untilAborted } from './procurement-cutoff'
import { fetchProcurementGeographyOptions } from './procurement-reference-api'

/**
 * The analytics page's server reads, for the route loader only.
 *
 * The cutoff first (every read's months hang on it), then the answer's reads
 * side by side — the figures, the concentration, the ranking or the series
 * or the records' first page, the years — and the names of what they hold.
 * They seed the page's queries under the keys the browser plans (see
 * `planAnswer`), so the document carries the answer and the browser reads
 * only what the server could not.
 *
 * Every read of a question shares one budget, not the request's signal: a
 * question's reads are kept in the process for as long as a shared cache may
 * keep the page, and shared by the renders in that time. A read past the
 * budget fails as a read: the render goes out `no-store` and the page reads
 * it again in the browser. The records are the exception — a wide list is
 * often slower than the budget, so a render without them may still be kept,
 * and every browser reads them under the painted page.
 */

// Short: a slow read is better read in the browser, under the painted page, than held against the whole document.
const SSR_BUDGET_MS = 3_500
const KEEP_MS = 10 * 60 * 1000
const KEEP_REFERENCE_MS = 6 * 60 * 60 * 1000
const MAX_QUESTIONS = 300

export interface ProcurementAnalyticsServerRead {
  /** Each read the server made, by the key the page's query has. */
  readonly seed: AnalyticsSeed
  /** Every read the question needs, the records aside, was read: the render may be kept by a shared cache. */
  readonly complete: boolean
  /** The year the cutoff's key was read under, so the browser plans the same keys around a new year. */
  readonly latest?: number
  /** A category landing's name in both languages, for the route's title (`analytics-head.ts`): the API's, for a level under a division. */
  readonly landingName?: { readonly ro: string | null; readonly en: string | null }
}

// A partial read is served once and read again, never kept.
const questions = createServerMemo<ProcurementAnalyticsServerRead>(KEEP_MS, { maxEntries: MAX_QUESTIONS, keep: (read) => read.complete })
// A cutoff that could not be read stands in with the year's end: kept by no one.
const cutoffs = createServerMemo<AnalyticsCutoff>(KEEP_MS, { maxEntries: 4, keep: (cutoff) => !cutoff.failed })
const reference = createServerMemo<unknown>(KEEP_REFERENCE_MS, { maxEntries: 4 })

export async function readProcurementAnalyticsForSsr(search: Readonly<Record<string, unknown>>): Promise<ProcurementAnalyticsServerRead> {
  const query = repaired(queryOf(analyticsSearchOf(search)))
  return questions(hashKey([urlSearchOf(query)]), async () => {
    const budget = withDeadline(undefined, SSR_BUDGET_MS) ?? new AbortController().signal
    const seeded = async <T>(read: PlannedRead<T>) => ({ key: read.key, data: await read.read(budget) })
    const latest = homeYear()
    const cutoffKey = procurementAnalyticsKeys.cutoff(latest)
    const [cutoff, counties, divisions] = await Promise.allSettled([
      untilAborted(cutoffs(hashKey(cutoffKey), () => readAnalyticsCutoff(latest)), budget),
      untilAborted(reference('counties', () => fetchProcurementGeographyOptions()), budget),
      reference('cpv-divisions', () => readCpvDivisions(budget)),
    ])
    const seed: { key: readonly unknown[]; data: unknown }[] = []
    if (counties.status === 'fulfilled') seed.push({ key: procurementAnalyticsKeys.counties(), data: counties.value })
    if (divisions.status === 'fulfilled') seed.push({ key: procurementAnalyticsKeys.cpvDivisions(), data: divisions.value })
    // Without the cutoff no read knows its months: the page reads them all in the browser.
    if (cutoff.status !== 'fulfilled' || cutoff.value.failed) return { seed, complete: false, latest }
    seed.push({ key: cutoffKey, data: cutoff.value })
    const plan = planAnswer(query, cutoff.value, { topN: 25, years: true })
    const answer: PlannedRead<unknown>[] = [plan.figures, plan.concentration, plan.ranking, plan.series, plan.years].filter((read) => read.enabled)
    // A firm in a place lists only once its count is known (`firmPlaceGate`): the browser reads it then, not the server now.
    const records = query.dupa.axis === 'inregistrari' && firmPlaceGate(query, { data: undefined, isError: false }) === 'list' ? planRecords(query, plan.period, defaultRecordsSort(query), 1) : null
    // The other populations' figures, for the counts on their tabs (and their answer, should a tab be clicked): a failure there is the browser's to read.
    const others = POPULATION_ORDER.filter((tip) => tip !== query.tip)
      .map((tip) => planAnswer(withPopulation(query, tip), cutoff.value, { topN: 25, years: false }).figures)
      .filter((read) => read.enabled)
    const [settled, listed, counted] = await Promise.all([
      Promise.allSettled(answer.map((read) => seeded(read))),
      records?.enabled ? Promise.allSettled([seeded(records)]) : Promise.resolve([]),
      Promise.allSettled(others.map((read) => seeded(read))),
    ])
    let complete = counties.status === 'fulfilled' && divisions.status === 'fulfilled'
    for (const read of settled) {
      if (read.status === 'fulfilled') seed.push(read.value)
      else complete = false
    }
    for (const read of [...listed, ...counted]) if (read.status === 'fulfilled') seed.push(read.value)
    // The names of what the answer holds: the filters' own, and the ranked keys once the ranking is in.
    const rankingIndex = answer.indexOf(plan.ranking)
    const rankingRead = rankingIndex >= 0 ? settled[rankingIndex] : undefined
    const ranking = rankingRead?.status === 'fulfilled' ? (rankingRead.value.data as Ranking) : undefined
    const names = planNames(nameKeys(query, [ranking]))
    const landing = categoryLandingOf(analyticsSearchOf(search))
    let landingName: ProcurementAnalyticsServerRead['landingName']
    if (names.enabled) {
      const [read] = await Promise.allSettled([seeded(names)])
      if (read.status === 'fulfilled') {
        seed.push(read.value)
        if (landing) landingName = (read.value.data as Names).cpv.get(cpvKey(landing.code))
      } else complete = false
    }
    return { seed, complete, latest, ...(landingName ? { landingName } : {}) }
  })
}
