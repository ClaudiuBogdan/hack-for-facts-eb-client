import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/graphql-client'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { cpvKey, type DirectPurchase } from '../lib/direct-purchase-model'
import { mapReleasePurchase } from '../lib/direct-purchase-release'
import {
  PROCUREMENT_DA_LOOKUP_QUERY,
  PROCUREMENT_DA_PURCHASE_QUERY,
  PROCUREMENT_DA_RELEASE_QUERY,
  procurementDaLookupSchema,
  procurementDaPurchaseSchema,
  procurementDaReleaseSchema,
} from './graphql/procurement-da-release-queries'
import { PROCUREMENT_DA_RECORD_QUERY, procurementDaRecordResponseSchema } from './graphql/procurement-queries'
import { fetchDirectPurchase, readNames } from './procurement-direct-purchase-api'

/**
 * Direct acquisitions release 1 on the purchase page: whether the API serves
 * it (`procurementDaRelease.enabled` — the API's flag, never a client copy of
 * it), a purchase read from it by its release id, and a legacy link resolved
 * to that id by the portal code, so the page redirects to it.
 *
 * With the release off, a legacy id reads the legacy surface as before and a
 * release id has no purchase to show.
 */

/** A release purchase's public id: 64 hex characters. A legacy id never is. */
const RELEASE_ID = /^[0-9a-f]{64}$/u

export function isReleaseId(id: string): boolean {
  return RELEASE_ID.test(id)
}

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

const hasCode = (error: unknown, code: string): boolean =>
  error instanceof GraphQLRequestError && error.graphQLErrors.some((entry) => entry.extensions?.code === code)

/** A release purchase with its lines and the buyer's and category's names; null when the release has no such purchase. */
export async function fetchReleasePurchase(id: string, signal?: AbortSignal): Promise<DirectPurchase | null> {
  let detail
  try {
    const raw = await graphqlQuery<unknown>(PROCUREMENT_DA_PURCHASE_QUERY, { purchaseId: id }, { operationName: 'ProcurementDaPurchase', signal })
    detail = procurementDaPurchaseSchema.parse(raw).procurementDaPurchase
  } catch (error) {
    if (!signal?.aborted && hasCode(error, 'NOT_FOUND')) return null
    throw error
  }
  // The buyer only: a supplier is named by the release alone (D6), never by another read.
  const buyerCui = detail.purchase.buyer?.fiscalCode?.trim() || null
  const code = cpvKey(detail.purchase.categoryCode)
  const names = await readNames(buyerCui ? [buyerCui] : [], code ? [code] : [], buyerCui, signal)
  return mapReleasePurchase(detail, names)
}

/**
 * The release id a legacy link leads to: the legacy record's portal code,
 * looked up in the release. Null when the release is off, the record is not
 * a portal purchase with a code, or the release has no single purchase with
 * that code — the legacy page then stands.
 */
export async function resolveReleaseId(legacyId: string, signal?: AbortSignal): Promise<string | null> {
  if (isReleaseId(legacyId)) return null
  try {
    const release = await readDaRelease()
    if (!release.enabled) return null
    const legacy = await graphqlQuery<unknown>(PROCUREMENT_DA_RECORD_QUERY, { id: legacyId }, { operationName: 'ProcurementDirectAcquisitionRecord', signal })
    const record = procurementDaRecordResponseSchema.parse(legacy).procurementDirectAcquisition?.directAcquisition
    const code = record?.sourceSystem === 'elicitatie_da' ? record.uniqueCode?.trim() : null
    if (!code) return null
    const raw = await graphqlQuery<unknown>(PROCUREMENT_DA_LOOKUP_QUERY, { code }, { operationName: 'ProcurementDaLookup', signal })
    const found = procurementDaLookupSchema.parse(raw).procurementDaPurchases
    return found.total === 1 && found.items.length === 1 ? (found.items[0]?.purchaseId ?? null) : null
  } catch (error) {
    if (signal?.aborted) throw error
    // A failed lookup leaves the legacy page standing.
    return null
  }
}

/**
 * The purchase the page shows for an id: a release id reads the release (none
 * when it is off); a legacy id, the release's purchase it leads to when there
 * is one (its `id` then differs, and the page replaces the URL with it), else
 * the legacy surface.
 */
export async function fetchPurchaseForPage(id: string, signal?: AbortSignal): Promise<DirectPurchase | null> {
  if (!isReleaseId(id)) {
    const target = await resolveReleaseId(id, signal)
    const found = target ? await fetchReleasePurchase(target, signal) : null
    return found ?? fetchDirectPurchase(id, signal)
  }
  const release = await readDaRelease()
  return release.enabled ? fetchReleasePurchase(id, signal) : null
}
