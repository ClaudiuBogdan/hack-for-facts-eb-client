import { createLazyFileRoute } from '@tanstack/react-router'
import {
  PrivateCompanyNotFound,
  PrivateCompanyPage,
  PrivateCompanyPageSkeleton,
} from '@/features/private-companies/components/private-company-page'
import { PrivateCompanyErrorPanel } from '@/features/private-companies/components/private-company-error-panel'
import { usePrivateCompanyProfile } from '@/features/private-companies/hooks/use-private-company-profile'
import { buildPrivateCompanyDocumentTitle } from '@/features/private-companies/seo/private-company-seo'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
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

  const { data, isLoading, isSuccess, isError, isFetching, refetch } =
    usePrivateCompanyProfile(loaderData?.cui ?? cui)

  const profile = isSuccess ? data : loaderData?.profile
  // The route `head` can only name the company on the SSR path; a client-side
  // navigation lands here with a `CUI …` placeholder title.
  useClientDocumentTitle(
    profile ? buildPrivateCompanyDocumentTitle(profile) : null,
  )

  if (isLoading && !profile) {
    return <PrivateCompanyPageSkeleton />
  }

  // A failed request is not evidence that the company is absent. The loader
  // used to reject and hand this to the route error boundary; on the client it
  // now settles here, so the two cases must be told apart explicitly.
  if (isError && !profile) {
    return (
      <PrivateCompanyErrorPanel
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    )
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
