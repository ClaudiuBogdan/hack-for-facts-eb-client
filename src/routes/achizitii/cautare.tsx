import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  cleanProcurementSearch,
  parseProcurementSearch,
} from '@/schemas/procurement-search'

export const Route = createFileRoute('/achizitii/cautare')({
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = parseProcurementSearch(search)
    return cleanProcurementSearch(parsed)
  },
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/procurement/search',
      search,
      replace: true,
      statusCode: 301,
    })
  },
})
