import { createFileRoute } from '@tanstack/react-router'
import { parseStatisticsLandingSearch } from '@/schemas/statistics'

export const Route = createFileRoute('/statistici/')({
  validateSearch: parseStatisticsLandingSearch,
})
