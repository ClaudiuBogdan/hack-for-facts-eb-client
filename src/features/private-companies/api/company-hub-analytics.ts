import { withDeadline } from '@/lib/ssr/deadline-signal'
import type { CompanyAnalysisBreakdown, CompanyAnalysisRecords, CompanyAnalysisRelease, CompanyAnalysisSeries, CompanyAnalysisStats } from '@/schemas/company-analytics'
import type { CompanyHubSearch } from '@/schemas/private-company-search'
import { companyAnalyticsKeys } from '../lib/company-analytics-keys'
import { DEFAULT_STATE, type CompanyAnalyticsState } from '../lib/company-analytics-url'
import { hubChoicesOf, hubQuestionState, hubYearOf, offeredRankings, type HubChoices, type HubSumMeasure } from '../lib/company-hub-analytics'
import { isReleaseRefused, readCompanyAnalysisRelease } from './company-analytics-api'
import { BREAKDOWN_TOP, BREAKDOWN_TOP_EXPANDED, planBreakdown, planRecords, planSeries, planStats, resolveQuestion, type PlannedRead, type ResolvedQuestion } from './company-analytics-plan'
import type { CompanyAnalyticsServerRead } from './company-analytics-ssr'

/**
 * The `/companies` hub's reads: ONE release — the active one — and, pinned
 * to it, one read per section of its default fiscal year. Each section asks
 * the analysis page's own question through the page's own plans, so the
 * hub's answers live under the page's cache keys: a reader who follows a
 * hub link into the analysis finds them read. Nothing here calls the
 * registry or the nation-wide registry aggregates; every figure is the
 * analytics release's.
 */

/** The largest companies the hero lists (of the records page the analysis page reads). */
export const HUB_LEADERS = 10

export interface CompanyHubPlan {
  readonly release: string
  readonly year: number
  readonly choices: HubChoices
  /** The questions the sections ask, resolved against the release: each section's links write the same one out. */
  readonly questions: {
    readonly stats: ResolvedQuestion
    readonly leaders: ResolvedQuestion | null
    readonly sectors: ResolvedQuestion
    readonly counties: ResolvedQuestion
    readonly trend: ResolvedQuestion | null
  }
  readonly stats: PlannedRead<CompanyAnalysisStats>
  /** Null when the year offers neither turnover nor employees to rank by. */
  readonly leaders: PlannedRead<CompanyAnalysisRecords> | null
  readonly sectors: PlannedRead<CompanyAnalysisBreakdown>
  readonly sizes: PlannedRead<CompanyAnalysisBreakdown>
  readonly counties: PlannedRead<CompanyAnalysisBreakdown>
  /** The years of the first sum the year offers (turnover, else employees); null when it offers neither. */
  readonly trend: PlannedRead<CompanyAnalysisSeries> | null
  readonly trendMetric: HubSumMeasure | null
}

/** A breakdown's size, within what the release serves. */
function topOf(release: CompanyAnalysisRelease, topN: number): number {
  return Math.min(topN, release.limits.maxTopN)
}

/** The hub's reads under a release; null when the release does not hold its own default year. */
export function planCompanyHub(release: CompanyAnalysisRelease, search: CompanyHubSearch): CompanyHubPlan | null {
  const year = hubYearOf(release)
  if (year === null) return null
  const choices = hubChoicesOf(search, release, year)
  const ask = (state: CompanyAnalyticsState) => resolveQuestion(state, release)
  const trendMetric = offeredRankings(release, year)[0] ?? null
  const questions = {
    // The page's bare question for the year: its figures band reads the same companies, filers and sums.
    stats: ask({ ...DEFAULT_STATE, year }),
    leaders: choices.ranking ? ask(hubQuestionState(year, choices.ranking)) : null,
    sectors: ask(hubQuestionState(year, choices.sectors)),
    counties: ask(hubQuestionState(year, choices.map)),
    trend: trendMetric ? ask(hubQuestionState(year, trendMetric)) : null,
  }
  return {
    release: release.release.releaseId,
    year,
    choices,
    questions,
    stats: planStats(questions.stats),
    leaders: questions.leaders ? planRecords(questions.leaders, null) : null,
    sectors: planBreakdown(questions.sectors, 'MAIN_CAEN', topOf(release, BREAKDOWN_TOP)),
    sizes: planBreakdown(questions.sectors, 'EMPLOYEE_SIZE', topOf(release, BREAKDOWN_TOP)),
    // Every county and every group without one in a single answer: the map is never a top slice.
    counties: planBreakdown(questions.counties, 'COUNTY', topOf(release, BREAKDOWN_TOP_EXPANDED)),
    trend: questions.trend ? planSeries(questions.trend, release) : null,
    trendMetric,
  }
}

/** Every read a plan makes, in the page's order. */
export function hubReadsOf(plan: CompanyHubPlan): readonly PlannedRead<unknown>[] {
  const reads: readonly (PlannedRead<unknown> | null)[] = [plan.stats, plan.leaders, plan.sectors, plan.sizes, plan.counties, plan.trend]
  return reads.filter((read): read is PlannedRead<unknown> => read !== null)
}

// ─────────────────────────────────────────────────────────────── server ──

/** The whole server read — the release and every section — within one deadline. */
const HUB_SSR_BUDGET_MS = 3_500

const FAILED_CLOSED: CompanyAnalyticsServerRead = { seed: [], complete: false }

/**
 * The hub's server read, for the route loader only, on the analysis page's
 * terms (`company-analytics-ssr.ts`): every request reads the API afresh
 * and nothing is kept between requests; the sections are read side by side
 * under the keys the browser plans; a refusal of the release by ANY read
 * fails the render closed (no seed, so not one figure of a withdrawn release
 * reaches the document); a read that fails or runs past the deadline leaves
 * its section to the browser.
 */
export async function readCompanyHubForSsr(search: CompanyHubSearch): Promise<CompanyAnalyticsServerRead> {
  const budget = withDeadline(undefined, HUB_SSR_BUDGET_MS)
  let release: CompanyAnalysisRelease
  try {
    release = await readCompanyAnalysisRelease(null, budget)
  } catch {
    return FAILED_CLOSED
  }
  const seed: { key: readonly unknown[]; data: unknown }[] = [{ key: companyAnalyticsKeys.release(null), data: release }]
  const plan = planCompanyHub(release, search)
  if (!plan) return { seed, complete: true }
  const reads = hubReadsOf(plan).filter((read) => read.enabled)
  const settled = await Promise.allSettled(reads.map(async (read) => ({ key: read.key, data: await read.read(budget) })))
  if (settled.some((read) => read.status === 'rejected' && isReleaseRefused(read.reason))) return FAILED_CLOSED
  let complete = true
  for (const read of settled) {
    if (read.status === 'fulfilled') seed.push(read.value)
    else complete = false
  }
  return { seed, complete }
}
