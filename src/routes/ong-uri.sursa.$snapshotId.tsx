import { createFileRoute, redirect } from '@tanstack/react-router'

/** A source snapshot at its first release's Romanian path: a 301 to `/ngos/sources/$snapshotId`, the search carried over. */
export const Route = createFileRoute('/ong-uri/sursa/$snapshotId')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/ngos/sources/$snapshotId',
      params,
      search,
      replace: true,
      statusCode: 301,
    })
  },
})
