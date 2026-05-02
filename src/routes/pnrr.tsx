import { createFileRoute } from '@tanstack/react-router'
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
    const title = 'PNRR - Planul Național de Redresare și Reziliență | Transparenta.eu'
    const description =
      'Dashboard interactiv cu toate proiectele din Planul Național de Redresare și Reziliență (PNRR): progres, finanțare, anomalii și distribuție geografică.'

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
