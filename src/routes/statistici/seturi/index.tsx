import { createFileRoute } from '@tanstack/react-router'
import { statisticsContextTreeQueryOptions } from '@/features/statistics/hooks/use-statistics'
import { parseStatisticsDatasetExplorerSearch } from '@/schemas/statistics'

export const Route = createFileRoute('/statistici/seturi/')({
  validateSearch: parseStatisticsDatasetExplorerSearch,
  /**
   * The INS domain tree seeds the rail and names the active theme chip, so a
   * shared link renders both on the first paint instead of flashing a bare
   * context code. Prefetched rather than awaited: the list does not depend on
   * it, and a slow or failing context read must not hold the page back — the
   * rail falls back to the eight known domains either way.
   */
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(statisticsContextTreeQueryOptions())
  },
})
