import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { fetchProcurementCpvCategoryPage } from '@/features/procurement/api/procurement-api'

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
  loader: async ({ params }) => {
    const page = await fetchProcurementCpvCategoryPage(params.code)
    if (!page) {
      throw notFound()
    }
    return { page }
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
