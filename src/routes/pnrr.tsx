import { createFileRoute } from '@tanstack/react-router'
import {
  createNoStoreHeaders,
  createPublicPageCacheHeaders,
} from '@/lib/http-cache'
import { parsePnrrSearch, type PnrrSearchState } from '@/schemas/pnrr'
import { DEFAULT_LOCALE, normalizeLocale, translatorFor } from '@/lib/i18n'
import type { PnrrDashboardRouteLoaderData } from '@/features/pnrr/lib/pnrr-dashboard-route-loader'
import { normalizePnrrSeoSnapshotSearch } from '@/features/pnrr/seo/pnrr-seo'
import { buildPnrrLiveRouteHead } from '@/features/pnrr/seo/pnrr-live-seo'

export type PnrrRouteLoaderData = PnrrDashboardRouteLoaderData

type PnrrRouteLoaderDeps = {
  readonly overviewSearch: Partial<PnrrSearchState>
  readonly includeOverview: boolean
}

/**
 * The PNRR dashboard. Its tabs, filters, panels and pages live in this route's
 * search params, as before; every figure comes from the active API release,
 * built on the web server (see `PnrrDashboard`).
 */
export const Route = createFileRoute('/pnrr')({
  ssr: true,
  validateSearch: parsePnrrSearch,
  headers: ({ loaderData }) => {
    const data = loaderData as PnrrRouteLoaderData | undefined

    if (!data?.seeded) {
      return createNoStoreHeaders()
    }

    // Short shared caching: the browser re-reads the active release on entry.
    return createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 60,
      staleWhileRevalidateSeconds: 300,
      vary: ['Accept-Encoding', 'Cookie'],
    })
  },
  // Only what the overview depends on: changing a page, sort or panel does not
  // rerun the loader.
  loaderDeps: ({ search }): PnrrRouteLoaderDeps => {
    const pageSearch = search as Partial<PnrrSearchState>
    return {
      overviewSearch: normalizePnrrSeoSnapshotSearch(pageSearch),
      includeOverview:
        pageSearch.view === undefined || pageSearch.view === 'overview',
    }
  },
  // In the request's own language, from the PNRR catalog.
  head: ({ match }) => {
    const loaderData = match.loaderData as PnrrRouteLoaderData | undefined
    const locale = normalizeLocale(match.context.locale) ?? DEFAULT_LOCALE

    return buildPnrrLiveRouteHead({
      facts: loaderData?.head ?? null,
      locale,
      translator: translatorFor(locale, '/pnrr'),
    })
  },
  loader: async ({ context, deps }): Promise<PnrrRouteLoaderData> => {
    const { overviewSearch, includeOverview } = deps as PnrrRouteLoaderDeps
    const { loadPnrrDashboardRoute } = await import(
      '@/features/pnrr/lib/pnrr-dashboard-route-loader'
    )
    return loadPnrrDashboardRoute({
      queryClient: context.queryClient,
      search: overviewSearch,
      includeOverview,
    })
  },
})
