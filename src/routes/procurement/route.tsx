import { DA_DISCLOSURE_CACHE } from '@/features/procurement/lib/disclosure-cache'
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

export const Route = createFileRoute('/procurement')({
  ssr: true,
  headers: () =>
    // D6: the section's pages show direct-purchase suppliers; none is served stale across a publish (`disclosure-cache.ts`).
    createPublicPageCacheHeaders({ sharedMaxAgeSeconds: 300, staleWhileRevalidateSeconds: DA_DISCLOSURE_CACHE.staleWhileRevalidateSeconds }),
  component: () => <Outlet />,
})
