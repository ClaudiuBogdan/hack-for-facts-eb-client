import { createFileRoute } from '@tanstack/react-router'
import { BugetLayout } from '@/features/campaigns/buget/components/layout/buget-layout'

export const Route = createFileRoute('/buget')({
  ssr: true,
  component: BugetLayout,
})
