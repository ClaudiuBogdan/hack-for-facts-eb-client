import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import type { StatisticsHubData } from '@/schemas/statistics'
import { resolveInsSsrDeadlineMs } from '../lib/ssr-deadline'
import { fetchStatisticsHub } from './statistics-api'

/**
 * The `/ins` hub's server read, for the route loader only.
 *
 * TanStack Start sends no HTML until the loader resolves, and the hub is two
 * rounds of INS reads (the national values, then the county layers). INS
 * publishes monthly, so the read is kept in the server process for as long
 * as a shared cache may keep the page (ten minutes), and past that served
 * while one read refreshes it (`createServerMemo`). A read with a failed
 * section is served once, never kept. The read has its own deadline, not the
 * request's signal: it is shared across requests, and one reader leaving must
 * not fail it for the others. Past the deadline a section fails as a read:
 * the render goes out `no-store` and the browser reads it again.
 */

const KEEP_MS = 10 * 60 * 1000

const hub = createServerMemo<StatisticsHubData>(KEEP_MS, { keep: (read) => read.failures.length === 0 })

export function readStatisticsHubForSsr(): Promise<StatisticsHubData> {
  return hub('hub', () => fetchStatisticsHub(withDeadline(undefined, resolveInsSsrDeadlineMs())))
}
