import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import {
  fetchProcurementAuthoritySlice,
  fetchProcurementInstitutionOverview,
} from '@/features/procurement/api/procurement-api'
import {
  procurementAuthoritySliceQueryOptions,
  procurementInstitutionOverviewQueryOptions,
} from '@/features/procurement/hooks/use-procurement-data'
import { buildInstitutionScopes } from '@/features/procurement/lib/institution-scopes'
import { buildInstitutionDocumentTitle } from '@/features/procurement/lib/procurement-page-titles'

const cuiSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\d{1,12}$/, 'CUI invalid')

/**
 * Quick-filter state — the page's own basic filters (year, CPV division),
 * kept in the URL so a filtered profile is shareable. Invalid values drop
 * individually rather than failing the route.
 */
const institutionSearchSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  cpv: z
    .string()
    .trim()
    .regex(/^\d{2}$/)
    .optional()
    .catch(undefined),
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/procurement/institutions/$cui')({
  ssr: true,
  params: {
    parse: (params) => {
      const parsed = cuiSchema.safeParse(params.cui)
      if (!parsed.success) {
        throw notFound()
      }
      return { cui: parsed.data }
    },
  },
  validateSearch: (search: Record<string, unknown>) =>
    institutionSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    year: search.year,
    cpv: search.cpv,
    month: search.month,
  }),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  // Both payloads are prefetched so the profile's spine is server-rendered:
  // the populations row and the signals are the page's content, and leaving
  // them to a client-only query would ship a skeleton to crawlers. The slice
  // prefetch stays UNFILTERED — it feeds the title and the quick-filter chip
  // options; the filtered slice loads client-side when filters are active.
  //
  // AWAITED ON THE SERVER ONLY. These are ~1s of GraphQL; awaiting them on a
  // client-side navigation froze the user on the previous page for ~1.4s with
  // no feedback. In the browser we start the same two requests and hand the
  // router an empty payload immediately — `ProcurementInstitutionPage` renders
  // its header plus `ProcurementDetailSkeleton` and fills in when they land.
  loader: async ({ context, params, deps }) => {
    const scope = {
      // A picked month wins over its year — it is the narrower selection.
      ...(deps.month
        ? { monthFrom: deps.month, monthTo: deps.month }
        : deps.year
          ? { monthFrom: `${deps.year}-01`, monthTo: `${deps.year}-12` }
          : {}),
      ...(deps.cpv ? { cpvDivision: deps.cpv } : {}),
    }
    const sliceOptions = procurementAuthoritySliceQueryOptions(params.cui)
    const overviewOptions = procurementInstitutionOverviewQueryOptions(
      params.cui,
      buildInstitutionScopes(scope),
    )

    if (!shouldBlockLoaderForSsr()) {
      // Fire-and-forget into the query cache the page reads from, so the
      // requests start at click time rather than after the lazy chunk mounts.
      // Rejections surface through the page's own query error state.
      void context.queryClient.prefetchQuery(sliceOptions)
      void context.queryClient.prefetchQuery(overviewOptions)
      return {}
    }

    // Fetched directly rather than through the query client: seeding the
    // server cache would dehydrate the server's `dataUpdatedAt` into the HTML,
    // so any CDN hit older than the 60s `staleTime` would refetch both queries
    // on mount. Returning them as loader data lets the page's `initialData`
    // stamp them fresh at hydration, as it did before. It also keeps the SSR
    // path off the client's `retry: 1` default, which would double worst-case
    // TTFB while the API is failing.
    const [slice, overview] = await Promise.all([
      fetchProcurementAuthoritySlice(params.cui),
      fetchProcurementInstitutionOverview({
        authorityCui: params.cui,
        scopes: buildInstitutionScopes(scope),
      }),
    ])
    return { slice, overview }
  },
  head: buildInstitutionHead,
})

function buildInstitutionHead({
  params,
  loaderData,
}: {
  readonly params: { readonly cui: string }
  readonly loaderData?: { readonly overview?: { readonly authorityName: string | null } }
}) {
  const site = getSiteUrl()
  const canonical = `${site}/procurement/institutions/${params.cui}`
  // The SSR loader already resolved the buyer's name — a CUI-only title is a
  // useless search result. On a client-side navigation the loader returns
  // early, so this falls back to the CUI and the page corrects it once its
  // query lands (see `useClientDocumentTitle`).
  const title = buildInstitutionDocumentTitle({
    cui: params.cui,
    authorityName: loaderData?.overview?.authorityName,
  })
  return {
    meta: [
      { title },
      {
        name: 'description',
        content:
          'Profil de achiziții al instituției publice — furnizori, categorii CPV, contracte recente.',
      },
      { property: 'og:title', content: title },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
