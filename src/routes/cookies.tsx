import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { sanitizeRedirect } from '@/features/privacy/lib/safe-redirect'

/**
 * `redirect` is where the reader came from. Anything that is not a
 * same-origin path is dropped here, so the page and its return navigation
 * only ever see a value the router can follow.
 */
const searchSchema = z.object({
  redirect: z.unknown().optional().transform(sanitizeRedirect),
})

export const Route = createFileRoute('/cookies')({
  validateSearch: searchSchema,
  staticData: {
    title: 'Cookie Settings',
  },
})
