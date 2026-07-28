import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

/**
 * The page number lives in the URL, per the app's shareable-state contract —
 * a reader who links page 7 of the orders of business must land on page 7.
 */
const AgendaSearchSchema = z.object({
  pagina: z.coerce.number().int().min(1).catch(1),
})

export type ParliamentAgendaSearch = z.infer<typeof AgendaSearchSchema>

export const Route = createFileRoute('/parlament/agenda/')({
  validateSearch: (search: Record<string, unknown>): ParliamentAgendaSearch =>
    AgendaSearchSchema.parse(search),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
})
