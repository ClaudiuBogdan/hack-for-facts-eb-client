import { createFileRoute, notFound } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { JusticeCaseServerRead } from '@/features/justice/api/justice-ssr'
import type { CaseSheet } from '@/features/justice/lib/case-model'
import { courtName } from '@/features/justice/lib/judicial-labels'
import { justiceKeys } from '@/features/justice/lib/justice-keys'
import { buildCaseDocumentTitle } from '@/features/justice/lib/justice-page-titles'
import { casePath, isCaseNumber, isCourtCode, isTypedCaseNumber } from '@/features/justice/lib/justice-paths'

/** The ÎCCJ's cases take the API 6–7 s to read (design.md §12.5, ask 15): past a render's deadline, so the browser reads them. */
const SLOW_CASE_COURT = 'InaltaCurtedeCasatiesiJustitie'

/**
 * One case, by its court and its number (`/justice/cases/TribunalulCLUJ/1234/117/2024`):
 * the durable key — the API's case id can change on a reload. The number,
 * which carries slashes, is the splat.
 *
 * The case is read on the server (kept ten minutes, under a deadline —
 * `justice-ssr.ts`) and seeds the page's query. A number the court does not
 * have is a 404. Case pages are not indexed: they describe one dispute, and
 * a search engine is no place to find a person's case.
 */
export const Route = createFileRoute('/justice/cases/$code/$')({
  ssr: true,
  params: {
    parse: (params) => {
      const number = params._splat ?? ''
      if (!isCourtCode(params.code) || !isCaseNumber(number)) throw notFound()
      // The ÎCCJ's page renders before any read confirms the case, so its address holds only a number's exact shape.
      if (params.code === SLOW_CASE_COURT && !isTypedCaseNumber(number)) throw notFound()
      return { code: params.code, _splat: number }
    },
  },
  loader: async ({ context, params }): Promise<JusticeCaseServerRead> => {
    const number = params._splat
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/justice/hooks/use-justice-case')
      void context.queryClient.prefetchQuery(hooks.justiceCaseQueryOptions(params.code, number)).catch(() => undefined)
      return { code: params.code, number }
    }
    if (params.code === SLOW_CASE_COURT) return { code: params.code, number }
    // Read directly, not through the query client: a query created on the server
    // is dehydrated with the server's clock and would read again on mount.
    const { readCaseForSsr } = await import('@/features/justice/api/justice-ssr')
    const read = await readCaseForSsr(params.code, number)
    if (read.sheet === null) throw notFound()
    return read
  },
  // A render with a failed or partial read is served once and read again, never cached for everyone.
  headers: ({ loaderData }) =>
    !loaderData?.sheet || loaderData.sheet.partial
      ? { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }
      : createPublicPageCacheHeaders({
          sharedMaxAgeSeconds: 600,
          staleWhileRevalidateSeconds: 3600,
          vary: ['Accept-Encoding', 'Cookie'],
        }),
  // In the request's own language: the shared Lingui instance may hold another request's by the time a head that waited on its loader runs.
  head: ({ params, loaderData, match }) => {
    const translator = translatorFor(match.context.locale)
    const number = params._splat
    const canonical = `${getSiteUrl()}${casePath(params.code, number)}`
    const sheet = loaderData?.sheet ?? match.context.queryClient.getQueryData<CaseSheet | null>(justiceKeys.case(params.code, number)) ?? null
    const title = buildCaseDocumentTitle(params.code, number)
    const court = courtName(params.code)
    const description = sheet
      ? translator._(msg`Dosarul ${number} de la ${court}: ședințele, căile de atac, părțile pe roluri și legile invocate, de pe portalul instanțelor. Persoanele nu sunt numite.`)
      : translator._(msg`Un dosar de la ${court}, de pe portalul instanțelor.`)
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { name: 'robots', content: 'noindex, follow' },
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
