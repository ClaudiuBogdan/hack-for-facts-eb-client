import { createContext, useContext } from 'react'
import { hashKey, keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { CompanyAnalysisDimension, CompanyAnalysisRelease } from '@/schemas/company-analytics'
import { isCursorRefused, isReleaseRefused, readCompanyAnalysisRelease } from '../api/company-analytics-api'
import { planBreakdown, planOptions, planRecords, planSeries, planStats, resolveQuestion, type PlannedRead, type ResolvedQuestion } from '../api/company-analytics-plan'
import type { CompanyAnalyticsSeed } from '../api/company-analytics-ssr'
import { companyAnalyticsKeys, releaseOfKey } from '../lib/company-analytics-keys'
import { useRefusedReleases } from '../lib/company-release-refusals'
import { analyticsSearchOf, siteSearchOf, stateOf, urlSearchOf, type CompanyAnalyticsState } from '../lib/company-analytics-url'

/**
 * The companies analysis page's state and reads. The address holds the
 * question; the release is resolved once — the pinned one, or the active one
 * — and every answer is read against it, under keys that name it. On the
 * first render each read starts from what the route's loader read on the
 * server under the same key, and reads only what it lacks.
 */

const STALE = 10 * 60 * 1000

// ────────────────────────────────────────────────────────────────── seed ──

/**
 * What the route's loader read on the server, handed to the page's queries
 * ONCE: a key seeds its query when the page first reads it, and never again.
 * A seed must not outlive that moment — a query dropped from the cache later
 * (garbage-collected, or forgotten on a refresh) is read from the API again,
 * not rebuilt from figures the server read minutes ago; and a release the
 * API has refused since has its seeds forgotten at once.
 */
export interface CompanyAnalyticsSeedStore {
  /** The seed of a key, taken: the same key finds nothing next time. */
  readonly take: (key: readonly unknown[]) => { readonly found: boolean; readonly data?: unknown }
  /** Forget the seeds read under a release (the active release's included, when it is that one). */
  readonly forget: (release: string) => void
  /** Forget every seed: an explicit refresh starts the data over. */
  readonly clear: () => void
}

export function createSeedStore(seed: CompanyAnalyticsSeed | undefined): CompanyAnalyticsSeedStore {
  const reads = new Map((seed ?? []).map((read) => [hashKey(read.key), read]))
  return {
    take: (key) => {
      const hash = hashKey(key)
      const read = reads.get(hash)
      if (!read) return { found: false }
      reads.delete(hash)
      return { found: true, data: read.data }
    },
    forget: (release) => {
      for (const [hash, read] of reads) {
        // The active release's seed names no release in its key: its data does.
        const pinned = releaseOfKey(read.key) ?? (read.key[2] === 'release' ? ((read.data as CompanyAnalysisRelease | undefined)?.release.releaseId ?? null) : null)
        if (pinned === release) reads.delete(hash)
      }
    },
    clear: () => reads.clear(),
  }
}

export const CompanyAnalyticsSeedContext = createContext<CompanyAnalyticsSeedStore>(createSeedStore([]))

function useSeeded(): <T>(read: { readonly key: readonly unknown[] }) => { readonly initialData?: T } {
  const seeds = useContext(CompanyAnalyticsSeedContext)
  return <T>(read: { readonly key: readonly unknown[] }) => {
    const seed = seeds.take(read.key)
    return seed.found ? { initialData: seed.data as T } : {}
  }
}

// ───────────────────────────────────────────────────────────────── state ──

/** The question the address holds. */
export function useCompanyAnalyticsState(): CompanyAnalyticsState {
  return stateOf(analyticsSearchOf(useSearch({ from: '/companies/analytics' })))
}

/**
 * A way to ask another question (pushed: Back undoes it). Every question
 * asked from the page names the release it was answered from, so a shared
 * link reads the same figures; the site's own keys (`lang`) stay with it.
 */
export function useCompanyAnalyticsMove(pinned: string | null): (next: CompanyAnalyticsState) => void {
  const navigate = useNavigate({ from: '/companies/analytics' })
  return (next: CompanyAnalyticsState) =>
    void navigate({ search: (previous) => ({ ...siteSearchOf(previous), ...urlSearchOf({ ...next, release: next.release ?? pinned }) }), resetScroll: false })
}

/**
 * Leave a release the API no longer serves for the active one — only when
 * the reader asks. The same question, in the same language, read from the
 * start: no seed, the active release read again, nothing kept of the refused
 * one. The refusal itself stays known: going back to that release finds it
 * withdrawn.
 */
export function useReleaseRefresh(state: CompanyAnalyticsState, refused: string | null) {
  const client = useQueryClient()
  const seeds = useContext(CompanyAnalyticsSeedContext)
  const navigate = useNavigate({ from: '/companies/analytics' })
  return () => {
    seeds.clear()
    // Read again where the page shows it (the page moves when it lands), and on its next showing where it does not.
    void client.invalidateQueries({ queryKey: companyAnalyticsKeys.release(null) })
    void navigate({ search: (previous) => ({ ...siteSearchOf(previous), ...urlSearchOf({ ...state, release: null }) }), resetScroll: false }).then(() => {
      // Once the page has left it: forgotten whole, refusals included.
      if (refused !== null) client.removeQueries({ predicate: (query) => releaseOfKey(query.queryKey) === refused })
    })
  }
}

// ─────────────────────────────────────────────────────────────── release ──

/**
 * The release's capabilities, read once for the page's life: a publication
 * meanwhile does not move the page under the reader. A pin the API refuses
 * is not retried, and nothing replaces it.
 */
export function useCompanyAnalysisRelease(pin: string | null) {
  const seeded = useSeeded()
  const refused = useRefusedReleases()
  const key = companyAnalyticsKeys.release(pin)
  return useQuery({
    queryKey: key,
    queryFn: ({ signal }) => readCompanyAnalysisRelease(pin, signal),
    // A pin this browser has seen refused is not asked again.
    enabled: pin === null || !refused.has(pin),
    staleTime: Infinity,
    retry: (count, error) => !isReleaseRefused(error) && count < 2,
    ...seeded<CompanyAnalysisRelease>({ key }),
  })
}

// ──────────────────────────────────────────────────────────── the answer ──

function usePlanned<T>(read: PlannedRead<T> | null, options: { readonly keepPrevious?: boolean } = {}) {
  const seeded = useSeeded()
  return useQuery({
    queryKey: read?.key ?? [...companyAnalyticsKeys.all, 'idle'],
    queryFn: ({ signal }) => read!.read(signal),
    enabled: read?.enabled ?? false,
    staleTime: STALE,
    retry: (count, error) => !isReleaseRefused(error) && !isCursorRefused(error) && count < 2,
    ...(options.keepPrevious ? { placeholderData: keepPreviousData } : {}),
    ...(read ? seeded<T>(read) : {}),
  })
}

export function useCompanyAnalysisStats(question: ResolvedQuestion | null) {
  return usePlanned(question ? planStats(question) : null)
}

export function useCompanyAnalysisBreakdown(question: ResolvedQuestion | null, dimension: CompanyAnalysisDimension, topN: number, enabled = true) {
  const read = question && enabled ? planBreakdown(question, dimension, topN) : null
  const query = usePlanned(read, { keepPrevious: true })
  // The rows of another grouping are no placeholder for this one.
  const stale = query.isPlaceholderData && query.data?.dimension !== dimension
  return { ...query, data: stale ? undefined : query.data }
}

export function useCompanyAnalysisSeries(question: ResolvedQuestion | null, release: CompanyAnalysisRelease | undefined, enabled = true) {
  return usePlanned(question && release && enabled ? planSeries(question, release) : null)
}

export function useCompanyAnalysisRecords(question: ResolvedQuestion | null, after: string | null) {
  return usePlanned(question ? planRecords(question, after) : null)
}

/** A filter's options (legal forms, observed statuses) from the year's whole population, while the filters are open. */
export function useCompanyAnalysisOptions(question: ResolvedQuestion | null, dimension: CompanyAnalysisDimension, enabled: boolean) {
  return usePlanned(question && enabled ? planOptions(question.release, question.year, dimension) : null)
}

/** The question resolved against its release: the year and measure it reads, what the release cannot answer. */
export function useResolvedQuestion(state: CompanyAnalyticsState, release: CompanyAnalysisRelease | undefined): ResolvedQuestion | null {
  return release ? resolveQuestion(state, release) : null
}
