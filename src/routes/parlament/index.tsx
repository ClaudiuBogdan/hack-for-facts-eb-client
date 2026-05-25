import { createFileRoute, redirect } from '@tanstack/react-router'
import { ParliamentSearchSchema } from '@/schemas/parliament'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

export const Route = createFileRoute('/parlament/')({
  validateSearch: ParliamentSearchSchema,
  beforeLoad: ({ search }) => {
    if (search.tab === 'membri') {
      throw redirect({
        to: '/parlament',
        search: {
          ...search,
          tab: 'grupuri',
        },
        replace: true,
      })
    }
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
