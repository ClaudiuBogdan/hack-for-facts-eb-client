import { createFileRoute } from '@tanstack/react-router'
import { parseStatisticsComparisonsSearch } from '@/schemas/statistics'

export const Route = createFileRoute('/statistici/comparatii/')({
  validateSearch: parseStatisticsComparisonsSearch,
})
