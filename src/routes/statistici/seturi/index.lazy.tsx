import { createLazyFileRoute } from '@tanstack/react-router'
import { StatisticsDatasetExplorerPage } from '@/features/statistics/pages/statistics-dataset-explorer-page'

export const Route = createLazyFileRoute('/statistici/seturi/')({
  component: StatisticsDatasetExplorerRoutePage,
})

function StatisticsDatasetExplorerRoutePage() {
  const search = Route.useSearch()

  return <StatisticsDatasetExplorerPage search={search} />
}
