/**
 * The newest supplier-privacy publication this process has seen (decision
 * D6; API doc 10: `privacyAsOf` and `meta.disclosureKey` only move forward).
 *
 * Responses can still arrive out of order, so the client keeps the newest key
 * it has seen and never keeps, keys or shows anything under an older one. The
 * status read, every GraphQL response (`graphql-client`, which refuses a
 * response carrying an older `meta.disclosureKey`) and the open-tab watch all
 * feed it. Listeners hear when it moves forward. Pure: no reads, safe for any
 * entry chunk.
 *
 * On the server this is module state shared by every request in the process.
 * That is right for it: the newest publication is the same for everyone. It
 * holds that one public timestamp and nothing else, never anything of a user
 * or a request.
 *
 * Keys are the API's timestamps, written to the microsecond. Two spellings of
 * one instant are the same key. `off` and `unavailable` are states, not
 * publications, and are never compared.
 */

let newest: string | null = null
const listeners = new Set<(key: string, previous: string | null) => void>()

/** An instant at full precision, as `seconds.nanoseconds`; null when the value is not a timestamp. */
export function instantOf(value: string): string | null {
  const parts = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}(?::?\d{2})?)$/u.exec(value)
  if (!parts) return null
  const [, day, time, fraction = '', zone] = parts
  const offset = zone === 'Z' ? 'Z' : zone!.length === 3 ? `${zone}:00` : zone!.includes(':') ? zone : `${zone!.slice(0, 3)}:${zone!.slice(3)}`
  const millis = Date.parse(`${day}T${time}${offset}`)
  return Number.isFinite(millis) ? `${millis / 1000}.${fraction.padEnd(9, '0')}` : null
}

/** -1, 0 or 1 by instant; null when either is not a timestamp. */
export function compareKeys(a: string, b: string): number | null {
  const left = instantOf(a)
  const right = instantOf(b)
  if (left === null || right === null) return null
  const [leftSeconds, leftFraction] = left.split('.') as [string, string]
  const [rightSeconds, rightFraction] = right.split('.') as [string, string]
  const bySeconds = Math.sign(Number(leftSeconds) - Number(rightSeconds))
  if (bySeconds !== 0) return bySeconds
  return leftFraction < rightFraction ? -1 : leftFraction > rightFraction ? 1 : 0
}

/** Whether two keys name one publication: the same string, or the same instant spelt otherwise. */
export function sameKey(a: string, b: string): boolean {
  return a === b || compareKeys(a, b) === 0
}

/** The newest publication seen, or null. */
export function newestKey(): string | null {
  return newest
}

/** Whether a key is a publication older than the newest seen. */
export function isOlderThanNewest(key: string | null | undefined): boolean {
  if (!key || newest === null) return false
  return (compareKeys(key, newest) ?? 0) < 0
}

/** A key seen: kept if it is a publication newer than the newest, and the listeners told. */
export function noteKey(key: string | null | undefined): void {
  if (!key || instantOf(key) === null) return
  if (newest !== null && (compareKeys(key, newest) ?? 0) <= 0) return
  const previous = newest
  newest = key
  for (const listener of listeners) listener(key, previous)
}

/** Hears each forward move of the newest key, with the key it replaces (null: the first one seen); returns the unsubscribe. */
export function subscribeNewestKey(listener: (key: string, previous: string | null) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * A follow-up lookup by codes a read served (D6): if a newer publication has
 * been seen since that read, its codes may be withheld now, so nothing is
 * sent and the read fails, to be read again.
 */
export function assertNoAdvanceSince(seen: string | null): void {
  if (newest !== seen) throw new StaleDisclosureError(seen)
}

/** A response, status or seed carrying an older publication than one already seen: dropped, never kept. */
export class StaleDisclosureError extends Error {
  constructor(readonly key: string | null) {
    super(`direct-purchase disclosure ${key ?? 'nothing'} is older than one already seen`)
    this.name = 'StaleDisclosureError'
  }
}

/**
 * Every `meta.disclosureKey` a response carries, at any depth. The newest of
 * them is noted; if any is older than the newest seen, the response is
 * refused, before anything keeps it.
 */
export function checkResponseKeys(data: unknown): void {
  const keys = keysIn(data)
  // Several keys in one response: the API reads one publication per request, so the newest of them stands for it.
  for (const key of keys) noteKey(key)
  // `unavailable` (supplier_privacy unreadable: everyone withheld) is never kept: a read made while access was briefly
  // restored can carry it with names (API contract d534ebd0). The response is refused — an incident state, fail closed (root).
  const stale = keys.find((key) => key === UNAVAILABLE || isOlderThanNewest(key))
  if (stale !== undefined) throw new StaleDisclosureError(stale)
}

/**
 * Whether a body carries a `meta.disclosureKey` older than the newest seen,
 * without noting any of its keys. For bodies whose documents the client did
 * not write (the same-origin proxy forwards any caller's query, and aliases
 * can name any field `meta { disclosureKey }`): such a body may only be
 * refused, never move the process's newest key.
 */
export function carriesOlderKey(data: unknown): boolean {
  return keysIn(data).some((key) => key === UNAVAILABLE || isOlderThanNewest(key))
}

const UNAVAILABLE = 'unavailable'

function keysIn(data: unknown): string[] {
  const keys: string[] = []
  const walk = (value: unknown, depth: number): void => {
    if (depth > 12 || value === null || typeof value !== 'object') return
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1)
      return
    }
    for (const [name, child] of Object.entries(value)) {
      if (name === 'meta' && child && typeof child === 'object' && !Array.isArray(child)) {
        const key = (child as { disclosureKey?: unknown }).disclosureKey
        if (typeof key === 'string') keys.push(key)
      }
      walk(child, depth + 1)
    }
  }
  walk(data, 0)
  return keys
}

/** Tests only. */
export function resetNewestKeyForTests(): void {
  newest = null
}
