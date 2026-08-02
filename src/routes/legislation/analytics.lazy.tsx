import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationAnalyticsPage } from '@/features/legal/components/legislation-analytics-page'
import type { LegislationAnalyticsRouteLoaderData } from './analytics'

export const Route = createLazyFileRoute('/legislation/analytics')({
  component: LegislationAnalyticsRoutePage,
})

function LegislationAnalyticsRoutePage() {
  const loaderData = Route.useLoaderData() as
    | LegislationAnalyticsRouteLoaderData
    | undefined

  return (
    <LegislationAnalyticsPage
      initialOverview={loaderData?.overview ?? undefined}
    />
  )
}
