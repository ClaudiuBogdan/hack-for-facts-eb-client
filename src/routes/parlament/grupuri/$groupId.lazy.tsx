import { createLazyFileRoute } from '@tanstack/react-router'
import { ParliamentGroupDetailPage } from '@/features/parliament/components/parliament-group-detail-page'

export const Route = createLazyFileRoute('/parlament/grupuri/$groupId')({
  component: ParliamentGroupDetailRoutePage,
})

function ParliamentGroupDetailRoutePage() {
  const { groupId } = Route.useParams()
  return <ParliamentGroupDetailPage groupId={groupId} />
}
