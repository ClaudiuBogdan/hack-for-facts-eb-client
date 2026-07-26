import { createFileRoute } from '@tanstack/react-router'
import { ParliamentStenogramReaderSearchSchema } from '@/schemas/parliament'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

/**
 * One sitting, read as a document. Flat route file (`sedinte.$sessionKey`) so
 * `sedinte` never becomes a bare route of its own — `/parlament/stenograme` is
 * already the list, and a second empty index for it would be a dead end.
 *
 * A canonical transcript changes only when its capture is re-parsed, so it
 * caches like the other public parliament pages.
 */
export const Route = createFileRoute('/parlament/stenograme/sedinte/$sessionKey')({
  validateSearch: ParliamentStenogramReaderSearchSchema,
  head: () => ({
    meta: [
      {
        title: 'Stenograma ședinței | Parlamentul României | Transparența.eu',
      },
    ],
  }),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
