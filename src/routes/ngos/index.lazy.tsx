import { createLazyFileRoute } from '@tanstack/react-router'
import { isNgoRegistryEnabled } from '@/config/env'
import { NGO_FINANCE_SUMMARY } from '@/features/ngos/hub/finance-summary'
import { NgoHubPage } from '@/features/ngos/hub/ngo-hub-page'
import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'

export const Route = createLazyFileRoute('/ngos/')({
  component: NgoHubRoutePage,
})

function NgoHubRoutePage() {
  return <NgoHubPage summary={NGO_REGISTRY_SUMMARY} finance={NGO_FINANCE_SUMMARY} search={Route.useSearch()} registry={isNgoRegistryEnabled()} />
}
