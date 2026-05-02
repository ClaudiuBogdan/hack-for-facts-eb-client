import { createLazyFileRoute } from '@tanstack/react-router'
import { PnrrDashboard } from '@/features/pnrr/components/PnrrDashboard'

export const Route = createLazyFileRoute('/pnrr')({
  component: PnrrRoutePage,
})

function PnrrRoutePage() {
  return <PnrrDashboard />
}
