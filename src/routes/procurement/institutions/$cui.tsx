import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  fetchProcurementAuthoritySlice,
  fetchProcurementInstitutionOverview,
} from '@/features/procurement/api/procurement-api'
import { buildInstitutionScopes } from '@/features/procurement/lib/institution-scopes'

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
  // Both payloads are prefetched so the profile's spine is server-rendered:
  // the populations row and the signals are the page's content, and leaving
  // them to a client-only query would ship a skeleton to crawlers.
  loader: async ({ params }) => {
    const [slice, overview] = await Promise.all([
      fetchProcurementAuthoritySlice(params.cui),
      fetchProcurementInstitutionOverview({
        authorityCui: params.cui,
        scopes: buildInstitutionScopes(),
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
  // The loader already resolved the buyer's name — a CUI-only title is a
  // useless search result.
  const name = loaderData?.overview?.authorityName?.trim()
  const title = `${name || `Instituție CUI ${params.cui}`} — Achiziții publice — Transparenta.eu`
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
