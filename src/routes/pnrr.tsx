import { createFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { getSiteUrl } from '@/config/env'
import { parsePnrrSearch } from '@/schemas/pnrr'

export const Route = createFileRoute('/pnrr')({
  ssr: true,
  validateSearch: parsePnrrSearch,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: () => {
    const siteUrl = getSiteUrl()
    const canonicalUrl = `${siteUrl}/pnrr`
    const title = t`PNRR - National Recovery and Resilience Plan | Transparenta.eu`
    const description = t`Interactive dashboard with all projects from the National Recovery and Resilience Plan (PNRR): progress, funding, anomalies, and geographic distribution.`

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { name: 'robots', content: 'index,follow' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Transparenta.eu' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:locale', content: 'ro_RO' },
      ],
      links: [{ rel: 'canonical', href: canonicalUrl }],
    }
  },
})
