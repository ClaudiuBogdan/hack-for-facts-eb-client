import { Outlet, createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

export const Route = createFileRoute('/procurement')({
  ssr: true,
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  component: () => <Outlet />,
})
