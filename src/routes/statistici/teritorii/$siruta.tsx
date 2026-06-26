import { createFileRoute } from '@tanstack/react-router'
import { parseStatisticsTerritoryHubSearch } from '@/schemas/statistics'

export const Route = createFileRoute('/statistici/teritorii/$siruta')({
  validateSearch: parseStatisticsTerritoryHubSearch,
})
