import { createFileRoute, redirect } from '@tanstack/react-router'
import { analyticsRedirectSearch } from '@/features/procurement/lib/analytics-legacy'

/** The Romanian search path of the first release: the explorer's list, now the analytics page's records. */
export const Route = createFileRoute('/achizitii/cautare')({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: '/procurement/analytics',
      search: analyticsRedirectSearch({ ...(location.search as Record<string, unknown>), view: 'list' }),
      replace: true,
      statusCode: 301,
    })
  },
})
