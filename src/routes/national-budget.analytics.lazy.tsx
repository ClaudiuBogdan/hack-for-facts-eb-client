import { createLazyFileRoute } from '@tanstack/react-router'
import { NationalBudgetAnalyticsPage } from '@/features/national-budget/analytics/components/national-budget-analytics-page'

export const Route = createLazyFileRoute('/national-budget/analytics')({
  component: NationalBudgetAnalyticsPage,
})
