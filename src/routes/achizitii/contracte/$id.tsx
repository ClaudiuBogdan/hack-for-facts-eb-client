import { createFileRoute, notFound } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { procurementApi } from '@/features/procurement/api/procurement-api'

export const Route = createFileRoute('/achizitii/contracte/$id')({
  ssr: true,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  loader: async ({ params }) => {
    const detail = await procurementApi.fetchContractDetail(params.id)
    if (!detail) {
      throw notFound()
    }
    return { detail }
  },
  head: buildContractDetailHead,
})

function buildContractDetailHead({
  params,
}: {
  readonly params: { readonly id: string }
}) {
  const site = getSiteUrl()
  const canonical = `${site}/achizitii/contracte/${params.id}`
  const title = `Contract ${params.id} — Achiziții publice — Transparenta.eu`
  return {
    meta: [
      { title },
      { name: 'description', content: 'Detalii contract de achiziție publică.' },
      { property: 'og:title', content: title },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
