import { createFileRoute, notFound } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { ProcurementProcedureInitialData } from '@/features/procurement/components/procedure/procurement-procedure-page'
import type { ProcedureSheet } from '@/features/procurement/lib/procedure-model'
import { procurementProcedureKeys } from '@/features/procurement/lib/procedure-keys'
import { buildProcedureDocumentTitle } from '@/features/procurement/lib/procurement-page-titles'

/**
 * One procedure: a call for competition and the award notice that closes it.
 * The procedure is read on the server (kept there ten minutes, under a
 * deadline — see `procurement-procedure-ssr.ts`) and seeds the page's query;
 * on a client-side navigation the loader starts the read and returns at
 * once, so the page frame paints and fills in. A notice SEAP does not have is
 * a 404 on the server, and the page's own verdict in the browser.
 */
export const Route = createFileRoute('/procurement/procedures/$id')({
  ssr: true,
  loader: async ({ context, params }): Promise<ProcurementProcedureInitialData> => {
    // A procedure's id is a number: anything else (a pasted notice number, „CAN1145385") is no page, not a read that fails.
    if (!/^\d+$/u.test(params.id)) throw notFound()
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/procurement/hooks/use-procurement-procedure')
      void context.queryClient.prefetchQuery(hooks.procurementProcedureQueryOptions(params.id)).catch(() => undefined)
      return { id: params.id }
    }
    // Read directly, not through the query client: a query created on the
    // server is dehydrated with the server's clock, so a copy served from a
    // shared cache would look stale on mount and read again.
    const { readProcurementProcedureForSsr } = await import('@/features/procurement/api/procurement-procedure-ssr')
    const read = await readProcurementProcedureForSsr(params.id)
    if (read.procedure === null) throw notFound()
    return read
  },
  // A render with a failed or partial read is served once and read again, never cached for everyone.
  headers: ({ loaderData }) =>
    !loaderData?.procedure || loaderData.procedure.partial
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
    const canonical = `${getSiteUrl()}/procurement/procedures/${params.id}`
    // After a client-side navigation the loader returns no procedure: the query cache may hold it.
    const procedure = loaderData?.procedure ?? match.context.queryClient.getQueryData<ProcedureSheet | null>(procurementProcedureKeys.procedure(params.id)) ?? null
    const title = buildProcedureDocumentTitle({ id: params.id, title: procedure?.title, noticeNo: procedure?.noticeNo, authorityName: procedure?.authority.name })
    const what = procedure?.title
    const buyer = procedure?.authority.name
    const description =
      what && buyer
        ? procedure?.kind === 'call'
          ? translator._(msg`${what}: anunțul de participare publicat de ${buyer} în SEAP — ce s-a cerut, cu ce valoare estimată și ce s-a întâmplat cu el.`)
          : procedure?.status !== 'awarded'
            ? translator._(msg`${what}: anunțul de atribuire publicat de ${buyer} în SEAP și ce s-a întâmplat cu procedura.`)
            : translator._(msg`${what}: procedura prin care ${buyer} a atribuit contracte, din SEAP — cui, cu cât, față de cât estimase și când.`)
        : translator._(msg`O procedură de achiziție publică din SEAP: ce s-a cerut, cui s-a atribuit, cu cât și când.`)
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
