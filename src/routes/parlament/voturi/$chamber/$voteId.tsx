import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  parseVoteDetailSearch,
  type VoteDetailSearch,
} from '@/features/parliament/lib/vote-detail-search'

const VoteDetailParamsSchema = z.object({
  chamber: z.enum(['camera', 'senat']),
  voteId: z.string(),
})

export const Route = createFileRoute('/parlament/voturi/$chamber/$voteId')({
  params: {
    parse: (params) => VoteDetailParamsSchema.parse(params),
  },
  // Which positions are on screen is shareable state, so it lives in the URL and
  // is validated on the server side of the render — the tab a link names is the
  // tab the first paint shows, with no client-side correction step.
  validateSearch: (search: Record<string, unknown>): VoteDetailSearch =>
    parseVoteDetailSearch(search),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
