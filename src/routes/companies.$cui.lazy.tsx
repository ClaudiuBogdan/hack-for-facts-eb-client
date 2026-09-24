import { createLazyFileRoute, useParams } from '@tanstack/react-router'
import { CompanyProfilePage } from '@/features/private-companies/components/profile/company-profile-page'
import {
  CompanyProfileError,
  CompanyProfileNotFound,
  CompanyProfileSkeleton,
} from '@/features/private-companies/components/profile/company-profile-states'
import { usePrivateCompanyProfile } from '@/features/private-companies/hooks/use-private-company-profile'
import { normalizeCompanyCui } from '@/features/private-companies/lib/normalize-company-cui'
import { buildPrivateCompanyDocumentTitle } from '@/features/private-companies/seo/private-company-seo'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import type { PrivateCompanyRouteLoaderData } from './companies.$cui'

export const Route = createLazyFileRoute('/companies/$cui')({
  component: PrivateCompanyRoutePage,
  notFoundComponent: PrivateCompanyRouteNotFound,
})

/** The server path's `notFound()` — a CUI no source knows, or one that is not a CUI — in the page's own frame. */
function PrivateCompanyRouteNotFound() {
  const { cui } = useParams({ strict: false }) as { readonly cui?: string }
  // Named only when it is a CUI: the path of a mistyped link is not one.
  return <CompanyProfileNotFound cui={cui ? normalizeCompanyCui(cui) : null} />
}

function PrivateCompanyRoutePage() {
  const { cui } = Route.useParams()
  const search = Route.useSearch()
  const loaderData = Route.useLoaderData() as
    | PrivateCompanyRouteLoaderData
    | undefined
  const companyCui = loaderData?.cui ?? cui

  const { data, isLoading, isSuccess, isError, isFetching, refetch } =
    usePrivateCompanyProfile(companyCui)

  const profile = isSuccess ? data : loaderData?.profile
  // The route `head` can only name the company on the SSR path; a client-side
  // navigation lands here with a `CUI …` placeholder title.
  useClientDocumentTitle(
    profile ? buildPrivateCompanyDocumentTitle(profile) : null,
  )

  if (isLoading && !profile) {
    return <CompanyProfileSkeleton />
  }

  // A failed request is not evidence that the company is absent. The loader
  // used to reject and hand this to the route error boundary; on the client it
  // now settles here, so the two cases must be told apart explicitly.
  if (isError && !profile) {
    return (
      <CompanyProfileError
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    )
  }

  if (!profile) {
    return <CompanyProfileNotFound cui={companyCui} />
  }

  // Keyed by company: moving from one profile to another starts the page
  // over — the count-ups, the chart being read, every list opened.
  return (
    <CompanyProfilePage
      key={companyCui}
      profile={profile}
      cui={companyCui}
      search={search}
    />
  )
}
