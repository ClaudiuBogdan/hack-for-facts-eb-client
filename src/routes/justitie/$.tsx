import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Every deeper path of the mock-era pages (`/justitie/cautare`,
 * `/justitie/dosare/$caseId`, `/justitie/instante/$courtId`): their ids were
 * the fixtures', not the portal's, so none maps to a real court or case. They
 * go to the front door, carrying nothing — an old search could hold a typed
 * name.
 */
export const Route = createFileRoute('/justitie/$')({
  beforeLoad: () => {
    throw redirect({ to: '/justice', replace: true, statusCode: 301 })
  },
})
