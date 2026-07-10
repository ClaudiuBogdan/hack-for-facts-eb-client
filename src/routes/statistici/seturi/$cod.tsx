import { createFileRoute } from '@tanstack/react-router'
import { parseStatisticsDatasetDetailSearch } from '@/schemas/statistics'

export const Route = createFileRoute('/statistici/seturi/$cod')({
  validateSearch: parseStatisticsDatasetDetailSearch,
})
