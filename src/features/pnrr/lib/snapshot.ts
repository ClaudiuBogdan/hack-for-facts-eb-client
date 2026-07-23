/**
 * Single source of truth for which frozen PNRR S3 snapshot the client serves.
 *
 * The three snapshot files share one `YYYYMMDD-` prefix, and the "last
 * updated" date shown in the UI/SEO/exports MUST be the same date — they used
 * to be two hand-bumped constants that had to move in lockstep. Bump ONLY
 * this prefix when publishing a new snapshot; everything else derives.
 */
export const PNRR_SNAPSHOT_PREFIX = '20260619'

/** ISO form of the snapshot date (shown in UI and used in export filenames). */
export const PNRR_LAST_UPDATED = `${PNRR_SNAPSHOT_PREFIX.slice(0, 4)}-${PNRR_SNAPSHOT_PREFIX.slice(4, 6)}-${PNRR_SNAPSHOT_PREFIX.slice(6, 8)}`
