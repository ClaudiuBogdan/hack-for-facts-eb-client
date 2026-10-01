import { createFileRoute, redirect } from '@tanstack/react-router'
import { categoryRedirectSearch } from '@/features/procurement/lib/analytics-legacy'

/** The Romanian alias of the old category page: straight to the analytics page, with the category as its filter (one hop, not two). */
export const Route = createFileRoute('/achizitii/cpv/$code')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/procurement/analytics',
      search: categoryRedirectSearch(search as Record<string, unknown>, params.code),
      replace: true,
      statusCode: 301,
    })
  },
})
