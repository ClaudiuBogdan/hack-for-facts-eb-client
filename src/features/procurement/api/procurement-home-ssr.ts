import { withDeadline } from '@/lib/ssr/deadline-signal'
import type { NationalRead } from '../lib/home-model'
import {
  fetchProcurementHomeCategories,
  fetchProcurementHomeNational,
  type HomeCategoriesRead,
} from './procurement-home-api'

/**
 * The front door's server reads, for the route loader only.
 *
 * TanStack Start sends no HTML until every loader resolves, and the two
 * reads take 0.5–1 s against the API. The national figures and the
 * categories carry direct purchases, so they are read on every render: D6 (root, 19 November 2026): direct-purchase reads are never kept in the server process. The API is the one enforcer, and the only windows are the CDN's ten minutes and the open-tab bound (design §24.4).
 * The year's largest contracts are not read: the legacy list is retired, and
 * the national contract-award list comes after the launch (owner, 26 and 28
 * November 2026), so the band says it is coming. Each read has its own
 * deadline, not the request's signal. Past the deadline a read fails as a
 * read: its band retries in the browser and the render goes out `no-store`.
 */

const SSR_DEADLINE_MS = 5_000

const deadline = () => withDeadline(undefined, SSR_DEADLINE_MS)

export interface ProcurementHomeServerRead {
  /** The year the reads describe, whatever failed: the browser seeds and reads under it. */
  readonly year: number
  readonly national?: NationalRead
  readonly categories?: HomeCategoriesRead
}

/** The two reads side by side; a failed one is left out, and the others stand. */
export async function readProcurementHomeForSsr(year: number): Promise<ProcurementHomeServerRead> {
  const [nationalRead, categoriesRead] = await Promise.allSettled([fetchProcurementHomeNational(year, deadline()), fetchProcurementHomeCategories(year, deadline())])
  return {
    year,
    ...(nationalRead.status === 'fulfilled' ? { national: nationalRead.value } : {}),
    ...(categoriesRead.status === 'fulfilled' ? { categories: categoriesRead.value } : {}),
  }
}
