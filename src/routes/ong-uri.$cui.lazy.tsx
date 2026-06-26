import { createLazyFileRoute } from '@tanstack/react-router'
import {
  NgoProfileNotFound,
  NgoProfilePage,
} from '@/features/ngos/components/ngo-profile-page'
import type { NgoProfileRouteLoaderData } from './ong-uri.$cui'

export const Route = createLazyFileRoute('/ong-uri/$cui')({
  component: NgoProfileRoutePage,
  notFoundComponent: NgoProfileNotFound,
})

function NgoProfileRoutePage() {
  const { cui } = Route.useParams()
  const { tab, evidence } = Route.useSearch()
  const loaderData = Route.useLoaderData() as
    | NgoProfileRouteLoaderData
    | undefined

  if (!loaderData?.profile) {
    return <NgoProfileNotFound />
  }

  return (
    <NgoProfilePage
      cui={loaderData.cui ?? cui}
      initialProfile={loaderData.profile}
      initialFunding={loaderData.funding}
      tab={tab}
      evidenceOpen={evidence === true}
    />
  )
}
