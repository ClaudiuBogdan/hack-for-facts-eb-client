import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { ElectionHubPage } from '@/features/elections/components/election-hub-page'
import type { ElectionHubSearch } from '@/features/elections/types'

export const Route = createLazyFileRoute('/alegeri/$electionKey')({
  component: ElectionHubRoutePage,
})

function ElectionHubRoutePage() {
  const search = Route.useSearch()
  const { electionKey } = Route.useParams()
  const navigate = useNavigate({ from: '/alegeri/$electionKey' })

  return (
    <ElectionHubPage
      electionKey={electionKey}
      search={search}
      onSearchChange={(next: ElectionHubSearch) => {
        void navigate({ search: next, replace: true })
      }}
    />
  )
}
