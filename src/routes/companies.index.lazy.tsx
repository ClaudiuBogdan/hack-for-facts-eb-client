import { useState } from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { PrivateCompanyHubPage } from '@/features/private-companies/components/hub/private-company-hub-page'
import { CompanyAnalyticsSeedContext, createSeedStore } from '@/features/private-companies/hooks/use-company-analytics'

export const Route = createLazyFileRoute('/companies/')({
  component: CompanyHubRoutePage,
})

function CompanyHubRoutePage() {
  // What the server read for the document, taken once for the page's life: a later
  // navigation's loader data (empty in the browser, or a cached match) never seeds again.
  const { seed } = Route.useLoaderData()
  const search = Route.useSearch()
  const [seeds] = useState(() => createSeedStore(seed))
  return (
    <CompanyAnalyticsSeedContext value={seeds}>
      <PrivateCompanyHubPage search={search} />
    </CompanyAnalyticsSeedContext>
  )
}
