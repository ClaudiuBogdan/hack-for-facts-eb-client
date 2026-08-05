import { createFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { createProcurementDetailLoader } from '@/features/procurement/lib/detail-route-loader'

export const Route = createFileRoute('/procurement/procedures/$id')({
  ssr: true,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  loader: createProcurementDetailLoader('procedures'),
  head: buildProcedureDetailHead,
})

function buildProcedureDetailHead({
  params,
}: {
  readonly params: { readonly id: string }
}) {
  const site = getSiteUrl()
  const canonical = `${site}/procurement/procedures/${params.id}`
  const title = `Procedură ${params.id} — Achiziții publice — Transparenta.eu`
  return {
    meta: [
      { title },
      { name: 'description', content: 'Detalii procedură de achiziție publică.' },
      { property: 'og:title', content: title },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
