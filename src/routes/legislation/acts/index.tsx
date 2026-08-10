import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { legalActsBrowseFilterSchema } from '@/schemas/legal'

/**
 * The acts directory — the `Acte` tab. Filters live in the URL
 * (actType/year/status, all optional) so a filtered view is a shareable
 * link; paging stays cursor-only and in memory, never a URL page number.
 */
export const Route = createFileRoute('/legislation/acts/')({
  validateSearch: legalActsBrowseFilterSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: () => ({
    meta: [
      { title: `${t`Directorul actelor`} — Transparenta.eu` },
      {
        name: 'description',
        content: t`Toate actele din Portal Legislativ: filtrează după tip, an și statut, ordonate după cât de citate sunt.`,
      },
    ],
  }),
})
