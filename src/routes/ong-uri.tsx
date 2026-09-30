import { Outlet, createFileRoute } from '@tanstack/react-router'

/** The Romanian paths of the first release, each a 301 to its `/ngos` page. */
export const Route = createFileRoute('/ong-uri')({
  component: Outlet,
})
