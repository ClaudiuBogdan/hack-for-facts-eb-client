import { withDeadline } from '@/lib/ssr/deadline-signal'
import { contextInputOf, type DirectPurchase, type DpContext } from '../lib/direct-purchase-model'
import { DaReleaseOffError, fetchPurchaseForPage, isReleaseId, resolveLegacyLink, type LegacyLink } from './procurement-da-release-api'
import { fetchDirectPurchase, fetchDirectPurchaseContext } from './procurement-direct-purchase-api'

/**
 * A direct purchase page's server reads, for the route loader only.
 *
 * The purchase is two requests one after the other (~0.5 s against the API),
 * the context four side by side after it (~0.5 s). Nothing is kept in the
 * server process (D6, root 19 November 2026): the API is the one enforcer, and
 * the only windows are the CDN's ten minutes and the open-tab bound (design
 * §24.4). The context is looked up by the supplier's code the purchase read
 * just served. Each read has its own deadline. A read past its deadline fails
 * as a read; the page reads it again in the browser and the render goes out
 * `no-store`.
 */

const SSR_DEADLINE_MS = 6_000

const deadline = () => withDeadline(undefined, SSR_DEADLINE_MS)

export interface ProcurementDirectPurchaseServerRead {
  readonly id: string
  /** `null`: SEAP has no such record. Absent: the read failed, and the browser reads it again. */
  readonly purchase?: DirectPurchase | null
  /** `null`: the purchase has none to read (no CUI for a side, no date, before 2019). Absent: not read, or the read failed. */
  readonly context?: DpContext | null
  /** A release id while the API does not serve the release: not available yet, which is neither a record nor a failed read. */
  readonly releaseOff?: true
}

export function resolveLegacyLinkForSsr(id: string): Promise<LegacyLink> {
  if (isReleaseId(id)) return Promise.resolve({ kind: 'legacy' })
  return resolveLegacyLink(id, deadline()).catch((): LegacyLink => ({ kind: 'failed' }))
}

/**
 * The purchase, then its context; a failed context is left out and the
 * purchase stands. A legacy id is read here only once its link resolved to
 * the legacy page (the route redirects a release one, and reads nothing for a
 * failed one): it is not resolved again.
 */
export async function readProcurementDirectPurchaseForSsr(id: string): Promise<ProcurementDirectPurchaseServerRead> {
  let purchase: DirectPurchase | null
  try {
    purchase = await (isReleaseId(id) ? fetchPurchaseForPage(id, deadline()) : fetchDirectPurchase(id, deadline()))
  } catch (error) {
    if (error instanceof DaReleaseOffError) return { id, releaseOff: true }
    return { id }
  }
  if (!purchase) return { id, purchase }
  const input = contextInputOf(purchase)
  if (!input) return { id, purchase, context: null }
  try {
    const context = await fetchDirectPurchaseContext(input, purchase, deadline())
    return { id, purchase, context }
  } catch {
    return { id, purchase }
  }
}
