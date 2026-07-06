import { createLazyFileRoute } from '@tanstack/react-router'
import { ParliamentCommitteeDetailPage } from '@/features/parliament/components/parliament-committee-detail-page'

export const Route = createLazyFileRoute('/parlament/comisii/$committeeKey')({
  component: ParliamentCommitteeDetailRoutePage,
})

function ParliamentCommitteeDetailRoutePage() {
  const { committeeKey } = Route.useParams()
  return <ParliamentCommitteeDetailPage committeeKey={committeeKey} />
}
