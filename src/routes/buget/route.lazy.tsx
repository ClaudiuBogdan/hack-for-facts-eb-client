import { createLazyFileRoute } from '@tanstack/react-router'
import { BugetLayout } from '@/features/campaigns/buget/components/layout/buget-layout'

export const Route = createLazyFileRoute('/buget')({
  component: BugetLayout,
})
