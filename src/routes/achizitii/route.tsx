import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/achizitii')({
  component: () => <Outlet />,
})
