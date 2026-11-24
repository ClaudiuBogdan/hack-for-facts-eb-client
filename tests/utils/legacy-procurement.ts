/**
 * Whether the API has legacy procurement (contracts, procedures, framework
 * agreements) switched off. On Chronos dev it is off for the 24 Nov 2026 CNP
 * containment: every legacy read answers `SERVICE_UNAVAILABLE`. The specs that
 * read legacy rows skip while it is off, and run again on their own once the
 * flag is back on. Any other answer, an outage included, is not „off": the
 * specs run and fail on it.
 *
 * It asks the API the server render reads (`INTERNAL_API_URL`, else
 * `VITE_API_URL`). Without either (a local dev server) the page's own proxy
 * decides, and the specs run.
 */

import { isLegacyOffAnswer } from '../../src/lib/graphql/legacy-procurement'

export const LEGACY_PROCUREMENT_OFF = 'legacy procurement off on Chronos dev, 24 Nov CNP containment; re-enable with the flag'

let answer: Promise<boolean> | undefined

async function probe(): Promise<boolean> {
  const api = process.env.INTERNAL_API_URL || process.env.VITE_API_URL
  if (!api) return false
  const response = await fetch(`${api.replace(/\/+$/u, '')}/api/v1/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ procurementProcedure(id: "337399") { procedure { id } } }' }),
    signal: AbortSignal.timeout(20000),
  }).catch(() => null)
  const body = (await response?.json().catch(() => null)) as {
    readonly errors?: unknown
  } | null
  // The switch's own answer, the client's breaker's signature: a legacy outage that says something else is not „off".
  return isLegacyOffAnswer(body?.errors)
}

/** Asked once per worker. */
export function legacyProcurementOff(): Promise<boolean> {
  answer ??= probe()
  return answer
}
