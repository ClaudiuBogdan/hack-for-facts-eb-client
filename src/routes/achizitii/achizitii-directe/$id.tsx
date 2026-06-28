import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/achizitii/achizitii-directe/$id')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/procurement/direct-acquisitions/$id',
      params: { id: params.id },
      search,
      replace: true,
      statusCode: 301,
    })
  },
})
