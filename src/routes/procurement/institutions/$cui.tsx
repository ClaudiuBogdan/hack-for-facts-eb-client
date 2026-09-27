import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { parseProcurementBuyerSearch } from '@/schemas/procurement-buyer'
import type { ProcurementBuyerInitialData } from '@/features/procurement/components/buyer/procurement-buyer-page'
import type { BuyerProfile } from '@/features/procurement/lib/buyer-model'
import { procurementBuyerKeys } from '@/features/procurement/lib/buyer-keys'
import { buildInstitutionDocumentTitle } from '@/features/procurement/lib/procurement-page-titles'

const cuiSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\d{1,12}$/, 'CUI invalid')

/**
 * One buyer's procurement page. The year it describes comes from the URL
 * (`year`, 2019 through the last complete year; else the last complete one)
 * and is fixed here, in the loader, so the server and the browser agree.
 *
 * The profile and the year's largest records are read on the server (kept
 * there ten minutes per buyer and year, under a deadline — see
 * `procurement-buyer-ssr.ts`) and seed the page's queries; on a client-side
 * navigation the loader starts them and returns at once, so the page frame
 * paints and fills in.
 */
export const Route = createFileRoute('/procurement/institutions/$cui')({
  ssr: true,
  params: {
    parse: (params) => {
      const parsed = cuiSchema.safeParse(params.cui)
      if (!parsed.success) throw notFound()
      return { cui: parsed.data }
    },
  },
  validateSearch: parseProcurementBuyerSearch,
  loaderDeps: ({ search }) => ({ year: search.year }),
  loader: async ({ context, params, deps }): Promise<ProcurementBuyerInitialData> => {
    const { homeYear } = await import('@/features/procurement/lib/home-model')
    const { buyerYear } = await import('@/features/procurement/lib/buyer-model')
    const year = buyerYear(deps.year, homeYear())
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/procurement/hooks/use-procurement-buyer')
      void context.queryClient.prefetchQuery(hooks.procurementBuyerQueryOptions(params.cui, year)).catch(() => undefined)
      void context.queryClient.prefetchQuery(hooks.procurementBuyerRecordsQueryOptions(params.cui, year)).catch(() => undefined)
      return { year }
    }
    // Read directly, not through the query client: a query created on the
    // server is dehydrated with the server's clock, so a copy served from a
    // shared cache would look stale on mount and read again.
    const { readProcurementBuyerForSsr } = await import('@/features/procurement/api/procurement-buyer-ssr')
    return readProcurementBuyerForSsr(params.cui, year)
  },
  // A render with a failed or partial read is served once and read again, never
  // cached for everyone. The document follows the locale and theme cookies.
  headers: ({ loaderData }) =>
    !loaderData?.profile || loaderData.profile.partial || !loaderData.records
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
    const canonical = `${getSiteUrl()}/procurement/institutions/${params.cui}`
    const profile = loaderData?.profile
    // After a year is picked in the browser the loader returns only the year: any year's profile of the buyer names it.
    const cached = profile
      ? null
      : match.context.queryClient
          .getQueriesData<BuyerProfile>({ queryKey: procurementBuyerKeys.profiles(params.cui) })
          .find(([, data]) => data !== undefined)?.[1]
    const found = profile?.identity.name ?? cached?.identity.name ?? null
    const name = found && found !== params.cui ? found : null
    // A CUI with no record since 2019 (a supplier's, a mistyped one) is not a page for a search engine.
    const noRecords = profile ? ![...profile.directYears, ...profile.awardYears].some((point) => (point.count ?? 0) > 0) && !profile.frameworks : false
    // The SSR loader resolved the buyer's name — a CUI-only title is a useless
    // search result. A client-side navigation corrects it once the read lands.
    const title = buildInstitutionDocumentTitle({ cui: params.cui, authorityName: name })
    const description = name
      ? translator._(msg`Achizițiile publice ale instituției ${name}: ce cumpără, de la ce firme și din ce județe, când și cum, din SEAP.`)
      : translator._(msg`Achizițiile publice ale unei instituții: ce cumpără, de la ce firme și din ce județe, când și cum, din SEAP.`)
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
