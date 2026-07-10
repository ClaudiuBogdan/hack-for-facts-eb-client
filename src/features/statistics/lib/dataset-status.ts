import type { InsDataset } from '@/schemas/ins'
import type { StatisticsDatasetDataStatus } from '@/schemas/statistics'

/**
 * Resolves the product "has data" vs. "catalog only" distinction for a dataset.
 *
 * The authority is the server's `data_status` field, which is derived from
 * membership in `ins_compat.v_matrices` — the view defined
 * `where fact_load_status in ('partial','full')`, i.e. exactly the datasets
 * whose observations are loaded.
 *
 * `sync_status` cannot answer this question. `ins_compat.matrices` emits
 * `'PENDING'` both for a metadata-only dataset *and* for a fact-loaded dataset
 * whose upstream sync is itself pending, so reading `'PENDING'` as "no data"
 * hides real observations. We keep the inference only as a fallback for
 * payloads that predate the `data_status` field, and it is lossy in exactly
 * that corner.
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

type DatasetStatusSource = Pick<InsDataset, 'sync_status'> & {
  readonly data_status?: InsDataset['data_status']
}

/**
 * Returns `'available'` when the dataset has loaded observations, otherwise
 * `'catalog-only'`.
 *
 * Missing and unrecognized statuses degrade to `catalog-only` so the UI never
 * claims data exists when it doesn't — the safer side of the coverage gap.
 */
export function getDatasetDataStatus(
  dataset: DatasetStatusSource,
): StatisticsDatasetDataStatus {
  if (dataset.data_status) {
    return dataset.data_status === 'AVAILABLE' ? 'available' : 'catalog-only'
  }

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
export function isDatasetAvailable(dataset: DatasetStatusSource): boolean {
  return getDatasetDataStatus(dataset) === 'available'
}
