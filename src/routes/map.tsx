import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { translatorFor } from '@/lib/i18n'
import { buildPageHead } from '@/lib/page-head'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

/**
 * The map of every primărie's and county's budget. No `validateSearch`: the
 * page reads its own keys and an old link's (`features/budget-map/lib/map-page-search.ts`),
 * and other pages still link here with the previous page's search.
 */
export const Route = createFileRoute('/map')({
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  // In the request's own language: the shared Lingui instance may hold another request's.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    return buildPageHead({
      title: translator._(msg`Harta bugetelor locale - Transparenta.eu`),
      description: translator._(msg`Veniturile, cheltuielile și soldul fiecărei primării și al fiecărui județ, pe hartă și în tabel, din execuția bugetară raportată.`),
      canonical: `${getSiteUrl()}/map`,
    })
  },
})
