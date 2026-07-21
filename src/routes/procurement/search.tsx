import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  cleanProcurementHubSearch,
  parseProcurementHubSearch,
} from '@/schemas/procurement-hub'

/**
 * Legacy search path — redirects into the unified hub list view (F2).
 * `/procurement/search?*` → `/procurement?view=list&*`
 */
export const Route = createFileRoute('/procurement/search')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>) =>
    parseProcurementHubSearch(search),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/procurement',
      search: cleanProcurementHubSearch({
        ...search,
        view: 'list',
      }),
      replace: true,
    })
  },
})
