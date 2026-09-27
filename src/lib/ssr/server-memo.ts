/**
 * A read kept in the server process for a while.
 *
 * For public aggregates that change daily at most (the procurement front
 * door's national picture): the first render after the window reads the API,
 * every render inside it answers from memory. Concurrent renders share one
 * flight, and only a read that succeeded is kept — a failure is dropped at
 * once, so the next render reads again.
 *
 * A read shared across requests must not carry one request's abort signal:
 * a reader that disconnects would fail it for the others. The caller gives
 * the read its own deadline instead.
 */
export function createServerMemo<T>(ttlMs: number) {
  const entries = new Map<string, { readonly expires: number; readonly value: Promise<T> }>()
  return function memo(key: string, read: () => Promise<T>, now: number = Date.now()): Promise<T> {
    const hit = entries.get(key)
    if (hit && hit.expires > now) return hit.value
    const value = read()
    entries.set(key, { expires: now + ttlMs, value })
    value.catch(() => {
      if (entries.get(key)?.value === value) entries.delete(key)
    })
    return value
  }
}
