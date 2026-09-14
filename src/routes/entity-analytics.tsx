import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { defaultEntityAnalyticsFilter, entityAnalyticsFilterSchema, resolveEntityAnalyticsFilter, entityAnalyticsQueryOptions } from '@/lib/entity-analytics-query'
import { readUserCurrencyPreference, readUserInflationAdjustedPreference } from '@/lib/user-preferences'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

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
      void queryClient.prefetchQuery(entityAnalyticsQueryOptions({
        ...parsed,
        filter: resolveEntityAnalyticsFilter(parsed.filter, entityAnalyticsPreferences),
      }))
    }
    return { entityAnalyticsPreferences }
  },
})
