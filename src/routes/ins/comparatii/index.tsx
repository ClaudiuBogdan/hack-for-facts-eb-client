import { createFileRoute } from '@tanstack/react-router'
import { parseStatisticsComparisonsSearch } from '@/schemas/statistics'

export const Route = createFileRoute('/ins/comparatii/')({
  validateSearch: parseStatisticsComparisonsSearch,
})
