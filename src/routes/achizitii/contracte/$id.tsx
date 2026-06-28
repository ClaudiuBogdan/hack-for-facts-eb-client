import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/achizitii/contracte/$id')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/procurement/contracts/$id',
      params: { id: params.id },
      search,
      replace: true,
      statusCode: 301,
    })
  },
})
