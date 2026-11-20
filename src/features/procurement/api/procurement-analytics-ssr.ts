import { hashKey } from '@tanstack/react-query'
import { newestKey } from '@/lib/disclosure-key'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import type { AnalyticsSeed } from '../hooks/use-procurement-analytics'
import { procurementAnalyticsKeys } from '../lib/analytics-keys'
import { analyticsSearchOf, cpvKey, dropsFilters, POPULATION_ORDER, queryOf, recordsViewOf, recordsViewSearch, repaired, urlSearchOf, withPopulation } from '../lib/analytics-model'
import { homeYear } from '../lib/home-model'
import {
  isStaleBuild,
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
import { forgetProcurementCutoff, untilAborted } from './procurement-cutoff'
import { fetchProcurementGeographyOptions } from './procurement-reference-api'

/**
 * The analytics page's server reads, for the route loader only.
 *
 * The cutoff first (every read's months hang on it, and every read is pinned
 * to the analysis build it was read from), then the answer's reads side by
 * side — the figures, the concentration, the ranking or the series or the
 * records' page the address holds, the years — and the names of what they
 * hold. No question is kept in the process (D6): each render reads afresh,
 * and only the CDN keeps the page.
 * They seed the page's queries under the keys the browser plans (see
 * `planAnswer`), so the document carries the answer and the browser reads
 * only what the server could not.
 *
 * Every read of a question shares one budget, not the request's signal. A read past the
 * budget fails as a read: the render goes out `no-store` and the page reads
 * it again in the browser. The records are the exception — a wide list is
 * often slower than the budget, so a render without them may still be kept,
 * and every browser reads them under the painted page.
 */

// Short: a slow read is better read in the browser, under the painted page, than held against the whole document.
const SSR_BUDGET_MS = 3_500
const KEEP_REFERENCE_MS = 6 * 60 * 60 * 1000

export interface ProcurementAnalyticsServerRead {
  /** The disclosure publication a server render was read under (D6); null: unknown, kept nowhere. Absent: not a server render. */
  readonly disclosure?: string | null
  /** When the server read it (epoch ms): the open tab's fail-closed clock starts from it. */
  readonly disclosureReadAt?: number
  /** Each read the server made, by the key the page's query has. */
  readonly seed: AnalyticsSeed
  /** Every read the question needs, the records aside, was read: the render may be kept by a shared cache. */
  readonly complete: boolean
  /** The year the cutoff's key was read under, so the browser plans the same keys around a new year. */
  readonly latest?: number
  /** A category landing's name in both languages, for the route's title (`analytics-head.ts`): the API's, for a level under a division. */
  readonly landingName?: { readonly ro: string | null; readonly en: string | null }
}

// No question is kept in the server process: every one carries direct purchases' figures, its own or its tabs' counts
// (D6, root 19 November 2026; design §24.4). The reference lists are kept.
const reference = createServerMemo<unknown>(KEEP_REFERENCE_MS, { maxEntries: 4 })

export async function readProcurementAnalyticsForSsr(search: Readonly<Record<string, unknown>>): Promise<ProcurementAnalyticsServerRead> {
  const strings = analyticsSearchOf(search)
  const query = repaired(queryOf(strings))
  // The records' page and order the address holds: the list the page opens on.
  const view = recordsViewOf(strings, query)
  const latest = homeYear()
  // The shared cutoff read keeps itself (`procurement-cutoff.ts`): its build keys the question. Within the render's budget.
  const cutoffBudget = withDeadline(undefined, SSR_BUDGET_MS) ?? new AbortController().signal
  // When the publication was read, with the cutoff: an open tab's fail-closed clock starts from it (§24.4).
  const disclosureReadAt = Date.now()
  const pinned = await untilAborted(readAnalyticsCutoff(latest), cutoffBudget).catch(() => null)
  // D6: a render whose disclosure publication cannot be read is kept nowhere — not in the memo, not by the CDN (incomplete).
  const disclosureUnknown = pinned !== null && (pinned.disclosure ?? null) === null
  const keep = (_key: string, render: () => Promise<ProcurementAnalyticsServerRead>) =>
    render().then((read) => (disclosureUnknown ? { ...read, complete: false } : read))
  // The publication the seeds were read under, read with the cutoff before them: the browser drops seeds of another (D6).
  const read = await keep(hashKey([urlSearchOf(query), query.dupa.axis === 'inregistrari' ? recordsViewSearch(view, query) : null, pinned?.build ?? null, pinned?.disclosure ?? null]), async () => {
    const budget = withDeadline(undefined, SSR_BUDGET_MS) ?? new AbortController().signal
    const seeded = async <T>(read: PlannedRead<T>) => ({ key: read.key, data: await read.read(budget) })
    const cutoffKey = procurementAnalyticsKeys.cutoff(latest)
    const [cutoff, counties, divisions] = await Promise.allSettled([
      pinned ? Promise.resolve<AnalyticsCutoff>(pinned) : Promise.reject(new Error('cutoff not read within the render budget')),
      untilAborted(reference('counties', () => fetchProcurementGeographyOptions()), budget),
      reference('cpv-divisions', () => readCpvDivisions(budget)),
    ])
    const seed: { key: readonly unknown[]; data: unknown }[] = []
    if (counties.status === 'fulfilled') seed.push({ key: procurementAnalyticsKeys.counties(), data: counties.value })
    if (divisions.status === 'fulfilled') seed.push({ key: procurementAnalyticsKeys.cpvDivisions(), data: divisions.value })
    // Without the cutoff no read knows its months or its build: the page reads them all in the browser.
    if (cutoff.status !== 'fulfilled') return { seed, complete: false, latest }
    seed.push({ key: cutoffKey, data: cutoff.value })
    const plan = planAnswer(query, cutoff.value, { topN: 25, years: true })
    const answer: PlannedRead<unknown>[] = [plan.figures, plan.concentration, plan.ranking, plan.series, plan.years].filter((read) => read.enabled)
    const records = query.dupa.axis === 'inregistrari' ? planRecords(query, cutoff.value, view.sort, view.page) : null
    // The other populations' figures, for the counts on their tabs (and their answer, should a tab be clicked): a failure there is the browser's to read.
    const others = POPULATION_ORDER.filter((tip) => tip !== query.tip && !dropsFilters(query, tip))
      .map((tip) => planAnswer(withPopulation(query, tip), cutoff.value, { topN: 25, years: false }).figures)
      .filter((read) => read.enabled)
    // Not waited for with the answer: a slow count must not spend the names' budget.
    const counting = Promise.allSettled(others.map((read) => seeded(read)))
    // D6: the newest key when the ranking arrived: its keys go to the names lookup, which sends none once a newer one is seen.
    let rankingSeen: string | null | undefined
    const [settled, listed] = await Promise.all([
      Promise.allSettled(
        answer.map((read) =>
          seeded(read).then((value) => {
            if (read === plan.ranking) rankingSeen = newestKey()
            return value
          }),
        ),
      ),
      records?.enabled ? Promise.allSettled([seeded(records)]) : Promise.resolve([]),
    ])
    let complete = counties.status === 'fulfilled' && divisions.status === 'fulfilled'
    for (const read of settled) {
      if (read.status === 'fulfilled') seed.push(read.value)
      else complete = false
    }
    for (const read of listed) if (read.status === 'fulfilled') seed.push(read.value)
    // The names of what the answer holds: the filters' own, and the ranked keys once the ranking is in.
    const rankingIndex = answer.indexOf(plan.ranking)
    const rankingRead = rankingIndex >= 0 ? settled[rankingIndex] : undefined
    const ranking = rankingRead?.status === 'fulfilled' ? (rankingRead.value.data as Ranking) : undefined
    const names = planNames(nameKeys(query, [ranking], pinned?.disclosure ?? null), rankingSeen)
    // The category's name, whatever address asked: the memo keeps one read per question, and the
    // landing's own address shares it with addresses that are not landings (`?cpv=X&dupa=<its default>`).
    const category = query.filters.cpv?.values[0] ?? null
    let landingName: ProcurementAnalyticsServerRead['landingName']
    if (names.enabled) {
      const [read] = await Promise.allSettled([seeded(names)])
      if (read.status === 'fulfilled') {
        seed.push(read.value)
        if (category) landingName = (read.value.data as Names).cpv.get(cpvKey(category))
      } else complete = false
    }
    // The counts: a failed one is the browser's to read, and the render is not kept without it.
    const counted = await counting
    for (const read of counted) {
      if (read.status === 'fulfilled') seed.push(read.value)
      else complete = false
    }
    // A read refused for its build: a publication since the cutoff was read. The next render reads a fresh one.
    const refused = [...settled, ...listed, ...counted].some((read) => read.status === 'rejected' && isStaleBuild(read.reason))
    if (refused) forgetProcurementCutoff(latest)
    return { seed, complete: complete && !refused, latest, ...(landingName ? { landingName } : {}) }
  })
  return { ...read, disclosure: pinned?.disclosure ?? null, disclosureReadAt }
}
