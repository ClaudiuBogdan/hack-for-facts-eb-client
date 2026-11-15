import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  createNoStoreHeaders,
  createPublicPageCacheHeaders,
} from '@/lib/http-cache'
import { parsePnrrSearch, type PnrrSearchState } from '@/schemas/pnrr'
import { DEFAULT_LOCALE, normalizeLocale, translatorFor } from '@/lib/i18n'
import type { PnrrLiveRouteLoaderData } from '@/features/pnrr/lib/pnrr-live-route-loader'
import { normalizePnrrCui } from '@/features/pnrr/lib/pnrr-route-validation'
import { buildPnrrLiveRouteHead } from '@/features/pnrr/seo/pnrr-live-seo'

export type PnrrRouteLoaderData = PnrrLiveRouteLoaderData

/**
 * The live projects filters an old dashboard link can carry over. Only the
 * beneficiary CUI is the same identifier on both sides; legacy counties are
 * names, and component and measure values are not defined by the API
 * contract, so those are dropped rather than guessed.
 */
export function mapLegacyPnrrProjectsSearch(
  search: Partial<PnrrSearchState>,
): { readonly beneficiaryCui?: string } {
  const beneficiaryCui = search.beneficiaryCui
    ? normalizePnrrCui(search.beneficiaryCui)
    : null
  return beneficiaryCui ? { beneficiaryCui } : {}
}

/**
 * The PNRR dashboard reads the active API release (overview and metadata) for
 * both the server render and the browser. The legacy search schema is kept
 * so old links still parse; legacy tabs that now have their own live page are
 * redirected there, and the remaining legacy views land on the overview.
 */
export const Route = createFileRoute('/pnrr')({
  ssr: true,
  validateSearch: parsePnrrSearch,
  beforeLoad: ({ search }) => {
    const legacySearch = search as Partial<PnrrSearchState>
    if (legacySearch.view === 'projects') {
      throw redirect({
        to: '/pnrr/proiecte',
        search: mapLegacyPnrrProjectsSearch(legacySearch),
        replace: true,
      })
    }
    if (legacySearch.view === 'map') {
      throw redirect({ to: '/pnrr/judete', replace: true })
    }
  },
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
  loader: async ({ context }): Promise<PnrrRouteLoaderData> => {
    const { loadPnrrLiveOverviewRoute } = await import(
      '@/features/pnrr/lib/pnrr-live-route-loader'
    )
    return loadPnrrLiveOverviewRoute({ queryClient: context.queryClient })
  },
})
