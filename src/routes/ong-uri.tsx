import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/ong-uri')({
  component: Outlet,
})
