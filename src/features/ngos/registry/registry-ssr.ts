import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { fetchRegistryRecords, type RegistrySearch } from './api'
import { tallyOfCounts, tallyToData, type RegistryCounts } from './counts'
import COUNTS from './data/registry-counts.json'
import { filterOf, PAGE_SIZE, queryOf, selectionKey } from './model'
import type { RegistrySeed } from './use-registry-read'

/**
 * The registry page's read on the server, so the HTML carries the figures
 * and the first rows: the selection's first page (100 rows, under a
 * deadline) and, while the API serves the export they were counted on,
 * its tally from the whole registry's counts — which stay on the server;
 * only the selection's own tally travels to the page.
 *
 * Imported by the route's loader on the server only: the counts are part
 * of the server's bundle, never of the page's.
 */

/** How long the server waits for the first page before it renders without it and the browser reads it. */
const DEADLINE_MS = 4000

export interface RegistryServerRead {
  readonly seed: RegistrySeed
  /** The first page was read: a render without it is not cached for everyone. */
  readonly complete: boolean
}

export async function readRegistryForSsr(search: RegistrySearch, signal?: AbortSignal): Promise<RegistryServerRead> {
  const { query } = queryOf(search, NGO_REGISTRY_SUMMARY.counties)
  const key = selectionKey(query)
  const page = await fetchRegistryRecords(filterOf(query), { first: PAGE_SIZE, signal: withDeadline(signal, DEADLINE_MS) }).catch(() => null)
  const counts = COUNTS as unknown as RegistryCounts
  const tally = page && counts.snapshotId === page.snapshot.id ? tallyOfCounts(counts, query) : null
  return { seed: { key, page, tally: tally ? tallyToData(tally, query.county !== null) : null, readAt: Date.now() }, complete: page !== null }
}
