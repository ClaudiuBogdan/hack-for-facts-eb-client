import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/achizitii/cpv/$code')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/procurement/categories/$code',
      params: { code: params.code },
      search,
      replace: true,
      statusCode: 301,
    })
  },
})
