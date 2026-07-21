import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  cleanProcurementHubSearch,
  parseProcurementHubSearch,
} from '@/schemas/procurement-hub'

export const Route = createFileRoute('/achizitii/cautare')({
  validateSearch: (search: Record<string, unknown>) =>
    parseProcurementHubSearch(search),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/procurement',
      search: cleanProcurementHubSearch({
        ...search,
        view: 'list',
      }),
      replace: true,
      statusCode: 301,
    })
  },
})
