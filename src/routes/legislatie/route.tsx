import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/legislatie')({
  component: LegislatieLayout,
})

function LegislatieLayout() {
  return <Outlet />
}
