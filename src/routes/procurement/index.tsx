import { createFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

export const Route = createFileRoute('/procurement/')({
  ssr: true,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: buildAchizitiiLandingHead,
})

function buildAchizitiiLandingHead() {
  const site = getSiteUrl()
  const canonical = `${site}/procurement`
  const title = 'Achiziții publice — Transparenta.eu'
  const description =
    'Urmărește banii din achiziții publice: cine cumpără, ce cumpără (CPV), de la cine și pentru cât. Cu acoperire și prospețime dezvăluite lângă fiecare număr.'
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
