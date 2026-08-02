import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { fetchLegislationOverview } from '@/features/legal/api/legal-api'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import type { LegislationOverview } from '@/schemas/legal'

export type LegislationRouteLoaderData = {
  readonly overview: LegislationOverview | null
}

export const Route = createFileRoute('/legislation/')({
  loader: async () => {
    const overview = await fetchLegislationOverview()
    return { overview } satisfies LegislationRouteLoaderData
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: () => ({
    meta: [
      { title: `${t`Legislația României`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`Legi, ordonanțe și hotărâri din Portal Legislativ, cu statutul lor și dovada publicării în Monitorul Oficial.`,
      },
    ],
  }),
})
