import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { translatorFor } from '@/lib/i18n'
import { buildPageHead } from '@/lib/page-head'

/**
 * The map of every primărie's and county's budget. No `validateSearch`: the
 * page reads its own keys and an old link's (`features/budget-map/lib/map-page-search.ts`),
 * and other pages still link here with the previous page's search.
 *
 * Kept nowhere: the document follows the reader's language and theme cookies,
 * and its server render is only the bar and the map's frame (the figures load
 * in the browser), so a shared copy would save little and serve one reader's
 * language to the next (root, 25 November 2026; the Nitro route cache is off
 * for `/map` too).
 */
export const MAP_PAGE_HEADERS: Readonly<Record<string, string>> = { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' }

export const Route = createFileRoute('/map')({
  headers: () => ({ ...MAP_PAGE_HEADERS }),
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
