import { createLazyFileRoute } from '@tanstack/react-router'
import { NationalBudgetHomePage } from '@/features/national-budget/home/components/national-budget-home-page'

export const Route = createLazyFileRoute('/national-budget/')({
  component: NationalBudgetHomePage,
})
