/**
 * The national budget's public reads, kept in the web server's memory and
 * shared by every reader's render (owner, 25 November 2026: the pages render
 * on the server, for search engines and agents, and must load fast). Only
 * the API's answers are kept, which depend on no reader; each page is still
 * rendered for its request, private and no-store (CACHE-001).
 *
 * A read bound to a bulletin snapshot answers the same for as long as the
 * snapshot lives, and a new bulletin brings a new snapshot, hence new keys:
 * the page moves to it by itself, the December bulletin included. A read
 * without one (the catalog for a minute, ANAF for five) is fresh, then
 * served while a single read behind it replaces it, for up to a day. A failed read
 * keeps nothing and leaves the copy it would have replaced. In the browser
 * nothing is kept here: TanStack Query keeps the tab's reads.
 */

export type SharedPolicy = {
  /** How long a copy is served as it is. */
  readonly fresh: number
  /** How long a copy past `fresh` is still served while a read replaces it; after that, the reader waits for the read. */
  readonly keep: number
}

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** A read bound to a snapshot: the same answer for as long as it is asked. */
export const SNAPSHOT_BOUND: SharedPolicy = { fresh: DAY, keep: DAY }
/** A read of the current state: ANAF's reports. */
export const CURRENT_STATE: SharedPolicy = { fresh: 5 * MINUTE, keep: DAY }
/** The catalog: it names the bulletins' snapshot, which the browser reads after it, so it is kept fresh a minute only. */
export const CATALOG: SharedPolicy = { fresh: MINUTE, keep: DAY }

/** A shared read's own limit: one reader leaving doesn't cancel it for the others. */
const SHARED_READ_MS = 30_000
/** Copies kept: an observations page of 100 rows is some 100 kB. */
const SIZE = 300

type Entry = { readonly at: number; readonly value?: unknown; readonly pending?: Promise<unknown> }

/** The memory itself, with its clock; exported for its tests. */
export function createSharedMemory({ size = SIZE, now = Date.now }: { readonly size?: number; readonly now?: () => number } = {}) {
  const entries = new Map<string, Entry>()

  /** The least recently used copies go first; a read still in flight stays. */
  function trim() {
    for (const [key, entry] of entries) {
      if (entries.size <= size) return
      if (!entry.pending) entries.delete(key)
    }
  }

  /** Moved last: the copy was just used. */
  function touch(key: string, entry: Entry) {
    entries.delete(key)
    entries.set(key, entry)
  }

  function fill<T>(key: string, read: () => Promise<T>): Promise<T> {
    const kept = entries.get(key)
    // A fill forgotten or replaced while it ran writes nothing: its answer may be of a bulletin since replaced.
    const ours = () => entries.get(key)?.pending === pending
    const pending: Promise<T> = read().then(
      (value) => {
        if (ours()) {
          touch(key, { at: now(), value })
          trim()
        }
        return value
      },
      (error: unknown) => {
        const current = entries.get(key)
        if (current && ours()) {
          if ('value' in current) entries.set(key, { at: current.at, value: current.value })
          else entries.delete(key)
        }
        throw error
      },
    )
    entries.set(key, { ...kept, at: kept?.at ?? 0, pending })
    return pending
  }

  return {
    read<T>(key: string, policy: SharedPolicy, read: () => Promise<T>): Promise<T> {
      const entry = entries.get(key)
      if (entry && 'value' in entry) {
        const age = now() - entry.at
        if (age <= policy.keep) touch(key, entry)
        if (age <= policy.fresh) return Promise.resolve(entry.value as T)
        if (age <= policy.keep) {
          if (!entry.pending) fill(key, read).catch(() => undefined)
          return Promise.resolve(entry.value as T)
        }
      }
      return (entry?.pending as Promise<T> | undefined) ?? fill(key, read)
    },
    forget(key: string) {
      entries.delete(key)
    },
  }
}

const memory = createSharedMemory()

/** A promise that gives up when the reader's signal does, without stopping what it waits for. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', abort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort)
        reject(error)
      },
    )
  })
}

/**
 * A read through the server's shared copy, by its key (what it asks, in
 * full); in the browser, the read itself with the reader's signal. On the
 * server the read runs on its own limit, and the reader stops waiting when
 * its own signal aborts.
 */
export function sharedRead<T>(key: string, policy: SharedPolicy, read: (signal: AbortSignal | undefined) => Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!import.meta.env.SSR) return read(signal)
  // A reader already gone starts nothing: a read no one waits on could fail unobserved.
  if (signal?.aborted) return Promise.reject(signal.reason)
  return untilAborted(
    memory.read(key, policy, () => read(AbortSignal.timeout(SHARED_READ_MS))),
    signal,
  )
}

/** Drops the server's copy of a read (the catalog, when a read finds its snapshot moved). */
export function forgetShared(key: string): void {
  if (import.meta.env.SSR) memory.forget(key)
}
