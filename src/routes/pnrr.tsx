import { createFileRoute } from '@tanstack/react-router'
import { i18n } from '@lingui/core'
import {
  createNoStoreHeaders,
  createPublicPageCacheHeaders,
} from '@/lib/http-cache'
import { parsePnrrSearch, type PnrrSearchState } from '@/schemas/pnrr'
import {
  buildPnrrRouteHead,
  buildPnrrSeoSnapshotSearchKey,
  normalizePnrrSeoSnapshotSearch,
} from '@/features/pnrr/seo/pnrr-seo'
import {
  loadPnrrSeoData,
  type PnrrSeoLoaderData,
} from '@/features/pnrr/seo/pnrr-seo-loader'
import { DEFAULT_LOCALE, normalizeLocale } from '@/lib/i18n'

export type PnrrRouteLoaderData = PnrrSeoLoaderData

export const Route = createFileRoute('/pnrr')({
  ssr: true,
  validateSearch: parsePnrrSearch,
  headers: ({ loaderData }) => {
    const data = loaderData as PnrrRouteLoaderData | undefined

    if (!data?.seoSnapshot) {
      return createNoStoreHeaders()
    }

    return createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
      vary: ['Accept-Encoding', 'Cookie'],
    })
  },
  loaderDeps: ({ search }) => {
    const seoSnapshotSearch = normalizePnrrSeoSnapshotSearch(
      search as Partial<PnrrSearchState>,
    )

    return {
      seoSnapshotSearch,
      seoSnapshotSearchKey: buildPnrrSeoSnapshotSearchKey(seoSnapshotSearch),
    }
  },
  head: ({ match }) => {
    const loaderData = match.loaderData as PnrrRouteLoaderData | undefined

    return buildPnrrRouteHead({
      snapshot: loaderData?.seoSnapshot,
      search: match.search as Partial<PnrrSearchState> | undefined,
      siteUrl: loaderData?.requestSiteUrl,
      locale: normalizeLocale(i18n.locale) ?? DEFAULT_LOCALE,
    })
  },
  loader: async ({ deps }) => {
    const loaderDeps = deps as {
      readonly seoSnapshotSearch: Partial<PnrrSearchState>
      readonly seoSnapshotSearchKey: string
    }

    return loadPnrrSeoData({
      search: loaderDeps.seoSnapshotSearch,
      searchKey: loaderDeps.seoSnapshotSearchKey,
    })
  },
})
