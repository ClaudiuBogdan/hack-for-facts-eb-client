import { createLazyFileRoute } from '@tanstack/react-router'
import {
  PublicEnterprisesLandingRoute,
  PublicEnterprisesListingRoute,
} from '@/features/public-enterprises/components/public-enterprises-pages'
import {
  hasPublicEnterpriseListingFilters,
  type PublicEnterpriseSearch,
} from '@/schemas/public-enterprise'

export const Route = createLazyFileRoute('/intreprinderi-publice/')({
  component: PublicEnterprisesIndexRoute,
})

function PublicEnterprisesIndexRoute() {
  const search = Route.useSearch() as PublicEnterpriseSearch
  const isListing = hasPublicEnterpriseListingFilters(search)

  if (isListing) {
    return <PublicEnterprisesListingRoute search={search} />
  }

  return <PublicEnterprisesLandingRoute />
}
