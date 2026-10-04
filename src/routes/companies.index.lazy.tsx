import { createLazyFileRoute } from '@tanstack/react-router'
import { PrivateCompanyHubPage } from '@/features/private-companies/components/hub/private-company-hub-page'

export const Route = createLazyFileRoute('/companies/')({
  component: PrivateCompanyHubPage,
})
