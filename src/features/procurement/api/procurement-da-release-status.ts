import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { PROCUREMENT_DA_RELEASE_QUERY, procurementDaReleaseSchema } from './graphql/procurement-da-release-queries'
import { DA_RELEASE_STATUS_TTL_MS } from '../lib/disclosure-cache'
import { isOlderThanNewest, noteKey, resetNewestKeyForTests, sameKey, StaleDisclosureError } from '@/lib/disclosure-key'

/**
 * Whether the API serves direct acquisitions release 1
 * (`procurementDaRelease.enabled`): the one switch every procurement surface
 * reads to choose its path — the API's flag, never a client copy of it.
 */

export interface DaReleaseStatus {
  readonly enabled: boolean
  readonly dataAsOf: string | null
  /** D6 is enforced: its own switch, independent of `enabled`. */
  readonly privacyEnforced: boolean
  /** The supplier-privacy publication D6 reads; null when it is off or unreadable (everyone withheld). */
  readonly privacyAsOf: string | null
}

/** How long one answer about the release holds: part of the disclosure-change bound (`DA_DISCLOSURE_CHANGE_BOUND_SECONDS`). */
const RELEASE_TTL_MS = DA_RELEASE_STATUS_TTL_MS
/** The shared read's own deadline: it serves many readers, none of whose signals it takes. */
const RELEASE_DEADLINE_MS = 3_000

let cached: { readonly at: number; readonly status: Promise<DaReleaseStatus> } | null = null

/**
 * Whether the API serves release 1, read once a minute and shared across
 * readers — so no one reader's signal cuts it short. A failed read is not
 * kept and fails: a release id then shows a failed read, never „not found",
 * and a legacy link stays on its legacy page.
 */
export function readDaRelease(options?: { readonly fresh?: boolean }): Promise<DaReleaseStatus> {
  const now = Date.now()
  // Fresh: a check that authorises what an earlier read served asks the API now, never the minute-old answer (D6).
  // A kept answer is checked again on each hit: a later request's older answer can have been kept before an earlier one's newer answer arrived.
  if (!options?.fresh && cached && now - cached.at < RELEASE_TTL_MS) {
    return cached.status.then((kept) => (isOlderThanNewest(kept.privacyAsOf) ? readDaRelease({ fresh: true }) : kept))
  }
  // An answer older than one already seen (a response the network reordered) is dropped and read again once; still older, the read fails.
  const status = fetchStatus().then((first) => (isOlderThanNewest(first.privacyAsOf) ? fetchStatus() : first)).then((answer) => {
    if (isOlderThanNewest(answer.privacyAsOf)) throw new StaleDisclosureError(answer.privacyAsOf)
    noteKey(answer.privacyAsOf)
    return answer
  })
  status.catch(() => {
    if (cached?.status === status) cached = null
  })
  cached = { at: now, status }
  return status
}

function fetchStatus(): Promise<DaReleaseStatus> {
  return graphqlQuery<unknown>(PROCUREMENT_DA_RELEASE_QUERY, {}, { operationName: 'ProcurementDaRelease', signal: withDeadline(undefined, RELEASE_DEADLINE_MS) }).then((raw) => procurementDaReleaseSchema.parse(raw).procurementDaRelease)
}

// The newest publication seen lives in `@/lib/disclosure-key`: the status, every response and the watch feed it.
export { StaleDisclosureError } from '@/lib/disclosure-key'

/** Tests only: forget the release's answer and the newest publication seen. */
export function resetDaReleaseForTests(): void {
  cached = null
  resetNewestKeyForTests()
}


/** Whether the release is on, for a surface that only adjusts to it: a failed read is the release off (the legacy path stands). */
export function isDaReleaseOn(): Promise<boolean> {
  return readDaRelease().then(
    (status) => status.enabled,
    () => false,
  )
}

/**
 * The publication a cached direct-acquisition answer belongs to: whether the
 * release is on, the data's as-of time, whether D6 is enforced and the
 * supplier-privacy publication it reads. Every server memo of a page that
 * shows direct-purchase money or suppliers is keyed by it, so a supplier
 * withheld by a publish is never served from a memo past it (owner via root,
 * D6). Null when it cannot be read: the caller reads fresh and keeps nothing.
 */
export function disclosureVersion(options?: { readonly fresh?: boolean }): Promise<string | null> {
  return readDaRelease(options).then(
    (status) =>
      // D6 on with its supplier-privacy publication unreadable (everyone withheld for now): never kept, so nothing outlives it (API contract d534ebd0).
      status.privacyEnforced && status.privacyAsOf === null
        ? null
        : `${status.enabled ? 'on' : 'off'}:${status.dataAsOf ?? '-'}:${status.privacyEnforced ? 'd6' : 'nod6'}:${status.privacyAsOf ?? '-'}`,
    () => null,
  )
}

/** What a page may ask of direct purchases' suppliers in the current switch state. */
export interface DaSupplierReads {
  /** Rankings, concentration and distinct counts: refused while D6 is enforced and the release is off. */
  readonly figures: boolean
  /** Places (region, county, locality): served only by the legacy analysis with D6 off. */
  readonly places: boolean
  /** The switch state was read; unread, neither is asked (a refused field would fail its whole request) and the page is partial. */
  readonly known: boolean
}

/** The switch state as reads: unread, nothing the D6 window refuses is asked — the page says it unavailable, and is not kept. */
export function daSupplierReads(): Promise<DaSupplierReads> {
  return readDaRelease().then(
    (status) => ({ figures: !(status.privacyEnforced && !status.enabled), places: !status.enabled && !status.privacyEnforced, known: true }),
    () => ({ figures: false, places: false, known: false }),
  )
}

/**
 * The publication as a watcher compares it: like `disclosureVersion`, but a
 * failed read fails (the watcher backs off, and purges nothing on it), and
 * D6 on with its supplier-privacy publication unreadable is a state of its
 * own — everyone withheld — which a page must not keep names across.
 */
export function readDisclosureNow(): Promise<string> {
  // Fresh: the watcher reads once a minute anyway, and must never take a status another read refreshed just before a publish.
  return readDaRelease({ fresh: true }).then((status) =>
    status.privacyEnforced && status.privacyAsOf === null
      ? 'd6-unavailable'
      : `${status.enabled ? 'on' : 'off'}:${status.dataAsOf ?? '-'}:${status.privacyEnforced ? 'd6' : 'nod6'}:${status.privacyAsOf ?? '-'}`,
  )
}

/**
 * A server render's reads under the publication they were read in, read
 * first: data read after it can only be newer, which the browser's first poll
 * then purges — never older under a newer label. The page's headers keep no
 * render whose publication is unknown, and the browser drops a seed whose
 * publication is not the one it reads (`use-disclosure-watch`).
 */
export async function seededUnder<T extends object>(read: () => Promise<T>): Promise<T & { readonly disclosure: string | null; readonly disclosureReadAt: number }> {
  // When the publication was read: an open tab's fail-closed clock starts from it, so a CDN copy cannot extend the bound (§24.4).
  const disclosureReadAt = Date.now()
  const disclosure = await disclosureVersion()
  return { ...(await read()), disclosure, disclosureReadAt }
}

/** A direct-purchase answer served under another D6 state than the one its cache key was planned under. */
export class DisclosureMismatchError extends Error {
  constructor(readonly expected: string | null, readonly served: string | null) {
    super(`direct-purchase answer served under ${served ?? 'nothing'}, planned under ${expected ?? 'an unknown publication'}`)
    this.name = 'DisclosureMismatchError'
  }
}

/** The D6 state a publication's answers are served under, as the API's `meta.disclosureKey` says it: `off`, `unavailable`, or the supplier-privacy publication. */
function servedKeyOf(version: string | null): string {
  if (version === null) return 'unavailable'
  // `on|off:<dataAsOf>:d6|nod6:<privacyAsOf>` — the timestamps hold colons, so the D6 part is read from the end.
  const d6Part = /:(nod6|d6):([^]*)$/u.exec(version)
  const d6 = d6Part?.[1]
  const privacyAsOf = d6Part?.[2]
  if (d6 !== 'd6') return 'off'
  return privacyAsOf && privacyAsOf !== '-' ? privacyAsOf : 'unavailable'
}

/**
 * A name-bearing direct-purchase answer (a ranking, a records page) is kept
 * only under the D6 state it was served under (API contract: key DA caches
 * by build and disclosure key), and never under a publication older than the
 * newest seen. An answer served `unavailable` is never kept
 * (API contract: the one state that can recur after a named answer, and a page
 * read while access was restored can carry it), nor one planned under an
 * unknown publication: either fails the read, nothing is kept, and the release
 * is read again.
 */
export function assertServedUnder(expected: string | null, served: string | null | undefined): void {
  const want = servedKeyOf(expected)
  const got = served ?? null
  // Whatever the plan, a newer publication served is remembered: an older plan's answer that follows it is refused.
  noteKey(got)
  if (got !== null && got !== 'unavailable' && want !== 'unavailable' && !isOlderThanNewest(got) && (got === want || (want !== 'off' && sameKey(got, want)))) return
  cached = null
  throw new DisclosureMismatchError(expected, got)
}
