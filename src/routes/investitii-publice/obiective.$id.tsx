import { createFileRoute } from '@tanstack/react-router'
import { parseObjectiveSearch } from '@/schemas/public-investments'
import { PublicInvestmentsObjectivePage } from '@/features/public-investments/pages/PublicInvestmentsObjectivePage'

export const Route = createFileRoute('/investitii-publice/obiective/$id')({
  validateSearch: parseObjectiveSearch,
  component: ObjectiveRoute,
})

function ObjectiveRoute() {
  const params = Route.useParams()
  return (
    <PublicInvestmentsObjectivePage
      objectiveId={params.id}
      search={Route.useSearch()}
    />
  )
}
