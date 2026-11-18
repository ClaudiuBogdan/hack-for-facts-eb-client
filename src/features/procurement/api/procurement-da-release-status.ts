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
