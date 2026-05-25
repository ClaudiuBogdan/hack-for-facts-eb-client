import { createFileRoute, redirect } from '@tanstack/react-router'
import { ParliamentGroupsSearchSchema } from '@/schemas/parliament'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

export const Route = createFileRoute('/parlament/grupuri/')({
  validateSearch: ParliamentGroupsSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/parlament',
      search: {
        tab: 'grupuri',
        chamber: search.chamber,
        judet: search.judet,
        grup: search.grup,
        q: search.q,
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
