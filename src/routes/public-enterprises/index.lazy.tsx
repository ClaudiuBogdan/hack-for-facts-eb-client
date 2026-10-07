import { createLazyFileRoute } from '@tanstack/react-router'
import { PublicEnterpriseHubPage } from '@/features/public-enterprises/components/hub/public-enterprise-hub-page'
import { PUBLIC_ENTERPRISE_HUB_SNAPSHOT } from '@/features/public-enterprises/lib/hub-snapshot'

export const Route = createLazyFileRoute('/public-enterprises/')({
  component: PublicEnterpriseHubRoutePage,
})

function PublicEnterpriseHubRoutePage() {
  return <PublicEnterpriseHubPage snapshot={PUBLIC_ENTERPRISE_HUB_SNAPSHOT} search={Route.useSearch()} />
}
