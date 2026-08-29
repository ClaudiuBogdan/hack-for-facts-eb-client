import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { parseStatisticsTerritoryHubSearch } from '@/schemas/statistics'

export const Route = createFileRoute('/statistici/teritorii/$siruta')({
  validateSearch: parseStatisticsTerritoryHubSearch,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: ({ params }) => ({
    meta: [
      {
        title: `${t`Statistici teritoriu`} SIRUTA ${(params as { siruta: string }).siruta} — Transparenta.eu`,
      },
      {
        name: 'description',
        content: t`Indicatori INS Tempo pentru un teritoriu: populație, salariați, șomaj, locuințe și seriile lor istorice.`,
      },
    ],
  }),
})
