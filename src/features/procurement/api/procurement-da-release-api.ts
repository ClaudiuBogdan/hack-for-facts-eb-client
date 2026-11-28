import { GraphQLRequestError, graphqlQuery } from '@/lib/graphql/graphql-client'
import { cpvKey, type DirectPurchase } from '../lib/direct-purchase-model'
import { mapReleasePurchase } from '../lib/direct-purchase-release'
import {
  PROCUREMENT_DA_LOOKUP_QUERY,
  PROCUREMENT_DA_PURCHASE_QUERY,
  procurementDaLookupSchema,
  procurementDaPurchaseSchema,
} from './graphql/procurement-da-release-queries'
import { PROCUREMENT_DA_RECORD_QUERY, procurementDaRecordResponseSchema } from './graphql/procurement-queries'
import { fetchDirectPurchase, readNames } from './procurement-direct-purchase-api'
import { isLegacyRetired } from './procurement-legacy-retired'
import { readDaRelease } from './procurement-da-release-status'

export { readDaRelease, resetDaReleaseForTests, type DaReleaseStatus } from './procurement-da-release-status'

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

const hasCode = (error: unknown, code: string): boolean =>
  error instanceof GraphQLRequestError && error.graphQLErrors.some((entry) => entry.extensions?.code === code)

/**
 * A release id asked while the API does not serve the release
 * (`procurementDaRelease.enabled` false): the purchase is not available yet,
 * which says nothing about whether it exists. Not retried; never "not found".
 */
export class DaReleaseOffError extends Error {
  constructor() {
    super('The API does not serve direct acquisitions release 1 now.')
    this.name = 'DaReleaseOffError'
  }
}

/** A release purchase with its lines and the buyer's and category's names; null when the release has no such purchase. */
export async function fetchReleasePurchase(id: string, signal?: AbortSignal): Promise<DirectPurchase | null> {
  let detail
  try {
    const raw = await graphqlQuery<unknown>(PROCUREMENT_DA_PURCHASE_QUERY, { purchaseId: id }, { operationName: 'ProcurementDaPurchase', signal })
    detail = procurementDaPurchaseSchema.parse(raw).procurementDaPurchase
  } catch (error) {
    if (!signal?.aborted && hasCode(error, 'NOT_FOUND')) return null
    // The release switched off since its status was read (a rollback): every release read then answers this. Asked afresh.
    if (!signal?.aborted && hasCode(error, 'SERVICE_UNAVAILABLE') && !(await readDaRelease({ fresh: true })).enabled) throw new DaReleaseOffError()
    throw error
  }
  // The buyer only: a supplier is named by the release alone (D6), never by another read.
  const buyerCui = detail.purchase.buyer?.fiscalCode?.trim() || null
  const code = cpvKey(detail.purchase.categoryCode)
  const names = await readNames(buyerCui ? [buyerCui] : [], code ? [code] : [], buyerCui, signal)
  return mapReleasePurchase(detail, names)
}

/**
 * Where a legacy link leads, said as one of three: the release's purchase
 * (its id), the legacy page (the release is off, the record is no portal
 * purchase with a code, or the release has no single purchase with it), or
 * a failed read — never taken for either, so it is neither kept nor turned
 * into a page that the next read would contradict.
 */
export type LegacyLink = { readonly kind: 'release'; readonly id: string } | { readonly kind: 'legacy' } | { readonly kind: 'failed' }

export async function resolveLegacyLink(legacyId: string, signal?: AbortSignal): Promise<LegacyLink> {
  if (isReleaseId(legacyId)) return { kind: 'legacy' }
  try {
    const release = await readDaRelease()
    if (!release.enabled) return { kind: 'legacy' }
    // D6 fails closed: with its supplier-privacy publication unreadable, nothing is looked up — a failed read, as the page's own.
    if (release.privacyEnforced && release.privacyAsOf === null) return { kind: 'failed' }
    const legacy = await graphqlQuery<unknown>(PROCUREMENT_DA_RECORD_QUERY, { id: legacyId }, { operationName: 'ProcurementDirectAcquisitionRecord', signal, legacy: true })
    const record = procurementDaRecordResponseSchema.parse(legacy).procurementDirectAcquisition?.directAcquisition
    const code = record?.sourceSystem === 'elicitatie_da' ? record.uniqueCode?.trim() : null
    if (!code) return { kind: 'legacy' }
    const raw = await graphqlQuery<unknown>(PROCUREMENT_DA_LOOKUP_QUERY, { code }, { operationName: 'ProcurementDaLookup', signal })
    const found = procurementDaLookupSchema.parse(raw).procurementDaPurchases
    const id = found.total === 1 && found.items.length === 1 ? found.items[0]?.purchaseId : undefined
    return id ? { kind: 'release', id } : { kind: 'legacy' }
  } catch (error) {
    if (signal?.aborted) throw error
    // Legacy switched off: no legacy record to find the portal code on, so no release purchase to lead to. The legacy
    // page stands, and it has no record either: the page's not-found (PROC-001), never a failed read retried.
    if (isLegacyRetired(error)) return { kind: 'legacy' }
    // The release switched off since its status was read (a rollback): the legacy page stands, as with the release off.
    if (hasCode(error, 'SERVICE_UNAVAILABLE')) {
      const now = await readDaRelease({ fresh: true }).catch(() => null)
      if (now && !now.enabled) return { kind: 'legacy' }
    }
    return { kind: 'failed' }
  }
}

/**
 * A legacy purchase, read under the same D6 gate as the page's own read
 * (`fetchPurchaseForPage`): with D6 on and its supplier-privacy publication
 * unreadable, nothing is read. The server's render uses it once the link
 * resolved to the legacy page, so the server and the browser decide alike:
 * no record (legacy switched off included) is not-found on both, a gated read
 * is a failed read on both.
 */
export async function fetchLegacyPurchase(id: string, signal?: AbortSignal): Promise<DirectPurchase | null> {
  const status = await readDaRelease()
  if (status.privacyEnforced && status.privacyAsOf === null) throw new Error('Direct purchases cannot be read while the supplier-privacy publication is unreadable.')
  return fetchDirectPurchase(id, signal)
}

/** The release id a legacy link leads to, or null — a failed read included (callers that must tell them apart use `resolveLegacyLink`). */
export async function resolveReleaseId(legacyId: string, signal?: AbortSignal): Promise<string | null> {
  const link = await resolveLegacyLink(legacyId, signal)
  return link.kind === 'release' ? link.id : null
}

/**
 * The purchase the page shows for an id: a release id reads the release (not
 * available while it is off: `DaReleaseOffError`); a legacy id, the release's purchase it leads to when there
 * is one (its `id` then differs, and the page replaces the URL with it), else
 * the legacy surface.
 */
export async function fetchPurchaseForPage(id: string, signal?: AbortSignal): Promise<DirectPurchase | null> {
  // D6 fails closed: with D6 on and its supplier-privacy publication unreadable, a purchase is not read at all. Its API
  // type carries no publication, and a read in a brief restoration of access could carry a withheld name (root).
  let status = await readDaRelease()
  // A release id about to fail closed asks afresh first: a release switched off since (a rollback) is said as such.
  if (isReleaseId(id) && status.enabled && status.privacyEnforced && status.privacyAsOf === null) status = await readDaRelease({ fresh: true })
  // The release off is said as such whatever else holds: nothing is read for a release id then.
  if (isReleaseId(id) && !status.enabled) throw new DaReleaseOffError()
  if (status.privacyEnforced && status.privacyAsOf === null) throw new Error('Direct purchases cannot be read while the supplier-privacy publication is unreadable.')
  if (!isReleaseId(id)) {
    const link = await resolveLegacyLink(id, signal)
    // Unresolved is a failed read — retried — never a legacy page the next read would replace.
    if (link.kind === 'failed') throw new Error('Could not tell where this direct-purchase link leads.')
    const found = link.kind === 'release' ? await fetchReleasePurchase(link.id, signal).catch((error: unknown) => {
      // Switched off between the link's lookup and the purchase's read: the legacy page stands, as with the release off.
      if (error instanceof DaReleaseOffError) return null
      throw error
    }) : null
    return found ?? fetchDirectPurchase(id, signal)
  }
  return fetchReleasePurchase(id, signal)
}
