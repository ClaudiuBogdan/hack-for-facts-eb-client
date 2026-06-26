import { createFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  cleanProcurementSearch,
  parseProcurementSearch,
  type ProcurementSearchState,
} from '@/schemas/procurement-search'

export type ProcurementSearchRouteLoaderData = {
  readonly initialSearch: ProcurementSearchState
}

export const Route = createFileRoute('/achizitii/cautare')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = parseProcurementSearch(search)
    return cleanProcurementSearch(parsed)
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: buildAchizitiiCautareHead,
})

function buildAchizitiiCautareHead() {
  const site = getSiteUrl()
  const canonical = `${site}/achizitii/cautare`
  const title = 'Caută în achiziții publice — Transparenta.eu'
  const description =
    'Caută în proceduri, contracte, achiziții directe și modificări. Filtre deterministe, acoperire dezvăluită, export CSV.'
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
