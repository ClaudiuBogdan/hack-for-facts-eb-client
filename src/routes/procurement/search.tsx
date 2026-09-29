import { createFileRoute, redirect } from '@tanstack/react-router'
import { analyticsRedirectSearch } from '@/features/procurement/lib/analytics-legacy'

/**
 * `/procurement/search` was the explorer (the overview with the buyer map,
 * the record list, the rankings). `/procurement/analytics` answers its
 * questions now: a link here is redirected there with what it asked, in the
 * analytics page's words (see `analytics-legacy.ts`).
 */
export const Route = createFileRoute('/procurement/search')({
  beforeLoad: ({ location }) => {
    throw redirect({ to: '/procurement/analytics', search: analyticsRedirectSearch(location.search as Record<string, unknown>), replace: true, statusCode: 301 })
  },
})
