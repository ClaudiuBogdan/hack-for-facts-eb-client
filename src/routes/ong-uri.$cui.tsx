import { createFileRoute, redirect } from '@tanstack/react-router'

/** An organisation's profile at its first release's Romanian path: a 301 to `/ngos/$cui`, the search carried over. */
export const Route = createFileRoute('/ong-uri/$cui')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/ngos/$cui',
      params,
      search,
      replace: true,
      statusCode: 301,
    })
  },
})
