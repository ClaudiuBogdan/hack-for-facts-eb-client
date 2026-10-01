import { z } from 'zod'
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

/** A cutoff and the analysis build it was read from: a page that pins its reads to that build reads one generation. */
export interface BuildCutoff extends Cutoff {
  readonly build: string
}

const buildSchema = z.array(z.object({ meta: z.object({ buildId: z.string() }) })).min(1)

const cutoffReads = new Map<number, { readonly at: number; readonly read: Promise<BuildCutoff> }>()

export const NO_CUTOFF: Cutoff = { direct: null, contract: null }

/** Drops the kept cutoff: the build it was read from is no longer the API's (a page's pinned read was refused). */
export function forgetProcurementCutoff(latest: number): void {
  cutoffReads.delete(latest)
}

/**
 * The cutoff for the year after `latest` (the last complete year), kept; a
 * failed or timed-out read is forgotten. Not bound to one reader's signal —
 * it is shared — but to a timeout of its own.
 */
export function readProcurementCutoff(latest: number, now: number = Date.now()): Promise<BuildCutoff> {
  const kept = cutoffReads.get(latest)
  if (kept && now - kept.at < CUTOFF_KEEP_MS) return kept.read
  const part = latest + 1
  const fields: BuyerField[] = [
    { alias: 'nationalDirectMonths', kind: 'series', scope: { ...DIRECT, from: `${latest}-01`, to: `${part}-12` }, args: 'bucket: month, measure: recordCount', withBuild: true },
    { alias: 'nationalAwardMonths', kind: 'series', scope: { ...AWARDS, from: `${latest}-01`, to: `${part}-12` }, args: 'bucket: month, measure: recordCount', withBuild: true },
  ]
  const variables = Object.fromEntries(fields.map((field) => [field.alias, field.scope]))
  const read = graphqlQuery<Readonly<Record<string, unknown>>>(procurementBuyerQuery('ProcurementCutoff', fields, false), variables, {
    operationName: 'ProcurementCutoff',
    signal: AbortSignal.timeout(CUTOFF_TIMEOUT_MS),
  }).then((raw): BuildCutoff => {
    const months = (alias: string) => (buyerSeriesSchema.parse(raw[alias])[0]?.points ?? []).map((point) => ({ month: point.bucket, count: point.value ?? 0 }))
    // Both series from one build, or the read is no read: a publication between them would mix two.
    const builds = new Set(['nationalDirectMonths', 'nationalAwardMonths'].map((alias) => buildSchema.parse(raw[alias])[0]!.meta.buildId))
    if (builds.size !== 1) throw new Error('procurement cutoff read straddled two analysis builds')
    return { direct: cutoffMonth(months('nationalDirectMonths'), latest), contract: cutoffMonth(months('nationalAwardMonths'), latest), build: [...builds][0]! }
  })
  read.catch(() => {
    if (cutoffReads.get(latest)?.read === read) cutoffReads.delete(latest)
  })
  cutoffReads.set(latest, { at: now, read })
  return read
}

/** The shared cutoff as a result rather than a failure: a failed read is no cutoff (and no build), said. */
export function readCutoffOutcome(latest: number): Promise<{ readonly cutoff: Cutoff; readonly build: string | null; readonly failed: boolean }> {
  return readProcurementCutoff(latest).then(
    ({ build, ...cutoff }) => ({ cutoff, build, failed: false }),
    () => ({ cutoff: NO_CUTOFF, build: null, failed: true }),
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
