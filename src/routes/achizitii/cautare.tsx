import { createFileRoute, redirect } from '@tanstack/react-router'

/** The Romanian search path of the first release: the explorer's list, now the analytics page's records. */
export const Route = createFileRoute('/achizitii/cautare')({
  beforeLoad: async ({ location, abortController }) => {
    // Imported when the link is redirected: it builds the old explorer's schema, which the route tree must not carry (docs/route-contracts.md).
    const { analyticsRedirectSearch } = await import('@/features/procurement/lib/analytics-legacy')
    // The reader went elsewhere while it downloaded: this navigation is over, and must not redirect.
    if (abortController.signal.aborted) return
    throw redirect({
      to: '/procurement/analytics',
      search: analyticsRedirectSearch({ ...(location.search as Record<string, unknown>), view: 'list' }),
      replace: true,
      statusCode: 301,
    })
  },
})
