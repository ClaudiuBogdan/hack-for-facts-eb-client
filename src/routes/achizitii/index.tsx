import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/achizitii/')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/procurement',
      search,
      replace: true,
      statusCode: 301,
    })
  },
})
