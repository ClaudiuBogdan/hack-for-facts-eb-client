import { notFound } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { ProcurementRecordDetail } from '@/schemas/procurement'
import { procurementRecordDetailQueryOptions } from '../hooks/use-procurement-data'
import type { DetailGrainKey, DetailRecord } from './detail-config'
import { RECORD_DETAIL_FETCHERS } from './detail-fetchers'

export type ProcurementDetailLoaderData = {
  /** Absent on a client-side navigation — the page's own query supplies it. */
  readonly detail?: ProcurementRecordDetail<DetailRecord>
  readonly id: string
}

type LoaderInput = {
  readonly context: { readonly queryClient: QueryClient }
  readonly params: { readonly id: string }
}

/**
 * The three record-detail routes differ only by grain, so they share one
 * loader.
 *
 * Awaited on the SSR path only, so crawlers still get a full document. In the
 * browser the same await blocked the *previous* page for the whole round-trip
 * — the router commits the URL immediately but keeps the old component mounted
 * until the loader settles, which reads as a dead click (measured at ~1.4s on
 * the sibling institution route before the same split was applied there).
 */
export function createProcurementDetailLoader(grain: DetailGrainKey) {
  return async function loadProcurementDetail({
    context,
    params,
  }: LoaderInput): Promise<ProcurementDetailLoaderData> {
    const options = procurementRecordDetailQueryOptions(grain, params.id)

    if (!shouldBlockLoaderForSsr()) {
      // Starts the request on click without holding the navigation open. A
      // missing record is the page's verdict to render now, not the router's:
      // throwing `notFound()` here would blank the page the user is still on.
      void context.queryClient.prefetchQuery(options)
      return { id: params.id }
    }

    // Fetched directly rather than through the query client, matching the
    // sibling institution/company loaders: the payload travels as loader data
    // and the page seeds it via `initialData`, which keeps the SSR fetch off
    // the client's `retry: 1` default and out of the dehydrated cache.
    const detail = await RECORD_DETAIL_FETCHERS[grain](params.id)
    if (!detail) {
      throw notFound()
    }
    return { detail, id: params.id }
  }
}
