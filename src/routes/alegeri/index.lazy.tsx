import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { ElectionsLandingPage } from '@/features/elections/components/elections-landing-page'
import type { ElectionsLandingSearch } from '@/features/elections/types'

export const Route = createLazyFileRoute('/alegeri/')({
  component: AlegeriLandingRoutePage,
})

function AlegeriLandingRoutePage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/alegeri/' })

  return (
    <ElectionsLandingPage
      search={search}
      onSearchChange={(next: ElectionsLandingSearch) => {
        void navigate({ search: next, replace: true })
      }}
    />
  )
}
