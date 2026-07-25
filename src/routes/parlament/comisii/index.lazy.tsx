import { createLazyFileRoute } from '@tanstack/react-router'
import { ParliamentCommitteesPage } from '@/features/parliament/components/parliament-committees-page'

export const Route = createLazyFileRoute('/parlament/comisii/')({
  component: CommitteesRoute,
})

function CommitteesRoute() {
  return <ParliamentCommitteesPage search={Route.useSearch()} />
}
