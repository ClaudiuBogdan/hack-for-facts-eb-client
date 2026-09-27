import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The Romanian path of the first release: the front door. A link carrying an
 * explorer choice goes on from there to `/procurement/search`.
 */
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
