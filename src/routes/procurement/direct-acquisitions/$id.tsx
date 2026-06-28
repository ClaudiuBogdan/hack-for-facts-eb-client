import { createFileRoute, notFound } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { procurementApi } from '@/features/procurement/api/procurement-api'

export const Route = createFileRoute('/procurement/direct-acquisitions/$id')({
  ssr: true,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  loader: async ({ params }) => {
    const detail = await procurementApi.fetchDirectAcquisitionDetail(params.id)
    if (!detail) {
      throw notFound()
    }
    return { detail }
  },
  head: buildDirectAcquisitionDetailHead,
})

function buildDirectAcquisitionDetailHead({
  params,
}: {
  readonly params: { readonly id: string }
}) {
  const site = getSiteUrl()
  const canonical = `${site}/procurement/direct-acquisitions/${params.id}`
  const title = `Achiziție directă ${params.id} — Achiziții publice — Transparenta.eu`
  return {
    meta: [
      { title },
      { name: 'description', content: 'Detalii achiziție directă.' },
      { property: 'og:title', content: title },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
