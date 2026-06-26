import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/justitie')({
  component: JusticeRouteShell,
})

function JusticeRouteShell() {
  return <Outlet />
}
