import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { buyerSeriesSchema, procurementBuyerQuery, type BuyerField } from './graphql/procurement-buyer-queries'
import { cutoffMonth } from '../lib/home-model'
import type { Cutoff } from '../lib/profile-period'

/**
 * SEAP's cutoff month per population — the newest month complete enough to
 * read, derived from the national monthly counts (the API's own `maxMonth`
 * names a month with a trickle of records). The same for every profile page,
 * so it is read once per ten minutes and shared by the buyer's and the
 * firm's pages.
 */

/** SEAP loads daily at most. */
const CUTOFF_KEEP_MS = 10 * 60 * 1000
/** A shared read has no reader's deadline: it gets its own. */
const CUTOFF_TIMEOUT_MS = 5_000
const DIRECT = { grain: 'direct_acquisition' } as const
const AWARDS = { grain: 'contract', recordKind: 'contract_award' } as const

const cutoffReads = new Map<number, { readonly at: number; readonly read: Promise<Cutoff> }>()

export const NO_CUTOFF: Cutoff = { direct: null, contract: null }

/**
 * The cutoff for the year after `latest` (the last complete year), kept; a
 * failed or timed-out read is forgotten. Not bound to one reader's signal —
 * it is shared — but to a timeout of its own.
 */
export function readProcurementCutoff(latest: number, now: number = Date.now()): Promise<Cutoff> {
  const kept = cutoffReads.get(latest)
  if (kept && now - kept.at < CUTOFF_KEEP_MS) return kept.read
  const part = latest + 1
  const fields: BuyerField[] = [
    { alias: 'nationalDirectMonths', kind: 'series', scope: { ...DIRECT, from: `${latest}-01`, to: `${part}-12` }, args: 'bucket: month, measure: recordCount' },
    { alias: 'nationalAwardMonths', kind: 'series', scope: { ...AWARDS, from: `${latest}-01`, to: `${part}-12` }, args: 'bucket: month, measure: recordCount' },
  ]
  const variables = Object.fromEntries(fields.map((field) => [field.alias, field.scope]))
  const read = graphqlQuery<Readonly<Record<string, unknown>>>(procurementBuyerQuery('ProcurementCutoff', fields, false), variables, {
    operationName: 'ProcurementCutoff',
    signal: AbortSignal.timeout(CUTOFF_TIMEOUT_MS),
  }).then((raw): Cutoff => {
    const months = (alias: string) => (buyerSeriesSchema.parse(raw[alias])[0]?.points ?? []).map((point) => ({ month: point.bucket, count: point.value ?? 0 }))
    return { direct: cutoffMonth(months('nationalDirectMonths'), latest), contract: cutoffMonth(months('nationalAwardMonths'), latest) }
  })
  read.catch(() => {
    if (cutoffReads.get(latest)?.read === read) cutoffReads.delete(latest)
  })
  cutoffReads.set(latest, { at: now, read })
  return read
}

/** The shared cutoff as a result rather than a failure: a failed read is no cutoff, said. */
export function readCutoffOutcome(latest: number): Promise<{ readonly cutoff: Cutoff; readonly failed: boolean }> {
  return readProcurementCutoff(latest).then(
    (cutoff) => ({ cutoff, failed: false }),
    () => ({ cutoff: NO_CUTOFF, failed: true }),
  )
}

/** Waits for a read the reader's signal cannot cancel (a shared one, or one without a signal), but not past the reader leaving. */
export function untilAborted<T>(read: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return read
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise<T>((resolve, reject) => {
    const leave = () => reject(signal.reason)
    signal.addEventListener('abort', leave, { once: true })
    read.then(
      (value) => {
        signal.removeEventListener('abort', leave)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', leave)
        reject(error)
      },
    )
  })
}
