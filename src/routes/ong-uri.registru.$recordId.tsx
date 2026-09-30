import { createFileRoute, redirect } from '@tanstack/react-router'

/** A registry entry at its first release's Romanian path: a 301 to `/ngos/registry/$recordId`, the search carried over. */
export const Route = createFileRoute('/ong-uri/registru/$recordId')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/ngos/registry/$recordId',
      params,
      search,
      replace: true,
      statusCode: 301,
    })
  },
})
