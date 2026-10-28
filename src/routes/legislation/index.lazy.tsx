import { createLazyFileRoute } from '@tanstack/react-router'
import { LegislationPage } from '@/features/legal/components/legislation-page'

export const Route = createLazyFileRoute('/legislation/')({
  component: LegislationPage,
})
