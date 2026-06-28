import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/achizitii/proceduri/$id')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/procurement/procedures/$id',
      params: { id: params.id },
      search,
      replace: true,
      statusCode: 301,
    })
  },
})
