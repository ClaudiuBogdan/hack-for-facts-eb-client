import { createFileRoute, redirect } from '@tanstack/react-router'
import { searchOfActsDirectory } from '@/features/legal/lib/search-filters'

/**
 * The retired Acte page (owner, 27 November 2026): its one job, listing acts by filter, is now the search's when
 * filters are set and no term is typed. Its links forward for good, their filters read as the search's keys
 * (`searchOfActsDirectory`), so shared links and the server's tool links keep working.
 */
export const Route = createFileRoute('/legislation/acts/')({
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/legislation/search', search: searchOfActsDirectory(search as Record<string, unknown>) as never, replace: true, statusCode: 301 })
  },
})
