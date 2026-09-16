import { createLazyFileRoute } from '@tanstack/react-router'
import { LandingPage } from '@/features/landing/components/landing-page'

export const Route = createLazyFileRoute('/')({
  component: LandingPage,
})
