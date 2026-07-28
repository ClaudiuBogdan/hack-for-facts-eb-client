import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  parseBillStagesSearch,
  type BillStagesSearch,
} from '@/features/parliament/lib/bill-stages-view'

export const Route = createFileRoute('/parlament/proiecte/$billId/etape')({
  // Which reading of the procedure is on screen is shareable state, so it lives
  // in the URL. The parse is tolerant: a hand-edited param falls back to the
  // default rather than throwing the page away.
  validateSearch: (search: Record<string, unknown>): BillStagesSearch =>
    parseBillStagesSearch(search),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
