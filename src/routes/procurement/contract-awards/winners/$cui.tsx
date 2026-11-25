import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { createNoStoreHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { DA_ROUTE_CACHE } from '@/features/procurement/lib/disclosure-cache'
import { buildContractAwardWinnerDocumentTitle } from '@/features/procurement/lib/procurement-page-titles'
import { parseProcurementContractAwardWinnerSearch } from '@/schemas/procurement-contract-award-winner'

/**
 * A winner code's contract awards (KB0Z, owner 25 November 2026): the list a
 * company named from the firms' register but outside the direct purchases'
 * gate is linked to, as the supplier's page has nothing for it.
 *
 * Read in the browser only: the server render carries no winner, so a code
 * the API refuses and one it serves render alike, and nothing about the code
 * is kept anywhere. Every render is no-store and kept from search engines.
 */
// The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
const NO_STORE = { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }

export const Route = createFileRoute('/procurement/contract-awards/winners/$cui')({
  ssr: true,
  ...DA_ROUTE_CACHE,
  validateSearch: parseProcurementContractAwardWinnerSearch,
  headers: () => NO_STORE,
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    const title = buildContractAwardWinnerDocumentTitle(translator, {})
    const description = translator._(msg`Contractele de achiziție publică atribuite unei firme, din SEAP: de cine, ce, cu cât și când.`)
    return {
      meta: [
        { title },
        { name: 'robots', content: 'noindex' },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
      ],
    }
  },
})
