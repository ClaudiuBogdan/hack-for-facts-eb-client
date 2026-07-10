import { createLazyFileRoute } from '@tanstack/react-router'
import { StatisticsComparisonsPage } from '@/features/statistics/pages/statistics-comparisons-page'

export const Route = createLazyFileRoute('/statistici/comparatii/')({
  component: StatisticsComparisonsPage,
})
