import { createFileRoute, redirect } from '@tanstack/react-router'
import { parseNgoServicesSearch } from '@/schemas/ngos'

/**
 * Social services at their first release's Romanian path: one 301 to
 * `/ngos/services`, the search already in the page's own shape so the target
 * has nothing left to rewrite (and the site's own keys, `lang`, kept).
 */
export const Route = createFileRoute('/ong-uri/servicii')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/ngos/services',
      search: { ...search, ...parseNgoServicesSearch(search) },
      replace: true,
      statusCode: 301,
    })
  },
})
