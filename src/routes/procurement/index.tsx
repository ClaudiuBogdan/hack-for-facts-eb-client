import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { parseProcurementOverviewSearch } from '@/schemas/procurement-overview'

// Lenient `?tab=` handling: tabs are path-driven (Overview → /procurement,
// Search → /procurement/search), but a stray tab param redirects instead of
// 404ing or lingering in the URL.
export const Route = createFileRoute('/procurement/')({
  ssr: true,
  validateSearch: parseProcurementOverviewSearch,
  beforeLoad: ({ search }) => {
    if (search.tab === 'search') {
      const { tab: _tab, ...rest } = search
      throw redirect({ to: '/procurement/search', search: rest, replace: true })
    }
    if (search.tab === 'overview') {
      const { tab: _tab, ...rest } = search
      throw redirect({ to: '/procurement', search: rest, replace: true })
    }
  },
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
