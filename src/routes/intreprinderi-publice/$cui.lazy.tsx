import { createLazyFileRoute } from '@tanstack/react-router'
import {
  PublicEnterpriseNotFound,
  PublicEnterprisePageSkeleton,
  PublicEnterpriseProfileRoute,
} from '@/features/public-enterprises/components/public-enterprises-pages'
import type { PublicEnterpriseRouteLoaderData } from './$cui'
import type { PublicEnterpriseProfileSearch } from '@/schemas/public-enterprise'

export const Route = createLazyFileRoute('/intreprinderi-publice/$cui')({
  component: PublicEnterpriseProfileRoutePage,
  notFoundComponent: PublicEnterpriseNotFound,
})

function PublicEnterpriseProfileRoutePage() {
  const { cui: routeCui } = Route.useParams()
  const search = Route.useSearch() as PublicEnterpriseProfileSearch
  const loaderData = Route.useLoaderData() as
    | PublicEnterpriseRouteLoaderData
    | undefined

  if (!loaderData?.profile) {
    return <PublicEnterprisePageSkeleton />
  }

  return (
    <PublicEnterpriseProfileRoute
      profile={loaderData.profile}
      cui={loaderData.cui ?? routeCui}
      search={search}
    />
  )
}
