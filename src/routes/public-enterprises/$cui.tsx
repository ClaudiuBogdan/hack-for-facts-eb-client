import { createFileRoute, notFound } from '@tanstack/react-router'
import type { PublicEnterpriseServerRead } from '@/features/public-enterprises/api/public-enterprise-ssr'
import { PublicEnterprisePending } from '@/features/public-enterprises/components/enterprise/enterprise-pending'
import { PublicEnterpriseRouteNotFound } from '@/features/public-enterprises/components/enterprise/enterprise-states'
import { buildPublicEnterpriseHead, neutralEnterpriseTitle, type PublicEnterpriseSeo } from '@/features/public-enterprises/lib/enterprise-head'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { parsePublicEnterpriseCuiParam } from '@/features/public-enterprises/lib/enterprise-cui'

export type PublicEnterpriseRouteLoaderData = PublicEnterpriseServerRead & {
  readonly cui: string
  /** Every read answered in full: the render may be cached for everyone. */
  readonly complete: boolean
  /** What the head says, worked out on the server; absent after a client navigation. */
  readonly seo?: PublicEnterpriseSeo
}

/**
 * One public enterprise's page. On the server the loader reads the
 * enterprise, its company record and its last twelve months as a buyer side
 * by side (`public-enterprise-ssr.ts`, each kept ten minutes, each under a
 * deadline) and seeds the page's queries with them, so the document is whole
 * and the browser reads nothing on mount. A CUI no list holds is a 404. On a
 * client navigation the loader starts the reads and returns at once; the
 * page's own queries fill it in and set the tab's title.
 */
export const Route = createFileRoute('/public-enterprises/$cui')({
  ssr: true,
  params: {
    parse: (params) => {
      const cui = parsePublicEnterpriseCuiParam(params.cui)
      if (!cui) throw notFound()
      return { cui }
    },
  },
  pendingComponent: PublicEnterprisePending,
  // Here, not in the lazy file: a path the params reject fails before that file loads.
  notFoundComponent: PublicEnterpriseRouteNotFound,
  loader: async ({ context, params }): Promise<PublicEnterpriseRouteLoaderData> => {
    if (!shouldBlockLoaderForSsr()) {
      // Imported here, not at the top: this file is in every route's entry chunk, and the reads belong to the page's.
      const hooks = await import('@/features/public-enterprises/hooks/use-public-enterprise')
      void context.queryClient.prefetchQuery(hooks.publicEnterpriseQueryOptions(params.cui)).catch(() => undefined)
      void context.queryClient.prefetchQuery(hooks.enterpriseCompanyQueryOptions(params.cui)).catch(() => undefined)
      void context.queryClient.prefetchQuery(hooks.enterpriseBuyerQueryOptions(params.cui)).catch(() => undefined)
      return { cui: params.cui, complete: false }
    }
    // Read directly, not through the query client: a query created on the
    // server is dehydrated with the server's clock, so a copy served from a
    // shared cache would look stale on mount and read again.
    const { readPublicEnterpriseForSsr, isCompleteServerRead } = await import('@/features/public-enterprises/api/public-enterprise-ssr')
    const read = await readPublicEnterpriseForSsr(params.cui)
    if (read.enterprise && !read.enterprise.profile) throw notFound()
    const { publicEnterpriseSeo } = await import('@/features/public-enterprises/lib/enterprise-seo')
    return {
      cui: params.cui,
      complete: isCompleteServerRead(read),
      ...read,
      ...(read.enterprise ? { seo: publicEnterpriseSeo(read.enterprise, read.company) } : {}),
    }
  },
  // A render with a failed or partial read is served once and read again,
  // never cached for everyone. The document follows the locale and theme cookies.
  headers: ({ loaderData }) =>
    loaderData?.complete
      ? createPublicPageCacheHeaders({ sharedMaxAgeSeconds: 600, staleWhileRevalidateSeconds: 3600, vary: ['Accept-Encoding', 'Cookie'] })
      : // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
        { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' },
  // Without the enterprise read (a client navigation, or a server read that failed and goes out `no-store`), a neutral title
  // and no index: a crawler must not keep a page drawn from nothing.
  head: ({ params, loaderData, match }) => {
    if (loaderData?.seo) return buildPublicEnterpriseHead(loaderData.seo, match.context.locale)
    const cui = parsePublicEnterpriseCuiParam(params.cui)
    return { meta: [{ title: cui ? neutralEnterpriseTitle(cui) : 'Transparenta.eu' }, { name: 'robots', content: 'noindex' }] }
  },
})
