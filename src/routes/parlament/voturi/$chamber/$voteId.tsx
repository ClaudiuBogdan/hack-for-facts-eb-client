import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

const VoteDetailParamsSchema = z.object({
  chamber: z.enum(['camera', 'senat']),
  voteId: z.string(),
})

export const Route = createFileRoute('/parlament/voturi/$chamber/$voteId')({
  params: {
    parse: (params) => VoteDetailParamsSchema.parse(params),
  },
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
