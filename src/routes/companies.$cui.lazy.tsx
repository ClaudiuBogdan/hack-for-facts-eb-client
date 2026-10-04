import { createLazyFileRoute, useParams } from '@tanstack/react-router'
import { CompanyProfilePage } from '@/features/private-companies/components/profile/company-profile-page'
import {
  CompanyProfileError,
  CompanyProfileNotFound,
  CompanyProfileSkeleton,
} from '@/features/private-companies/components/profile/company-profile-states'
import { usePrivateCompanyProfile } from '@/features/private-companies/hooks/use-private-company-profile'
import { normalizeCompanyCui } from '@/features/private-companies/lib/normalize-company-cui'
import { buildPrivateCompanyNeutralTitle } from '@/features/private-companies/seo/private-company-seo'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import type { PrivateCompanyRouteLoaderData } from './companies.$cui'

export const Route = createLazyFileRoute('/companies/$cui')({
  component: PrivateCompanyRoutePage,
  notFoundComponent: PrivateCompanyRouteNotFound,
})

/** The server path's `notFound()` — a CUI no source knows, or one that is not a CUI — in the page's own frame. */
function PrivateCompanyRouteNotFound() {
  const { cui } = useParams({ strict: false }) as { readonly cui?: string }
  const companyCui = cui ? normalizeCompanyCui(cui) : null
  // The tab names no company here, whatever an earlier page of this route wrote.
  useClientDocumentTitle(buildPrivateCompanyNeutralTitle(companyCui ?? cui ?? ''))
  // Named only when it is a CUI: the path of a mistyped link is not one.
  return <CompanyProfileNotFound cui={companyCui} />
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

  // The server's answer for this document stands in only until the browser's
  // own read settles; a failed read leaves nothing to show. Whether either may
  // be shown at all is the page's decision, under its registry pin — and so is
  // the tab's title, which names the company only once it is shown.
  const profile = isSuccess ? data : isError ? undefined : loaderData?.profile
  // While the page is mounted it names the tab; in the route's own states — loading, failed, not found, including
  // after the page unmounts — the tab says the CUI alone, never a company no longer shown.
  useClientDocumentTitle(profile ? null : buildPrivateCompanyNeutralTitle(companyCui))

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
