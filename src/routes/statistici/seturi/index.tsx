import { createFileRoute } from '@tanstack/react-router'
import { parseStatisticsDatasetExplorerSearch } from '@/schemas/statistics'

export const Route = createFileRoute('/statistici/seturi/')({
  validateSearch: parseStatisticsDatasetExplorerSearch,
})
