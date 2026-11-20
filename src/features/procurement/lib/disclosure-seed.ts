import { isOlderThanNewest } from '@/lib/disclosure-key'
import { DA_DISCLOSURE_CHANGE_BOUND_SECONDS } from './disclosure-cache'

/**
 * The publication the browser last read (D6), and whether a server render's
 * seed belongs to it. Once the browser has read one, a seed of another — a
 * CDN copy of an older render, or a page left open across a publish — is
 * never used again, whatever render still holds it: its supplier names and
 * codes may be withheld now. A module of its own, with no reads, so a route's
 * entry chunk can ask it.
 */

let verified: string | null = null
/** When the publication was last read successfully, by the reading's own time — a remounted watch's cached reading is not a new one. */
let readAt: number | null = null
/** When this page started: the clock's start before any reading. */
let startedAt = Date.now()

/** The publication just read (the app shell's watch), and when it was read. */
export function markVerifiedPublication(version: string, at: number = Date.now()): void {
  verified = version
  readAt = Math.max(readAt ?? 0, at)
}

/** The oldest time a server render this tab was served read its publication: a CDN copy's age counts against the bound. */
let servedAt: number | null = null

/** A server render's read time, as its seed carries it (`disclosureReadAt`). */
export function markServedAt(at: number): void {
  if (Number.isFinite(at)) servedAt = servedAt === null ? at : Math.min(servedAt, at)
}

/** Since when the tab has gone without a successful reading: its last poll, else the oldest render it was served, else its start. */
export function lastReadAt(): number {
  return readAt ?? Math.min(servedAt ?? startedAt, startedAt)
}

/**
 * Whether the tab has gone longer than the bound without a successful reading,
 * by the clock now: the timer that marks it unreadable may not have run yet
 * (a suspended tab, a remount), and nothing past the bound may be used meanwhile.
 */
export function isPastBound(): boolean {
  return Date.now() - lastReadAt() > DA_DISCLOSURE_CHANGE_BOUND_SECONDS * 1000
}

/** A seed's read time, when it carries one. */
function readAtOf(data: object): number | null {
  const at = (data as { readonly disclosureReadAt?: unknown }).disclosureReadAt
  return typeof at === 'number' && Number.isFinite(at) ? at : null
}

/** Tests only. */
export function forgetVerifiedPublicationForTests(): void {
  verified = null
  servedAt = null
  readAt = null
  startedAt = Date.now()
  unreadable = false
  unreadableSince = null
}

/** Whether a loader's data may seed the page: not a server render's, or one read under the publication the browser read last (none read yet: the page as served), and never while the publication cannot be read. */
export function isSeedCurrent(data: unknown): boolean {
  if (!data || typeof data !== 'object' || !('disclosure' in data)) return true
  const disclosure = (data as { readonly disclosure?: string | null }).disclosure ?? null
  // Read under an older supplier-privacy publication than one this tab (on the server, this process) has seen, by any read.
  if (isOlderThanNewest(privacyPartOf(disclosure))) return false
  // On the server the loader's data is this render's own read, kept nowhere: the checks below are an open tab's. Its clock
  // never gets a reading there, so it would run out with the process's age and drop every render's seed.
  if (typeof window === 'undefined') return true
  if (unreadable || isPastBound()) return false
  if (verified === null) {
    // Nothing verified yet: a seed read longer ago than the bound (an old CDN copy, a remount past the deadline) is not used.
    const at = readAtOf(data)
    return at === null || Date.now() - at <= DA_DISCLOSURE_CHANGE_BOUND_SECONDS * 1000
  }
  return disclosure === verified
}

/** The supplier-privacy publication in a version string (`on|off:<dataAsOf>:d6|nod6:<privacyAsOf>`; the timestamps hold colons, so it is read from the end). */
export function privacyPartOf(version: string | null): string | null {
  const part = version === null ? null : /:(?:nod6|d6):([^]*)$/u.exec(version)?.[1]
  return part && part !== '-' ? part : null
}

/**
 * How many times a publication was retired in this tab. A view mounted on an
 * old publication's answers keeps them in its last render even once they are
 * removed from the cache, so the page is mounted afresh under this key
 * (`PublicationScope`), with nothing of the old publication to show.
 */
let retired = 0
const listeners = new Set<() => void>()
const notify = () => {
  for (const listener of listeners) listener()
}

export function retirePublication(): void {
  retired += 1
  notify()
}

/**
 * Privacy fails closed (root, 19 November 2026): once the publication has not
 * been read for longer than the disclosure-change bound, nothing the tab
 * held may be shown or asked again until a reading succeeds — a supplier may
 * have been withheld meanwhile.
 */
let unreadable = false
/** When the tab went unreadable: only a reading made after it restores the page. */
let unreadableSince: number | null = null

export function setDisclosureUnreadable(value: boolean): void {
  if (unreadable === value) return
  unreadable = value
  unreadableSince = value ? Date.now() : null
  notify()
}

export function isDisclosureUnreadable(): boolean {
  return unreadable
}

/** Whether a reading made at `at` ends the unreadable spell: one made after it began. */
export function endsUnreadable(at: number): boolean {
  return unreadable && unreadableSince !== null && at > unreadableSince
}

export function retiredPublications(): number {
  return retired
}

export function subscribeRetiredPublications(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
