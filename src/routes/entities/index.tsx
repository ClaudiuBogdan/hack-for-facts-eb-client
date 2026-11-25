import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/entities/')({
  beforeLoad: () => {
    throw redirect({
      to: '/public-institutions',
      replace: true,
    })
  },
})
