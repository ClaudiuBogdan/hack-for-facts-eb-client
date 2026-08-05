import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { fetchProcurementCpvCategoryPage } from '@/features/procurement/api/procurement-api'
import { procurementCpvCategoryQueryOptions } from '@/features/procurement/hooks/use-procurement-data'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'

const cpvCodeSchema = z
  .string()
  .regex(/^\d{2,8}$/, 'Cod CPV invalid (2-8 cifre)')

export const Route = createFileRoute('/procurement/categories/$code')({
  ssr: true,
  params: {
    parse: (params) => {
      const parsed = cpvCodeSchema.safeParse(params.code)
      if (!parsed.success) {
        throw notFound()
      }
      return { code: parsed.data }
    },
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  // Awaited on the SSR path only, so crawlers still get a full document. In
  // the browser the same await held the *previous* page for the round-trip;
  // `CpvCategoryPage` renders its own skeleton / error / not-found states off
  // the query below. See `lib/ssr/loader-blocking`.
  loader: async ({ context, params }) => {
    if (!shouldBlockLoaderForSsr()) {
      void context.queryClient.prefetchQuery(
        procurementCpvCategoryQueryOptions(params.code),
      )
      return { code: params.code }
    }

    const page = await fetchProcurementCpvCategoryPage(params.code)
    if (!page) {
      throw notFound()
    }
    return { page, code: params.code }
  },
  head: buildCpvCategoryHead,
})

function buildCpvCategoryHead({
  params,
}: {
  readonly params: { readonly code: string }
}) {
  const site = getSiteUrl()
  const canonical = `${site}/procurement/categories/${params.code}`
  const title = `Categorie CPV ${params.code} — Achiziții publice — Transparenta.eu`
  return {
    meta: [
      { title },
      { name: 'description', content: 'Pagina de categorie CPV — cheltuieli, autorități, furnizori, trend.' },
      { property: 'og:title', content: title },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
