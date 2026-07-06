import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { MemberSpeechesSearchSchema } from '@/schemas/parliament'

export const Route = createFileRoute('/parlament/membri/$memberId/interventii')({
  validateSearch: MemberSpeechesSearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
