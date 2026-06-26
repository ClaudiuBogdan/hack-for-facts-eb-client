import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { ContestResultExplorerPage } from '@/features/elections/components/contest-result-explorer-page'
import type { ContestSearch } from '@/features/elections/types'

export const Route = createLazyFileRoute('/alegeri/contest/$contestKey')({
  component: ContestResultRoutePage,
})

function ContestResultRoutePage() {
  const search = Route.useSearch()
  const { contestKey } = Route.useParams()
  const navigate = useNavigate({ from: '/alegeri/contest/$contestKey' })

  return (
    <ContestResultExplorerPage
      contestKey={contestKey}
      search={search}
      onSearchChange={(next: ContestSearch) => {
        void navigate({ search: next, replace: true })
      }}
    />
  )
}
