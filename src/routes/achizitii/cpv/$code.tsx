import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { categoryRedirectSearch, cpvCodeParam } from '@/features/procurement/lib/analytics-legacy'

/** The Romanian alias of the old category page: straight to the analytics page, with the category as its filter (one hop, not two); no CPV code, no page. */
export const Route = createFileRoute('/achizitii/cpv/$code')({
  params: {
    parse: (params) => {
      const code = cpvCodeParam(params.code)
      if (code === null) throw notFound()
      return { code }
    },
  },
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/procurement/analytics',
      search: categoryRedirectSearch(search as Record<string, unknown>, params.code),
      replace: true,
      statusCode: 301,
    })
  },
})
