import { createFileRoute, redirect } from '@tanstack/react-router'

/** The Romanian path of the mock-era pages (removed 2026-10-07): the front door moved to `/justice`. */
export const Route = createFileRoute('/justitie/')({
  beforeLoad: () => {
    throw redirect({ to: '/justice', replace: true, statusCode: 301 })
  },
})
