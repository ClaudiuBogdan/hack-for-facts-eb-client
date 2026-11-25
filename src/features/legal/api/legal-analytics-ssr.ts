import { withDeadline } from '@/lib/ssr/deadline-signal'
import type { LegalAnalyticsAnswer, LegalAnalyticsArgs, LegalAnalyticsView } from '@/schemas/legal-analytics'
import { fetchLegalAnalytics } from './legal-analytics-api'

/**
 * The analytics pages' server reads, for the route loaders only: the AGGREGATE views of the default question
 * (head, summary, breakdown, series, grid). The views that name acts (acts, links) are never read here: they are
 * read in the browser, afresh, as the server serves them `no-store`.
 *
 * A read is kept in the server process for `KEEP_MS`; for one more `KEEP_MS` past that it is still served while
 * one background read refreshes it. Past both, the kept read is not served any more: the render waits for a fresh
 * read and, if that fails (the server refuses with 503, or the read passes its deadline), the failure reaches the
 * loader, the render goes out `no-store` and the browser reads again. So a page is never publicly cached on the
 * strength of an answer older than twice the window while the API is refusing.
 */

const SSR_DEADLINE_MS = 5_000
const KEEP_MS = 5 * 60 * 1000
const MAX_ENTRIES = 32

type Answer = LegalAnalyticsAnswer<LegalAnalyticsView>
type Entry = {
  /** The read: in flight, or resolved and kept. */
  readonly value: Promise<Answer>
  /** When the read resolved and was kept; `null` while it is in flight. */
  keptAt: number | null
  /** The background refresh in flight, if any: awaited, not started again, at the hard cutoff. */
  refreshing: Promise<Answer> | null
}

const entries = new Map<string, Entry>()

function start(key: string, read: () => Promise<Answer>, now: () => number): Promise<Answer> {
  const value = read()
  const entry: Entry = { value, keptAt: null, refreshing: null }
  entries.set(key, entry)
  value.then(
    () => {
      if (entries.get(key) === entry) entry.keptAt = now()
    },
    () => {
      if (entries.get(key) === entry) entries.delete(key)
    },
  )
  // Bounded: past the limit the oldest key goes first (a Map iterates in insertion order).
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next()
    if (oldest.done) break
    entries.delete(oldest.value)
  }
  return value
}

/** The kept read of `key`, refreshed, served stale or read again by its age (see the module's note). */
export function memoAnalyticsRead(key: string, read: () => Promise<Answer>, now: () => number = Date.now): Promise<Answer> {
  const hit = entries.get(key)
  if (hit?.keptAt == null) return hit ? hit.value : start(key, read, now)
  const age = now() - hit.keptAt
  if (age < KEEP_MS) return hit.value
  if (age < 2 * KEEP_MS) {
    if (!hit.refreshing) {
      const fresh = read()
      hit.refreshing = fresh
      fresh.then(
        () => {
          if (entries.get(key) === hit) entries.set(key, { value: fresh, keptAt: now(), refreshing: null })
        },
        () => {
          if (hit.refreshing === fresh) hit.refreshing = null
        },
      )
    }
    return hit.value
  }
  // Too old to serve: wait for a fresh read (the refresh already in flight, if any), and let its failure reach
  // the loader.
  entries.delete(key)
  if (hit.refreshing) {
    const pending = hit.refreshing
    const entry: Entry = { value: pending, keptAt: null, refreshing: null }
    entries.set(key, entry)
    pending.then(
      () => {
        if (entries.get(key) === entry) entry.keptAt = now()
      },
      () => {
        if (entries.get(key) === entry) entries.delete(key)
      },
    )
    return pending
  }
  return start(key, read, now)
}

/** For tests: forget every kept read. */
export function forgetAnalyticsReads(): void {
  entries.clear()
}

export function readLegalAnalyticsForSsr<V extends Exclude<LegalAnalyticsView, 'acts' | 'links'>>(
  view: V,
  args: LegalAnalyticsArgs,
): Promise<LegalAnalyticsAnswer<V>> {
  return memoAnalyticsRead(`${view}:${JSON.stringify(args)}`, () =>
    fetchLegalAnalytics(view, args, withDeadline(undefined, SSR_DEADLINE_MS)),
  ) as Promise<LegalAnalyticsAnswer<V>>
}
