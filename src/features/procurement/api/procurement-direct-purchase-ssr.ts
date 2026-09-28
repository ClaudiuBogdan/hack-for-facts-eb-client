import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import { contextInputOf, type DirectPurchase, type DpContext } from '../lib/direct-purchase-model'
import { fetchDirectPurchase, fetchDirectPurchaseContext } from './procurement-direct-purchase-api'

/**
 * A direct purchase page's server reads, for the route loader only.
 *
 * The purchase is two requests one after the other (~0.5 s against the API),
 * the context four side by side after it (~0.5 s); SEAP loads daily at most,
 * so each is kept in the server process for as long as a shared cache may
 * keep the page. The memos are bounded — there are millions of purchases —
 * and each read has its own deadline, not the request's signal: it is shared
 * across requests. A read past its deadline fails as a read; the page reads
 * it again in the browser and the render goes out `no-store`.
 */

const SSR_DEADLINE_MS = 6_000
const KEEP_MS = 10 * 60 * 1000
const MAX_PURCHASES = 1_000

// A partial read (names, the detail or a context read failed) is served once and read again, never kept.
const purchases = createServerMemo<DirectPurchase | null>(KEEP_MS, { maxEntries: MAX_PURCHASES, keep: (purchase) => purchase === null || !purchase.partial })
const contexts = createServerMemo<DpContext>(KEEP_MS, { maxEntries: MAX_PURCHASES, keep: (context) => !context.partial })

const deadline = () => withDeadline(undefined, SSR_DEADLINE_MS)

export interface ProcurementDirectPurchaseServerRead {
  readonly id: string
  /** `null`: SEAP has no such record. Absent: the read failed, and the browser reads it again. */
  readonly purchase?: DirectPurchase | null
  /** `null`: the purchase has none to read (no CUI for a side, no date, before 2019). Absent: not read, or the read failed. */
  readonly context?: DpContext | null
}

/** The purchase, then its context; a failed context is left out and the purchase stands. */
export async function readProcurementDirectPurchaseForSsr(id: string): Promise<ProcurementDirectPurchaseServerRead> {
  let purchase: DirectPurchase | null
  try {
    purchase = await purchases(id, () => fetchDirectPurchase(id, deadline()))
  } catch {
    return { id }
  }
  if (!purchase) return { id, purchase }
  const input = contextInputOf(purchase)
  if (!input) return { id, purchase, context: null }
  const found = purchase
  try {
    const context = await contexts(id, () => fetchDirectPurchaseContext(input, found, deadline()))
    return { id, purchase, context }
  } catch {
    return { id, purchase }
  }
}
