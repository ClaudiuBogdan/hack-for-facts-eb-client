import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { parseProcurementSupplierSearch } from '@/schemas/procurement-supplier'
import type { ProcurementSupplierInitialData } from '@/features/procurement/components/supplier/procurement-supplier-page'
import { buildSupplierDocumentTitle } from '@/features/procurement/lib/procurement-page-titles'
import { procurementSupplierKeys } from '@/features/procurement/lib/supplier-keys'
import type { SupplierProfile } from '@/features/procurement/lib/supplier-model'

const cuiSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\d{1,12}$/, 'CUI invalid')

/**
 * One firm's procurement page. The year it describes comes from the URL
 * (`year`, 2019 through the year in progress; else the last complete one)
 * and is fixed here, in the loader, so the server and the browser agree.
 *
 * The profile and the year's largest direct purchases are read on the server
 * (kept there ten minutes per firm and year, under a deadline — see
 * `procurement-supplier-ssr.ts`) and seed the page's queries; on a client-side
 * navigation the loader starts them and returns at once, so the page frame
 * paints and fills in.
 */
export const Route = createFileRoute('/procurement/suppliers/$cui')({
  ssr: true,
  params: {
    parse: (params) => {
      const parsed = cuiSchema.safeParse(params.cui)
      if (!parsed.success) throw notFound()
      return { cui: parsed.data }
    },
  },
  validateSearch: parseProcurementSupplierSearch,
  loaderDeps: ({ search }) => ({ year: search.year }),
  loader: async ({ context, params, deps }): Promise<ProcurementSupplierInitialData> => {
    const { homeYear } = await import('@/features/procurement/lib/home-model')
    const { supplierYear } = await import('@/features/procurement/lib/supplier-model')
    const year = supplierYear(deps.year, homeYear())
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/procurement/hooks/use-procurement-supplier')
      void context.queryClient.prefetchQuery(hooks.procurementSupplierQueryOptions(params.cui, year)).catch(() => undefined)
      void context.queryClient.prefetchQuery(hooks.procurementSupplierDirectQueryOptions(params.cui, year)).catch(() => undefined)
      return { year }
    }
    // Read directly, not through the query client: a query created on the
    // server is dehydrated with the server's clock, so a copy served from a
    // shared cache would look stale on mount and read again.
    const { readProcurementSupplierForSsr } = await import('@/features/procurement/api/procurement-supplier-ssr')
    const read = await readProcurementSupplierForSsr(params.cui, year)
    // An identifier the API refuses as an organisation's (a foreign or malformed key in a ranking) has no page.
    if (read.notFound) throw notFound()
    return read
  },
  // A render with a failed or partial read is served once and read again, never
  // cached for everyone. The document follows the locale and theme cookies.
  headers: ({ loaderData }) =>
    !loaderData?.profile || loaderData.profile.partial || !loaderData.direct
      ? // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
        { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
          vary: ['Accept-Encoding', 'Cookie'],
        }),
  // In the request's own language: the shared Lingui instance may hold another
  // request's by the time a head that waited on its loader runs.
  head: ({ params, loaderData, match }) => {
    const translator = translatorFor(match.context.locale)
    const canonical = `${getSiteUrl()}/procurement/suppliers/${params.cui}`
    const profile = loaderData?.profile
    // After a year is picked in the browser the loader returns only the year: any year's profile of the firm names it.
    const cached = profile
      ? null
      : match.context.queryClient
          .getQueriesData<SupplierProfile>({ queryKey: procurementSupplierKeys.profiles(params.cui) })
          .find(([, data]) => data !== undefined)?.[1]
    const found = profile?.name ?? cached?.name ?? null
    const name = found && found !== params.cui ? found : null
    // A CUI with no sale since 2019 (a buyer's, a mistyped one) is not a page for a search engine.
    const noRecords = profile ? ![...profile.directYears, ...profile.contractYears].some((point) => (point.count ?? 0) > 0) : false
    const title = buildSupplierDocumentTitle({ cui: params.cui, supplierName: name })
    const description = name
      ? translator._(msg`${name} ca furnizor al statului: ce instituții cumpără de la firmă, ce vinde, unde, cum câștigă și cu cine, din SEAP.`)
      : translator._(msg`O firmă ca furnizor al statului: ce instituții cumpără de la ea, ce vinde, unde, cum câștigă și cu cine, din SEAP.`)
    return {
      meta: [
        { title },
        ...(noRecords ? [{ name: 'robots', content: 'noindex' }] : []),
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
