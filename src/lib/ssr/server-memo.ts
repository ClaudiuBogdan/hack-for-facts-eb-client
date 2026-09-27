/**
 * A read kept in the server process for a while.
 *
 * For public aggregates that change daily at most (the procurement front
 * door's national picture, one buyer's year): the first render after the
 * window reads the API, every render inside it answers from memory.
 * Concurrent renders share one flight, and only a read that succeeded is kept
 * — a failure is dropped at once, so the next render reads again.
 *
 * `maxEntries` bounds a memo keyed by something open-ended (a CUI): past it,
 * expired entries go first, then the oldest. Without it a key set is assumed
 * small and fixed (a year). `keep` drops a read that resolved but should be
 * read again (a page built from a partial read), as a failure is.
 *
 * A read shared across requests must not carry one request's abort signal:
 * a reader that disconnects would fail it for the others. The caller gives
 * the read its own deadline instead.
 */
export function createServerMemo<T>(
  ttlMs: number,
  { maxEntries = Infinity, keep = () => true }: { readonly maxEntries?: number; readonly keep?: (value: T) => boolean } = {},
) {
  const entries = new Map<string, { readonly expires: number; readonly value: Promise<T> }>()
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
  return function memo(key: string, read: () => Promise<T>, now: number = Date.now()): Promise<T> {
    const hit = entries.get(key)
    if (hit && hit.expires > now) return hit.value
    entries.delete(key)
    makeRoom(now)
    const value = read()
    entries.set(key, { expires: now + ttlMs, value })
    const drop = () => {
      if (entries.get(key)?.value === value) entries.delete(key)
    }
    value.then((resolved) => {
      if (!keep(resolved)) drop()
    }, drop)
    return value
  }
}
