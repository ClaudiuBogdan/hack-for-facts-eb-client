import { createFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { createProcurementDetailLoader } from '@/features/procurement/lib/detail-route-loader'

export const Route = createFileRoute('/procurement/direct-acquisitions/$id')({
  ssr: true,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  loader: createProcurementDetailLoader('direct_acquisitions'),
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
