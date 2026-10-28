import { createLogger } from '@/lib/logger'

const logger = createLogger('server-memo')

/**
 * A read kept in the server process for a while.
 *
 * For public aggregates that change daily at most (the procurement front
 * door's national picture, one buyer's year): the first render reads the API,
 * every render inside the window answers from memory. Concurrent renders share
 * one flight, and only a read that succeeded is kept — a failure is dropped at
 * once, so the next render reads again.
 *
 * Past the window a kept read is served stale while one background read
 * refreshes it (stale-while-revalidate): no render waits for the API once the
 * key has been read. The refresh replaces the kept read only when it succeeds
 * and `keep` accepts it; otherwise the kept read stays, and the next render
 * past the window starts another refresh. Concurrent renders share one refresh.
 *
 * `maxEntries` bounds a memo keyed by something open-ended (a CUI): past it,
 * expired entries go first, then the oldest. Without it a key set is assumed
 * small and fixed (a year). `keep` drops a read that resolved but should be
 * read again (a page built from a partial read), as a failure is.
 *
 * A read shared across requests must not carry one request's abort signal:
 * a reader that disconnects would fail it for the others, and a refresh runs
 * after the request that started it has gone. The caller gives the read its
 * own deadline instead.
 *
 * Nothing here is server-only: a module shared with the browser keeps its
 * reference lists in one too (`procurement-reference-api.ts`).
 */
export function createServerMemo<T>(
  ttlMs: number,
  { maxEntries = Infinity, keep = () => true }: { readonly maxEntries?: number; readonly keep?: (value: T) => boolean } = {},
) {
  interface Entry {
    readonly expires: number
    readonly value: Promise<T>
    /** The read resolved and `keep` accepted it: past the window it is served stale. */
    kept: boolean
    /** A background refresh of this entry is in flight. */
    refreshing: boolean
  }
  const entries = new Map<string, Entry>()
  const makeRoom = (now: number) => {
    if (entries.size < maxEntries) return
    for (const [key, entry] of entries) if (entry.expires <= now) entries.delete(key)
    // A Map iterates in insertion order: the first key is the oldest read.
    while (entries.size >= maxEntries) {
      const oldest = entries.keys().next()
      if (oldest.done) break
      entries.delete(oldest.value)
    }
  }
  const read = (key: string, start: () => Promise<T>, now: number): Promise<T> => {
    const value = start()
    const entry: Entry = { expires: now + ttlMs, value, kept: false, refreshing: false }
    entries.set(key, entry)
    value.then(
      (resolved) => {
        if (entries.get(key) !== entry) return
        if (keep(resolved)) entry.kept = true
        else entries.delete(key)
      },
      () => {
        if (entries.get(key) === entry) entries.delete(key)
      },
    )
    return value
  }
  const refresh = (key: string, stale: Entry, start: () => Promise<T>, now: number) => {
    if (stale.refreshing) return
    stale.refreshing = true
    // A read that throws before it returns a promise fails as a read: no caller is waiting to receive it.
    const value = new Promise<T>((resolve) => resolve(start()))
    value.then(
      (resolved) => {
        // Evicted or replaced meanwhile: the refresh has nowhere to go.
        if (entries.get(key) !== stale) return
        if (!keep(resolved)) {
          stale.refreshing = false
          logger.warn('Server memo refresh not kept; serving the kept read')
          return
        }
        // Re-inserted, so the refreshed key counts as the newest for `maxEntries`.
        entries.delete(key)
        entries.set(key, { expires: now + ttlMs, value, kept: true, refreshing: false })
      },
      (error: unknown) => {
        stale.refreshing = false
        logger.warn('Server memo refresh failed; serving the kept read', { error: error instanceof Error ? error.message : String(error) })
      },
    )
  }
  return function memo(key: string, start: () => Promise<T>, now: number = Date.now()): Promise<T> {
    const hit = entries.get(key)
    if (hit && hit.expires > now) return hit.value
    if (hit?.kept) {
      refresh(key, hit, start, now)
      return hit.value
    }
    // Nothing kept (or a first read still in flight past its window): read now.
    entries.delete(key)
    makeRoom(now)
    return read(key, start, now)
  }
}
