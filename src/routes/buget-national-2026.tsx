import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { getSiteUrl } from '@/config/env'
import { Currency } from '@/schemas/charts'

const BudgetNational2026SearchSchema = z.object({
  section: z.string().optional(),
  currency: Currency.optional(),
})

export const Route = createFileRoute('/buget-national-2026')({
  ssr: true,
  validateSearch: BudgetNational2026SearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: () => {
    const siteUrl = getSiteUrl()
    const canonicalUrl = `${siteUrl}/buget-national-2026`
    const title = 'Bugetul de Stat 2026 - Transparenta.eu'
    const description =
      'Proiectul bugetului de stat al Romaniei pe 2026: analiza cheltuielilor pe institutii, domenii functionale si categorii economice.'

    const shareImage = `${siteUrl}/assets/images/share-buget-2026.png`

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
        { property: 'og:image', content: shareImage },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Bugetul de Stat 2026 - Transparenta.eu' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: shareImage },
        { name: 'twitter:image:alt', content: 'Bugetul de Stat 2026 - Transparenta.eu' },
      ],
      links: [
        { rel: 'canonical', href: canonicalUrl },
      ],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'Bugetul de Stat al Romaniei 2026',
            description,
            url: canonicalUrl,
            license: 'https://creativecommons.org/licenses/by/4.0/',
            creator: {
              '@type': 'Organization',
              name: 'Transparenta.eu',
              url: siteUrl,
            },
            temporalCoverage: '2024/2029',
            spatialCoverage: {
              '@type': 'Place',
              name: 'Romania',
            },
          }),
        },
      ],
    }
  },
})
