import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/entities/')({
  beforeLoad: () => {
    throw redirect({
      to: '/entity-analytics',
      replace: true,
    })
  },
})
