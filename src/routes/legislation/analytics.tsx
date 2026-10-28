import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import type { LegislationOverview } from '@/schemas/legal'

export type LegislationAnalyticsRouteLoaderData = {
  readonly overview: LegislationOverview | null
}

export const Route = createFileRoute('/legislation/analytics')({
  // The API module is imported here, not at the top: this file is in every page's route tree.
  loader: async () => {
    const { fetchLegislationOverview } = await import('@/features/legal/api/legal-api')
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
