import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationAnalyticsPage } from '@/features/legal/components/legislation-analytics-page'

export const Route = createLazyFileRoute('/legislation/analytics')({
  component: LegislationAnalyticsPage,
})
