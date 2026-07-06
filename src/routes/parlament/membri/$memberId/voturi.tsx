import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { MemberVotesSearchSchema } from '@/schemas/parliament'

export const Route = createFileRoute('/parlament/membri/$memberId/voturi')({
  validateSearch: MemberVotesSearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
