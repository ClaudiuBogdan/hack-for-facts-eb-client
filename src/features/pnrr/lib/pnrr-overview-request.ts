import type { PnrrSearchState } from '@/schemas/pnrr'
import {
  buildPnrrSeoSnapshotSearchKey,
  normalizePnrrSeoSnapshotSearch,
  type PnrrSeoSnapshotSearch,
} from '../seo/pnrr-seo'
import { PNRR_FILESET_ID } from './snapshot'

/*
 * The request contract of `/api/pnrr/overview`, shared by the client hooks and
 * the server handler. The overview depends only on the data filters, which are
 * the SEO snapshot's search keys, so the two share one normalised key. The map
 * preview also depends on the UAT the reader opened in it.
 */

export const PNRR_OVERVIEW_API_PATH = '/api/pnrr/overview'

export type PnrrOverviewPart = 'summary' | 'map-preview'

export type PnrrOverviewMapSelection = {
  readonly panel?: 'map-uat'
  readonly panelUatSiruta?: string
}

export function pnrrOverviewQueryKey(searchKey: string) {
  return ['pnrr-overview', PNRR_FILESET_ID, searchKey] as const
}

export function pnrrOverviewMapPreviewQueryKey(mapSearchKey: string) {
  return ['pnrr-overview-map-preview', PNRR_FILESET_ID, mapSearchKey] as const
}

export function buildPnrrOverviewSearchKey(
  search: Partial<PnrrSearchState> = {},
): string {
  return buildPnrrSeoSnapshotSearchKey(search)
}

export function pickPnrrOverviewMapSelection(
  search: Partial<PnrrSearchState> = {},
): PnrrOverviewMapSelection {
  const siruta = search.panelUatSiruta?.trim()
  if (search.panel === 'map-uat' && siruta) {
    return { panel: 'map-uat', panelUatSiruta: siruta }
  }
  return {}
}

export function buildPnrrOverviewMapSearchKey(
  search: Partial<PnrrSearchState> = {},
): string {
  return JSON.stringify([
    buildPnrrOverviewSearchKey(search),
    pickPnrrOverviewMapSelection(search).panelUatSiruta ?? null,
  ])
}

function appendSearchEntries(
  query: URLSearchParams,
  search: PnrrSeoSnapshotSearch | PnrrOverviewMapSelection,
): void {
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      query.set(key, JSON.stringify(value))
      continue
    }
    query.set(key, String(value))
  }
}

/**
 * The overview URL for a page search: the normalised filters in the page's own
 * search-param format (arrays as JSON), versioned with the file set.
 */
export function buildPnrrOverviewRequestPath(
  search: Partial<PnrrSearchState> = {},
  part: PnrrOverviewPart = 'summary',
): string {
  const query = new URLSearchParams()
  query.set('v', PNRR_FILESET_ID)
  if (part === 'map-preview') query.set('part', part)
  appendSearchEntries(query, normalizePnrrSeoSnapshotSearch(search))
  if (part === 'map-preview') {
    appendSearchEntries(query, pickPnrrOverviewMapSelection(search))
  }
  return `${PNRR_OVERVIEW_API_PATH}?${query.toString()}`
}
