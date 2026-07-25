/** Single source of truth for which frozen PNRR S3 file set the client serves. */
export const PNRR_SNAPSHOT_PREFIX = '20260619'

/**
 * Publication/file identifier, not a source observation date or freshness
 * claim. A verified date can only be exposed once the release manifest binds
 * this file set to its source capture.
 */
export const PNRR_FILESET_ID = PNRR_SNAPSHOT_PREFIX

export const PNRR_MIPE_SOURCE_URL = 'https://mfe.gov.ro/pnrr-dashboard'
