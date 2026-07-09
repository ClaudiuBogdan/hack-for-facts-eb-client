import type { InsDataset } from '@/schemas/ins'
import type { StatisticsDatasetDataStatus } from '@/schemas/statistics'

/**
 * Maps an INS dataset's `sync_status` to the product "available" vs.
 * "catalog only" distinction.
 *
 * The serving layer exposes two relations over the same datasets:
 * - `v_matrices` (list queries) — only `fact_load_status in ('partial','full')`,
 *   emitting `coalesce(source_sync_status, 'SYNCED')`.
 * - `matrices` (single-dataset lookup) — all 1,898 datasets, emitting
 *   `'PENDING'` for the metadata-only ones and the same coalesce otherwise.
 *
 * So a dataset is catalog-only exactly when its status is `PENDING` (or the
 * legacy `metadata_only` spelling). Every other `InsSyncStatus` member —
 * `SYNCED`, `SYNCING`, `STALE`, `FAILED` — describes the *sync pipeline* of a
 * dataset whose facts are already loaded, and must not be read as "no data".
 */
const CATALOG_ONLY_SYNC_STATUSES = new Set(['pending', 'metadata_only'])

const AVAILABLE_SYNC_STATUSES = new Set([
  'synced',
  'syncing',
  'stale',
  'failed',
  'full',
  'partial',
  'loaded',
])

/**
 * Returns `'available'` when the dataset has loaded observations, otherwise
 * `'catalog-only'`.
 *
 * Missing and unrecognized statuses degrade to `catalog-only` so the UI never
 * claims data exists when it doesn't — the safer side of the coverage gap.
 */
export function getDatasetDataStatus(
  dataset: Pick<InsDataset, 'sync_status'>,
): StatisticsDatasetDataStatus {
  const status = (dataset.sync_status ?? '').trim().toLowerCase()

  if (CATALOG_ONLY_SYNC_STATUSES.has(status)) {
    return 'catalog-only'
  }

  if (AVAILABLE_SYNC_STATUSES.has(status)) {
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
