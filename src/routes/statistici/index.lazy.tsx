import { createLazyFileRoute } from '@tanstack/react-router'
import { StatisticsLandingPage } from '@/features/statistics/pages/statistics-landing-page'

export const Route = createLazyFileRoute('/statistici/')({
  component: StatisticsLandingPage,
})
