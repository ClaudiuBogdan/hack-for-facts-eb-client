import { useState } from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { CompanyAnalyticsPage } from '@/features/private-companies/components/analytics/company-analytics-page'
import { CompanyAnalyticsSeedContext, createSeedStore } from '@/features/private-companies/hooks/use-company-analytics'

export const Route = createLazyFileRoute('/companies/analytics')({
  component: CompanyAnalyticsRoutePage,
})

function CompanyAnalyticsRoutePage() {
  // What the server read for the document, taken once for the page's life: a later
  // navigation's loader data (empty in the browser, or a cached match) never seeds again.
  const { seed } = Route.useLoaderData()
  const [seeds] = useState(() => createSeedStore(seed))
  return (
    <CompanyAnalyticsSeedContext value={seeds}>
      <CompanyAnalyticsPage />
    </CompanyAnalyticsSeedContext>
  )
}
