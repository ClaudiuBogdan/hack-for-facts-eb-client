import { createLazyFileRoute } from '@tanstack/react-router'
import { PrivateCompanySearchPage } from '@/features/private-companies/components/search/private-company-search-page'

export const Route = createLazyFileRoute('/companies/')({
  component: PrivateCompanyDirectoryRoutePage,
})

function PrivateCompanyDirectoryRoutePage() {
  const searchState = Route.useSearch()
  return <PrivateCompanySearchPage searchState={searchState} />
}
