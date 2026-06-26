import { createLazyFileRoute } from '@tanstack/react-router'
import { LegalLandingPage } from '@/features/legal/components/legal-landing-page'

export const Route = createLazyFileRoute('/legislatie/')({
  component: LegalLandingRoutePage,
})

function LegalLandingRoutePage() {
  return <LegalLandingPage />
}
