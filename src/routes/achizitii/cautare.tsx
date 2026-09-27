import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  cleanProcurementHubSearch,
  parseProcurementHubSearch,
} from '@/schemas/procurement-hub'

/** The Romanian search path of the first release: the explorer's list. */
export const Route = createFileRoute('/achizitii/cautare')({
  validateSearch: (search: Record<string, unknown>) =>
    parseProcurementHubSearch(search),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/procurement/search',
      search: cleanProcurementHubSearch({
        ...search,
        view: 'list',
      }),
      replace: true,
      statusCode: 301,
    })
  },
})
