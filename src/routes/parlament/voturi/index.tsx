import { createFileRoute, redirect } from '@tanstack/react-router'
import { ParliamentVotesSearchSchema } from '@/schemas/parliament'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

export const Route = createFileRoute('/parlament/voturi/')({
  validateSearch: ParliamentVotesSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/parlament',
      search: {
        tab: 'voturi',
        chamber: search.chamber,
        from: search.from,
        to: search.to,
        q: search.q,
        grup: search.grup,
        outcome: search.outcome,
        page: search.page,
        pageSize: search.pageSize,
      },
      replace: true,
    })
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
