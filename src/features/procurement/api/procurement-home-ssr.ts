import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import { HOME_BIG_CONTRACTS } from '../hooks/use-procurement-home'
import type { NationalRead, RecentRecord } from '../lib/home-model'
import {
  fetchProcurementHomeBigContracts,
  fetchProcurementHomeCategories,
  fetchProcurementHomeNational,
  type HomeCategoriesRead,
} from './procurement-home-api'

/**
 * The front door's server reads, for the route loader only.
 *
 * TanStack Start sends no HTML until every loader resolves, and the three
 * reads take 0.5–1 s against the API. The national figures and the
 * categories carry direct purchases, so they are read on every render: D6 (root, 19 November 2026): direct-purchase reads are never kept in the server process. The API is the one enforcer, and the only windows are the CDN's ten minutes and the open-tab bound (design §24.4).
 * The big contracts carry contracts only, and are kept for as long as a
 * shared cache may keep the page (`createServerMemo`). Each read has its own deadline, not the request's signal — it
 * is shared across requests, and one reader leaving must not fail it for the
 * others. Past the deadline a read fails as a read: its band retries in the
 * browser and the render goes out `no-store`.
 */

const SSR_DEADLINE_MS = 5_000
const KEEP_MS = 10 * 60 * 1000

const bigContracts = createServerMemo<readonly RecentRecord[]>(KEEP_MS)

const deadline = () => withDeadline(undefined, SSR_DEADLINE_MS)

export interface ProcurementHomeServerRead {
  /** The year the reads describe, whatever failed: the browser seeds and reads under it. */
  readonly year: number
  readonly national?: NationalRead
  readonly categories?: HomeCategoriesRead
  readonly bigContracts?: readonly RecentRecord[]
}

/** The three reads side by side; a failed one is left out, and the others stand. */
export async function readProcurementHomeForSsr(year: number): Promise<ProcurementHomeServerRead> {
  const key = String(year)
  const [nationalRead, categoriesRead, bigContractsRead] = await Promise.allSettled([
    fetchProcurementHomeNational(year, deadline()),
    fetchProcurementHomeCategories(year, deadline()),
    bigContracts(key, () => fetchProcurementHomeBigContracts(year, HOME_BIG_CONTRACTS, deadline())),
  ])
  return {
    year,
    ...(nationalRead.status === 'fulfilled' ? { national: nationalRead.value } : {}),
    ...(categoriesRead.status === 'fulfilled' ? { categories: categoriesRead.value } : {}),
    ...(bigContractsRead.status === 'fulfilled' ? { bigContracts: bigContractsRead.value } : {}),
  }
}
