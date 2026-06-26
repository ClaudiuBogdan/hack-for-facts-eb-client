import type { InsDataset } from '@/schemas/ins'
import type { StatisticsDatasetDataStatus } from '@/schemas/statistics'

/**
 * Maps an INS dataset's `sync_status` / fact-load status to the product
 * "available" vs. "catalog only" distinction.
 *
 * Grounded in `docs/ux-research/statistics.md`:
 * - `v_matrices` exposes only datasets with `fact_load_status in
 *   ('partial','full')` → "available".
 * - `matrices` exposes all 1,898; metadata-only rows appear as `PENDING` →
 *   "catalog only".
 *
 * The serving `InsDataset.sync_status` carries the same vocabulary
 * (`full`, `partial`, `metadata_only`, `PENDING`, or null).
 */
const AVAILABLE_SYNC_STATUSES = new Set([
  'full',
  'partial',
  'loaded',
  'LOADED',
])

const CATALOG_ONLY_SYNC_STATUSES = new Set([
  'metadata_only',
  'PENDING',
  'pending',
  'METADATA_ONLY',
])

function normalizeSyncStatus(status: string | null | undefined): string {
  return (status ?? '').trim()
}

/**
 * Returns `'available'` when the dataset has loaded facts
 * (sync_status full/partial/loaded-style), otherwise `'catalog-only'`
 * (metadata_only / PENDING / null / unknown).
 *
 * Unknown statuses degrade to `catalog-only` so the UI never claims data
 * exists when it doesn't — the safer side of the 27-vs-1,871 coverage gap.
 */
export function getDatasetDataStatus(
  dataset: Pick<InsDataset, 'sync_status'>,
): StatisticsDatasetDataStatus {
  const status = normalizeSyncStatus(dataset.sync_status)

  if (status.length === 0) {
    return 'catalog-only'
  }

  if (AVAILABLE_SYNC_STATUSES.has(status)) {
    return 'available'
  }

  if (CATALOG_ONLY_SYNC_STATUSES.has(status)) {
    return 'catalog-only'
  }

  const lowered = status.toLowerCase()
  if (
    lowered === 'full' ||
    lowered === 'partial' ||
    lowered === 'loaded'
  ) {
    return 'available'
  }

  return 'catalog-only'
}

/** True when the dataset is considered to have loaded observations. */
export function isDatasetAvailable(
  dataset: Pick<InsDataset, 'sync_status'>,
): boolean {
  return getDatasetDataStatus(dataset) === 'available'
}
