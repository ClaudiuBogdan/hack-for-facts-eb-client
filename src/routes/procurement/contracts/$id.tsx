import { createFileRoute, notFound } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { ProcurementContractInitialData } from '@/features/procurement/components/contract/procurement-contract-page'
import type { ContractSheet } from '@/features/procurement/lib/contract-model'
import { procurementContractKeys } from '@/features/procurement/lib/contract-keys'
import { buildContractDocumentTitle } from '@/features/procurement/lib/procurement-page-titles'

/**
 * One contract award. The contract and its context are read on the server
 * (kept there ten minutes, under a deadline — see `procurement-contract-ssr.ts`)
 * and seed the page's queries; on a client-side navigation the loader starts
 * the contract's read and returns at once, so the page frame paints and fills
 * in. A record SEAP does not have is a 404 on the server, and the page's own
 * verdict in the browser.
 */
export const Route = createFileRoute('/procurement/contracts/$id')({
  ssr: true,
  loader: async ({ context, params }): Promise<ProcurementContractInitialData> => {
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/procurement/hooks/use-procurement-contract')
      void context.queryClient.prefetchQuery(hooks.procurementContractQueryOptions(params.id)).catch(() => undefined)
      return { id: params.id }
    }
    // Read directly, not through the query client: a query created on the
    // server is dehydrated with the server's clock, so a copy served from a
    // shared cache would look stale on mount and read again.
    const { readProcurementContractForSsr } = await import('@/features/procurement/api/procurement-contract-ssr')
    const read = await readProcurementContractForSsr(params.id)
    if (read.contract === null) throw notFound()
    return read
  },
  // A render with a failed or partial read is served once and read again, never cached for everyone; a contract with no context to read (`null`) is whole without one.
  headers: ({ loaderData }) =>
    !loaderData?.contract || loaderData.contract.partial || loaderData.context === undefined || loaderData.context?.partial
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
    const canonical = `${getSiteUrl()}/procurement/contracts/${params.id}`
    // After a client-side navigation the loader returns no contract: the query cache may hold it.
    const contract = loaderData?.contract ?? match.context.queryClient.getQueryData<ContractSheet | null>(procurementContractKeys.contract(params.id)) ?? null
    const title = buildContractDocumentTitle({ id: params.id, title: contract?.title, authorityName: contract?.authority.name })
    const what = contract?.title
    const buyer = contract?.authority.name
    const seller = contract?.supplier.name
    const description =
      what && buyer && seller
        ? contract?.kind === 'framework'
          ? translator._(msg`${what}: acordul-cadru încheiat de ${buyer} cu ${seller}, din SEAP — cât se poate cheltui prin el, cu cine și cum s-a atribuit.`)
          : translator._(msg`${what}: contractul atribuit de ${buyer} firmei ${seller}, din SEAP — ce s-a atribuit, cu cât, cum și ce s-a schimbat după.`)
        : translator._(msg`Un contract de achiziție publică din SEAP: ce s-a atribuit, cui, cu cât și ce s-a schimbat după.`)
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
