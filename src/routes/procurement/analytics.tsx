import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  cleanProcurementHubSearch,
  parseProcurementHubSearch,
} from '@/schemas/procurement-hub'

/**
 * Legacy analytics path — redirects into the unified hub Overview (buyer map
 * lives there). `/procurement/analytics?*` → `/procurement?*` (keeps mapGrain).
 */
export const Route = createFileRoute('/procurement/analytics')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>) =>
    parseProcurementHubSearch(search),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/procurement',
      search: cleanProcurementHubSearch({
        ...search,
        view: 'overview',
      }),
      replace: true,
    })
  },
})
