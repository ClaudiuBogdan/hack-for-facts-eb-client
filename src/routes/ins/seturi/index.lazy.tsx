import { createLazyFileRoute } from '@tanstack/react-router'
import { explorerPageKey } from '@/features/statistics/hooks/use-dataset-explorer'
import { StatisticsDatasetExplorerPage } from '@/features/statistics/pages/statistics-dataset-explorer-page'

export const Route = createLazyFileRoute('/ins/seturi/')({
  component: StatisticsDatasetExplorerRoutePage,
})

function StatisticsDatasetExplorerRoutePage() {
  const search = Route.useSearch()
  const { page, pageKey } = Route.useLoaderData()
  // The server's page seeds the query only for the address it was read for.
  const initialPage = page && pageKey === explorerPageKey(search) ? page : undefined

  return <StatisticsDatasetExplorerPage search={search} {...(initialPage ? { initialPage } : {})} />
}
