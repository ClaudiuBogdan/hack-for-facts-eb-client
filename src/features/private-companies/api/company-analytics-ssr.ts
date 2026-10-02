import { withDeadline } from '@/lib/ssr/deadline-signal'
import type { CompanyAnalysisRelease } from '@/schemas/company-analytics'
import { companyAnalyticsKeys } from '../lib/company-analytics-keys'
import { analyticsSearchOf, stateOf } from '../lib/company-analytics-url'
import { isReleaseRefused, readCompanyAnalysisRelease } from './company-analytics-api'
import { BREAKDOWN_TOP, planBreakdown, planRecords, planSeries, planStats, resolveQuestion, type PlannedRead } from './company-analytics-plan'

/**
 * The companies analysis page's server reads, for the route loader only.
 *
 * Every render reads afresh: the release first — the one the address pins,
 * or the active one — then the figures and the open panel's answer side by
 * side, each pinned to that release, under the keys the browser plans
 * (`company-analytics-plan.ts`). Nothing is kept between requests and the
 * route's response is never cached: a release withdrawn from publication
 * must stop reaching readers at the next request, and only the API knows
 * (it caches the immutable figures itself, behind its own checks).
 *
 * A refusal of the release by ANY read — the release itself, the figures,
 * the panel or the list's first page, whichever comes back first — fails
 * the whole render closed: no seed at all, so not one figure of a withdrawn
 * release is written into the document. The page then reads in the browser,
 * where the refusal is said and nothing replaces it. A read that merely
 * fails or runs past the budget leaves the render incomplete; the browser
 * reads what is missing.
 */

const SSR_BUDGET_MS = 3_500

export type CompanyAnalyticsSeed = readonly { readonly key: readonly unknown[]; readonly data: unknown }[]

export interface CompanyAnalyticsServerRead {
  /** Each read the server made, by the key the page's query has. */
  readonly seed: CompanyAnalyticsSeed
  /** Every read the question needs was read. */
  readonly complete: boolean
}

const FAILED_CLOSED: CompanyAnalyticsServerRead = { seed: [], complete: false }

export async function readCompanyAnalyticsForSsr(search: Readonly<Record<string, unknown>>): Promise<CompanyAnalyticsServerRead> {
  const state = stateOf(analyticsSearchOf(search))
  let release: CompanyAnalysisRelease
  try {
    release = await readCompanyAnalysisRelease(state.release, withDeadline(undefined, SSR_BUDGET_MS))
  } catch {
    return FAILED_CLOSED
  }
  const seed: { key: readonly unknown[]; data: unknown }[] = [{ key: companyAnalyticsKeys.release(state.release), data: release }]
  const question = resolveQuestion(state, release)
  // A question the release cannot answer is answered with what it cannot: nothing to read.
  if (question.problems.length > 0) return { seed, complete: true }
  const budget = withDeadline(undefined, SSR_BUDGET_MS) ?? new AbortController().signal
  const reads: PlannedRead<unknown>[] = [planStats(question)]
  if (state.panel === 'defalcare') reads.push(planBreakdown(question, state.dimension, BREAKDOWN_TOP))
  if (state.panel === 'evolutie') reads.push(planSeries(question, release))
  if (state.panel === 'firme') reads.push(planRecords(question, null))
  const settled = await Promise.allSettled(reads.filter((read) => read.enabled).map(async (read) => ({ key: read.key, data: await read.read(budget) })))
  // One refusal of the release, from any read, and nothing read under it is seeded.
  if (settled.some((read) => read.status === 'rejected' && isReleaseRefused(read.reason))) return FAILED_CLOSED
  let complete = true
  for (const read of settled) {
    if (read.status === 'fulfilled') seed.push(read.value)
    else complete = false
  }
  return { seed, complete }
}
