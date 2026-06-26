import { createLazyFileRoute } from '@tanstack/react-router'
import {
  PrivateCompanyNotFound,
  PrivateCompanyPage,
  PrivateCompanyPageSkeleton,
} from '@/features/private-companies/components/private-company-page'
import { usePrivateCompanyProfile } from '@/features/private-companies/hooks/use-private-company-profile'
import type { PrivateCompanyRouteLoaderData } from './companies.$cui'
import type { PrivateCompanyViewTab } from '@/schemas/private-company'

export const Route = createLazyFileRoute('/companies/$cui')({
  component: PrivateCompanyRoutePage,
})

function PrivateCompanyRoutePage() {
  const { cui } = Route.useParams()
  const { tab = 'summary', litPage = 1 } = Route.useSearch()
  const loaderData = Route.useLoaderData() as
    | PrivateCompanyRouteLoaderData
    | undefined

  const { data, isLoading, isSuccess } = usePrivateCompanyProfile(
    loaderData?.cui ?? cui,
  )

  const profile = isSuccess ? data : loaderData?.profile

  if (isLoading && !profile) {
    return <PrivateCompanyPageSkeleton />
  }

  if (!profile) {
    return <PrivateCompanyNotFound />
  }

  return (
    <PrivateCompanyPage
      profile={profile}
      tab={tab as PrivateCompanyViewTab}
      litPage={litPage}
      cui={loaderData?.cui ?? cui}
    />
  )
}
