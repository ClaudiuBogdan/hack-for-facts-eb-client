import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

const cuiSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\d{1,12}$/, 'CUI invalid')

export const Route = createFileRoute('/procurement/suppliers/$cui')({
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
  head: buildSupplierHead,
})

function buildSupplierHead({
  params,
}: {
  readonly params: { readonly cui: string }
}) {
  const site = getSiteUrl()
  const canonical = `${site}/procurement/suppliers/${params.cui}`
  const title = `Furnizor CUI ${params.cui} — Achiziții publice — Transparenta.eu`
  return {
    meta: [
      { title },
      {
        name: 'description',
        content:
          'Profil de achiziții al furnizorului — instituții publice, categorii CPV, venituri din contracte.',
      },
      { property: 'og:title', content: title },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
