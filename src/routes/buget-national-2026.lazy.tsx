import { createLazyFileRoute } from '@tanstack/react-router'
import { Budget2026Page } from '@/features/budget-2026/components/budget-2026-page'

export const Route = createLazyFileRoute('/buget-national-2026')({
  component: BugetNational2026RoutePage,
})

function BugetNational2026RoutePage() {
  return <Budget2026Page />
}
