import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/parlament/proiecte/')({
  beforeLoad: () => {
    throw redirect({
      to: '/parlament',
      search: { tab: 'proiecte' },
      replace: true,
    })
  },
})
