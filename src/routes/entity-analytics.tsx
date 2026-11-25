import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { translatorFor } from '@/lib/i18n'
import { buildPageHead } from '@/lib/page-head'
import { readUserCurrencyPreference, readUserInflationAdjustedPreference } from '@/lib/user-preferences'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'

export type { EntityAnalyticsUrlState } from '@/lib/entity-analytics-query'

export const Route = createFileRoute('/entity-analytics')({
  // Rendered from the reader's cookies (currency, inflation, language), so kept by no browser or CDN (CACHE-001).
  headers: () => ({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' }),
  beforeLoad: async ({ context, search }) => {
    const { queryClient } = context
    // Imported here, not at the top: the URL schema is built on the chart
    // schemas, which the route tree must not carry (docs/route-contracts.md).
    const { entityAnalyticsSearchSchema, entityAnalyticsQueryOptions, resolveEntityAnalyticsFilter } = await import('@/lib/entity-analytics-query')
    const parsed = entityAnalyticsSearchSchema.parse(search)
    const [currency, inflationAdjusted] = await Promise.all([
      readUserCurrencyPreference(), readUserInflationAdjustedPreference(),
    ])
    const entityAnalyticsPreferences = { currency, inflationAdjusted }
    if (parsed.view === 'table') {
      const rows = queryClient.prefetchQuery(entityAnalyticsQueryOptions({
        ...parsed,
        filter: resolveEntityAnalyticsFilter(parsed.filter, entityAnalyticsPreferences),
      }))
      // The server sends the table's rows in the HTML, not a skeleton that
      // only hydration fills: the response waited for the query anyway (the
      // route cache keeps the whole body). A client navigation shows the page
      // at once and the rows when they come.
      if (shouldBlockLoaderForSsr()) await rows
    }
    return { entityAnalyticsPreferences }
  },
  // In the request's own language: the shared Lingui instance may hold another request's.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    return buildPageHead({
      title: translator._(msg`Entity analytics – Transparenta.eu`),
      description: translator._(msg`Analyze aggregated values per entity and explore top entities by amount and per capita.`),
      // The page stays for its links and its full filter panel; /public-institutions is the one to index (owner, 25 November 2026).
      canonical: `${getSiteUrl()}/public-institutions`,
    })
  },
})
