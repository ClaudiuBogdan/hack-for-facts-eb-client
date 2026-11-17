import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `/procurement/search` was the explorer (the overview with the buyer map,
 * the record list, the rankings). `/procurement/analytics` answers its
 * questions now: a link here is redirected there with what it asked, in the
 * analytics page's words (see `analytics-legacy.ts`).
 */
export const Route = createFileRoute('/procurement/search')({
  beforeLoad: async ({ location, abortController }) => {
    // Imported when the link is redirected: it builds the old explorer's schema, which the route tree must not carry (docs/route-contracts.md).
    const { analyticsRedirectSearch } = await import('@/features/procurement/lib/analytics-legacy')
    // The reader went elsewhere while it downloaded: this navigation is over, and must not redirect.
    if (abortController.signal.aborted) return
    throw redirect({ to: '/procurement/analytics', search: analyticsRedirectSearch(location.search as Record<string, unknown>), replace: true, statusCode: 301 })
  },
})
