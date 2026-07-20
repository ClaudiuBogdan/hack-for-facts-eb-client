import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { fetchProcurementAuthoritySlice } from '@/features/procurement/api/procurement-api'

const cuiSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\d{1,12}$/, 'CUI invalid')

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
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  loader: async ({ params }) => {
    const slice = await fetchProcurementAuthoritySlice(params.cui)
    return { slice }
  },
  head: buildInstitutionHead,
})

function buildInstitutionHead({
  params,
}: {
  readonly params: { readonly cui: string }
}) {
  const site = getSiteUrl()
  const canonical = `${site}/procurement/institutions/${params.cui}`
  const title = `Instituție CUI ${params.cui} — Achiziții publice — Transparenta.eu`
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
