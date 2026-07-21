import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  cleanProcurementHubSearch,
  parseProcurementHubSearch,
} from '@/schemas/procurement-hub'

/**
 * Legacy analytics path — redirects into the unified hub map view.
 * `/procurement/analytics?*` → `/procurement?view=map&*`
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
        view: 'map',
      }),
      replace: true,
    })
  },
})
