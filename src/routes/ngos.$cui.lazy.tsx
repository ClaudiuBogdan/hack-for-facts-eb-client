import { createLazyFileRoute, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { NgoOrganizationPage } from '@/features/ngos/organization/components/ngo-organization-page'
import { NgoProfileNotFound, NgoProfileUnavailable } from '@/features/ngos/organization/components/profile-fallbacks'

export const Route = createLazyFileRoute('/ngos/$cui')({
  component: NgoProfileRoutePage,
  notFoundComponent: NgoProfileNotFound,
  errorComponent: NgoProfileUnavailable,
})

function NgoProfileRoutePage() {
  const { organization, statementsRead } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/ngos/$cui' })
  const router = useRouter()
  const retrying = useRouterState({ select: (state) => state.isLoading })
  return (
    <NgoOrganizationPage
      organization={organization}
      statementsRead={statementsRead}
      year={search.an}
      // The year a reader chose, kept in the address; the view is the same band, so the scroll stays.
      onYear={(year) => void navigate({ search: (previous) => ({ ...previous, an: year }), replace: true, resetScroll: false })}
      onRetry={() => void router.invalidate()}
      retrying={retrying}
    />
  )
}
