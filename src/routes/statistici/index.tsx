import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import {
  fetchLandingCatalog,
  fetchLandingData,
} from '@/features/statistics/api/statistics-api'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { parseStatisticsLandingSearch } from '@/schemas/statistics'
import type {
  StatisticsLandingCatalog,
  StatisticsLandingData,
} from '@/schemas/statistics'

export type StatisticsLandingLoaderData = {
  readonly landingData: StatisticsLandingData | null
  readonly landingCatalog: StatisticsLandingCatalog | null
}

/**
 * Landing loader: exactly the two-POST budget — POST 1 packs every
 * observation-bearing block, POST 2 packs the catalog/theme counts. Failures
 * degrade to null so SSR always answers; the client queries retry per band.
 */
export const Route = createFileRoute('/statistici/')({
  validateSearch: parseStatisticsLandingSearch,
  loader: async ({ abortController }): Promise<StatisticsLandingLoaderData> => {
    const [landingData, landingCatalog] = await Promise.allSettled([
      fetchLandingData(abortController.signal),
      fetchLandingCatalog(abortController.signal),
    ])
    return {
      landingData: landingData.status === 'fulfilled' ? landingData.value : null,
      landingCatalog:
        landingCatalog.status === 'fulfilled' ? landingCatalog.value : null,
    }
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: () => ({
    meta: [
      { title: `${t`Statistici INS`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`România în cifre: populație, salariați, șomaj și locuințe pentru fiecare localitate, județ și pentru întreaga țară — date oficiale INS Tempo.`,
      },
    ],
  }),
})
