import { createFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { measureFromSearch, searchForMeasure } from '@/features/landing/lib/budget-map-measures'
import { readAddressQuery, searchTermFromAddress, type AddressQuery } from '@/features/landing/lib/address-search-term'

/**
 * The landing. Server-rendered and publicly cacheable: nothing on it is
 * personal, and the one served figure (the institution count) is fetched on
 * the client so the cached HTML never carries a snapshot of it.
 */
export const Route = createFileRoute('/')({
  ssr: true,
  // Both of the landing's keys returned, an unreadable one as undefined, so the root's passthrough search cannot keep
  // a raw value under it: the budget map's picked map (`?harta=venituri`) and the search a link opens (`?q=`), kept as
  // the router read it (`readAddressQuery`) so the address serialises back to itself.
  validateSearch: (search: Record<string, unknown>): { harta?: string; q?: AddressQuery } => ({
    harta: searchForMeasure(measureFromSearch(search.harta) ?? 'balance'),
    q: readAddressQuery(search.q),
  }),
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 3600,
      sharedMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 604800,
    }),
  head: ({ match }) => buildHomeHead({ searchTerm: searchTermFromAddress(match.search.q) }),
})

/** A search link (`/?q=`) is the landing with its field filled: the same canonical page, never a search result of its own. */
export function buildHomeHead({ searchTerm }: { readonly searchTerm?: string } = {}) {
  const site = getSiteUrl()
  const pageTitle = 'Transparenta.eu – Date publice, decizii informate'
  const description =
    'Bugete, achiziții, legislație, justiție și instituții — fiecare cifră cu sursa și perioada ei. Caută o entitate sau pornește de la domeniul care te interesează.'
  const canonical = site
  const image = `${site}/assets/images/share-image.png`

  return {
    meta: [
      { title: pageTitle },
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Transparenta.eu' },
      { property: 'og:title', content: pageTitle },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: 'Transparenta.eu platform preview' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: pageTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      { name: 'twitter:image:src', content: image },
      { name: 'twitter:image:alt', content: 'Transparenta.eu platform preview' },
      { name: 'robots', content: searchTerm ? 'noindex,follow' : 'index,follow' },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
