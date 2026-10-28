import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { z } from 'zod'
import { getSiteUrl } from '@/config/env'
import { translatorFor } from '@/lib/i18n'
import { buildPageHead } from '@/lib/page-head'
import { defaultEntityAnalyticsFilter, entityAnalyticsFilterSchema, resolveEntityAnalyticsFilter, entityAnalyticsQueryOptions } from '@/lib/entity-analytics-query'
import { readUserCurrencyPreference, readUserInflationAdjustedPreference } from '@/lib/user-preferences'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'

const viewEnum = z.enum(['table', 'chart', 'line-items'])


const EntityAnalyticsSchema = z.object({
  view: viewEnum.default('table'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(25),
  filter: entityAnalyticsFilterSchema.default(defaultEntityAnalyticsFilter),
})

export type EntityAnalyticsUrlState = z.infer<typeof EntityAnalyticsSchema>

export const Route = createFileRoute('/entity-analytics')({
  headers: () =>
    createPublicPageCacheHeaders({
      vary: ['Accept-Encoding', 'Cookie'],
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 86400,
    }),
  beforeLoad: async ({ context, search }) => {
    const { queryClient } = context
    const parsed = EntityAnalyticsSchema.parse(search)
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
      canonical: `${getSiteUrl()}/entity-analytics`,
    })
  },
})
