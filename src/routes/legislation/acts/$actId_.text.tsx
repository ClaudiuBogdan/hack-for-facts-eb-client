import { createFileRoute, redirect } from '@tanstack/react-router'
import { legalReaderSearchSchema } from '@/schemas/legal'

/**
 * The old standalone reader route. The text now lives ON the act page
 * (user decision 2026-08-10) — this route survives only so shipped
 * `/acts/:id/text?doc=&nod=` links keep resolving, redirecting with their
 * search intact.
 */
export const Route = createFileRoute('/legislation/acts/$actId_/text')({
  validateSearch: legalReaderSearchSchema,
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/legislation/acts/$actId',
      params: { actId: params.actId },
      search,
      replace: true,
      // This route exists ONLY for legacy links — say so to crawlers.
      statusCode: 301,
    })
  },
})
