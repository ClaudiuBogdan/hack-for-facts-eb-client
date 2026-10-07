import { createFileRoute, notFound } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { parseJusticeCourtSearch } from '@/schemas/judicial'
import type { JusticeCourtServerRead } from '@/features/justice/api/justice-ssr'
import { JUSTICE_FIRST_WHOLE_YEAR, JUSTICE_LAST_CAPTURE_YEAR, JUSTICE_REFERENCE_YEAR } from '@/features/justice/lib/hub-years'
import { courtName } from '@/features/justice/lib/judicial-labels'
import { justiceKeys } from '@/features/justice/lib/justice-keys'
import { buildCourtDocumentTitle } from '@/features/justice/lib/justice-page-titles'
import { courtPath, isCourtCode } from '@/features/justice/lib/justice-paths'
import type { CourtSheet } from '@/features/justice/lib/court-model'

/**
 * One court: its caseload over the years and in one year (`?an=`, unset: the
 * last year the portal's capture covers whole, the front door's year), the
 * year's matters and stages, the courts under it and its newest cases.
 *
 * The sheet is read on the server (kept there ten minutes, under a deadline —
 * `justice-ssr.ts`) and seeds the page's query; on a client-side navigation
 * the loader starts the read and returns at once. A code that cannot be a
 * court, or one the API does not know, is a 404.
 */
export const Route = createFileRoute('/justice/courts/$code')({
  ssr: true,
  params: {
    parse: (params) => {
      if (!isCourtCode(params.code)) throw notFound()
      return { code: params.code }
    },
  },
  validateSearch: parseJusticeCourtSearch,
  // A year the capture does not hold whole is no page of its own: it describes the default year.
  loaderDeps: ({ search }) => ({
    year: search.an !== undefined && search.an >= JUSTICE_FIRST_WHOLE_YEAR && search.an <= JUSTICE_LAST_CAPTURE_YEAR ? search.an : JUSTICE_REFERENCE_YEAR,
  }),
  loader: async ({ context, params, deps }): Promise<JusticeCourtServerRead> => {
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/justice/hooks/use-justice-court')
      void context.queryClient.prefetchQuery(hooks.justiceCourtQueryOptions(params.code, deps.year)).catch(() => undefined)
      return { code: params.code, year: deps.year }
    }
    // Read directly, not through the query client: a query created on the server
    // is dehydrated with the server's clock and would read again on mount.
    const { readCourtForSsr } = await import('@/features/justice/api/justice-ssr')
    const read = await readCourtForSsr(params.code, deps.year)
    if (read.court === null) throw notFound()
    return read
  },
  // A render with a failed or partial read is served once and read again, never cached for everyone.
  headers: ({ loaderData }) =>
    !loaderData?.court || loaderData.court.partial
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
    const canonical = `${getSiteUrl()}${courtPath(params.code)}`
    const year = loaderData?.year ?? JUSTICE_REFERENCE_YEAR
    const court = loaderData?.court ?? match.context.queryClient.getQueryData<CourtSheet | null>(justiceKeys.court(params.code, year)) ?? null
    const title = buildCourtDocumentTitle(params.code)
    const name = courtName(params.code)
    const description =
      court && court.children.length > 0
        ? translator._(msg`${name}: dosarele de pe portalul instanțelor, pe ani, materii și etape, și instanțele de sub ea. Persoanele nu sunt numite.`)
        : translator._(msg`${name}: dosarele de pe portalul instanțelor, pe ani, materii și etape. Persoanele nu sunt numite.`)
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
