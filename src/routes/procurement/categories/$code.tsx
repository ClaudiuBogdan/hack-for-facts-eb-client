import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { categoryRedirectSearch } from '@/features/procurement/lib/analytics-legacy'

/**
 * `/procurement/categories/$code` was the CPV category page. The analytics
 * page answers a category's questions now — its sub-categories, its
 * institutions and firms, its places, its years, its records — at every CPV
 * level (design.md §19): a link here is redirected there with the category
 * as its filter, the site's own keys (`lang`) kept.
 */
export const Route = createFileRoute('/procurement/categories/$code')({
  params: {
    parse: (params) => {
      if (!/^\d{2,8}$/u.test(params.code)) throw notFound()
      return { code: params.code }
    },
  },
  beforeLoad: ({ params, location }) => {
    throw redirect({
      to: '/procurement/analytics',
      search: categoryRedirectSearch(location.search as Record<string, unknown>, params.code),
      replace: true,
      statusCode: 301,
    })
  },
})
