import { createFileRoute, notFound } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { ProcurementDirectPurchaseInitialData } from '@/features/procurement/components/direct-purchase/procurement-direct-purchase-page'
import type { DirectPurchase } from '@/features/procurement/lib/direct-purchase-model'
import { procurementDirectPurchaseKeys } from '@/features/procurement/lib/direct-purchase-keys'
import { buildDirectPurchaseDocumentTitle } from '@/features/procurement/lib/procurement-page-titles'

/**
 * One direct purchase. The purchase and its context are read on the server
 * (kept there ten minutes, under a deadline — see
 * `procurement-direct-purchase-ssr.ts`) and seed the page's queries; on a
 * client-side navigation the loader starts the purchase's read and returns at
 * once, so the page frame paints and fills in. A record SEAP does not have is
 * a 404 on the server, and the page's own verdict in the browser.
 */
export const Route = createFileRoute('/procurement/direct-acquisitions/$id')({
  ssr: true,
  loader: async ({ context, params }): Promise<ProcurementDirectPurchaseInitialData> => {
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/procurement/hooks/use-procurement-direct-purchase')
      void context.queryClient.prefetchQuery(hooks.procurementDirectPurchaseQueryOptions(params.id)).catch(() => undefined)
      return { id: params.id }
    }
    // Read directly, not through the query client: a query created on the
    // server is dehydrated with the server's clock, so a copy served from a
    // shared cache would look stale on mount and read again.
    const { readProcurementDirectPurchaseForSsr } = await import('@/features/procurement/api/procurement-direct-purchase-ssr')
    const read = await readProcurementDirectPurchaseForSsr(params.id)
    if (read.purchase === null) throw notFound()
    return read
  },
  // A render with a failed or partial read is served once and read again, never cached for everyone; a purchase with no context to read (`null`) is whole without one.
  headers: ({ loaderData }) =>
    !loaderData?.purchase || loaderData.purchase.partial || loaderData.context === undefined || loaderData.context?.partial
      ? // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
        { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
          vary: ['Accept-Encoding', 'Cookie'],
        }),
  // In the request's own language: the shared Lingui instance may hold another request's by the time a head that waited on its loader runs.
  head: ({ params, loaderData, match }) => {
    const translator = translatorFor(match.context.locale)
    const canonical = `${getSiteUrl()}/procurement/direct-acquisitions/${params.id}`
    // After a client-side navigation the loader returns no purchase: the query cache may hold it.
    const purchase = loaderData?.purchase ?? match.context.queryClient.getQueryData<DirectPurchase | null>(procurementDirectPurchaseKeys.purchase(params.id)) ?? null
    const title = buildDirectPurchaseDocumentTitle({ id: params.id, title: purchase?.title, authorityName: purchase?.authority.name })
    const what = purchase?.title
    const buyer = purchase?.authority.name
    const seller = purchase?.supplier.name
    const description =
      what && buyer && seller
        ? translator._(msg`${what}: achiziția directă a instituției ${buyer} de la ${seller}, din SEAP — ce s-a cumpărat, cu cât și cum s-a făcut.`)
        : translator._(msg`O achiziție directă din SEAP: ce s-a cumpărat, de la cine, cu cât și cum s-a făcut.`)
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonical },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [{ rel: 'canonical', href: canonical }],
    }
  },
})
