import { createLazyFileRoute } from '@tanstack/react-router'
import { ProcurementLandingPage } from '@/features/procurement/components/procurement-landing-page'

export const Route = createLazyFileRoute('/achizitii/')({
  component: ProcurementLandingPage,
})
