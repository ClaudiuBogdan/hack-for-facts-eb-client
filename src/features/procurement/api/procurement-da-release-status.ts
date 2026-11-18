import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { PROCUREMENT_DA_RELEASE_QUERY, procurementDaReleaseSchema } from './graphql/procurement-da-release-queries'

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

/** How long one answer about the release holds: the flag flips with a deploy, not per request. */
const RELEASE_TTL_MS = 60 * 1000
/** The shared read's own deadline: it serves many readers, none of whose signals it takes. */
const RELEASE_DEADLINE_MS = 3_000

let cached: { readonly at: number; readonly status: Promise<DaReleaseStatus> } | null = null

/**
 * Whether the API serves release 1, read once a minute and shared across
 * readers — so no one reader's signal cuts it short. A failed read is not
 * kept and fails: a release id then shows a failed read, never „not found",
 * and a legacy link stays on its legacy page.
 */
export function readDaRelease(): Promise<DaReleaseStatus> {
  const now = Date.now()
  if (cached && now - cached.at < RELEASE_TTL_MS) return cached.status
  const status = graphqlQuery<unknown>(PROCUREMENT_DA_RELEASE_QUERY, {}, { operationName: 'ProcurementDaRelease', signal: withDeadline(undefined, RELEASE_DEADLINE_MS) }).then((raw) => procurementDaReleaseSchema.parse(raw).procurementDaRelease)
  status.catch(() => {
    if (cached?.status === status) cached = null
  })
  cached = { at: now, status }
  return status
}

/** Tests only: forget the release's answer. */
export function resetDaReleaseForTests(): void {
  cached = null
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
export function disclosureVersion(): Promise<string | null> {
  return readDaRelease().then(
    (status) =>
      // D6 on with its supplier-privacy publication unreadable (everyone withheld for now): never kept, so nothing outlives it (API contract d534ebd0).
      status.privacyEnforced && status.privacyAsOf === null
        ? null
        : `${status.enabled ? 'on' : 'off'}:${status.dataAsOf ?? '-'}:${status.privacyEnforced ? 'd6' : 'nod6'}:${status.privacyAsOf ?? '-'}`,
    () => null,
  )
}

/** A memoised read under the publication it belongs to; unknown publication, a fresh read kept nowhere. */
export async function underDisclosure<T>(memo: (key: string, read: () => Promise<T>) => Promise<T>, key: string, read: () => Promise<T>): Promise<T> {
  const version = await disclosureVersion()
  return version === null ? read() : memo(`${version}|${key}`, read)
}

/**
 * Whether direct purchases' supplier figures can be read: D6 enforced while
 * the release is off (before the switch, or after a rollback) refuses the
 * supplier rankings, places, concentration and distinct-supplier counts, and
 * a page shows them as unavailable instead (root's ruling). A failed read of
 * the switch reads them as ever — a refusal then fails that read alone.
 */
export function daSupplierFiguresOpen(): Promise<boolean> {
  return readDaRelease().then(
    (status) => !(status.privacyEnforced && !status.enabled),
    () => true,
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
  return readDaRelease().then((status) =>
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
export async function seededUnder<T extends object>(read: () => Promise<T>): Promise<T & { readonly disclosure: string | null }> {
  const disclosure = await disclosureVersion()
  return { ...(await read()), disclosure }
}
