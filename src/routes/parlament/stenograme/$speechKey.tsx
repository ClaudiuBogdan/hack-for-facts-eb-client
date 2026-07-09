import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

export const Route = createFileRoute('/parlament/stenograme/$speechKey')({
  // Shareable speech URL — the one parliament route with a static head title.
  head: () => ({
    meta: [{ title: 'Stenogramă | Parlamentul României | Transparența.eu' }],
  }),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
