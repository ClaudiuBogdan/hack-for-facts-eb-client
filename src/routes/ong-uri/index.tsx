import { createFileRoute, redirect } from '@tanstack/react-router'

/** The hub at its first release's Romanian path: a 301 to `/ngos`, the search carried over. */
export const Route = createFileRoute('/ong-uri/')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/ngos',
      search,
      replace: true,
      statusCode: 301,
    })
  },
})
