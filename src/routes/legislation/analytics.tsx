import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { fetchLegislationOverview } from '@/features/legal/api/legal-api'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import type { LegislationOverview } from '@/schemas/legal'

export type LegislationAnalyticsRouteLoaderData = {
  readonly overview: LegislationOverview | null
}

export const Route = createFileRoute('/legislation/analytics')({
  loader: async () => {
    const overview = await fetchLegislationOverview()
    return { overview } satisfies LegislationAnalyticsRouteLoaderData
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: () => ({
    meta: [
      { title: `${t`Analiza legislației`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`Cifrele de ansamblu ale corpusului legislativ și actele pe care se sprijină restul legislației.`,
      },
    ],
  }),
})
