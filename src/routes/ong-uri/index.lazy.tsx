import { createLazyFileRoute } from '@tanstack/react-router'
import { isNgoRegistryEnabled } from '@/config/env'
import { NgoHubPage } from '@/features/ngos/hub/ngo-hub-page'

export const Route = createLazyFileRoute('/ong-uri/')({
  component: NgoHubRoutePage,
})

function NgoHubRoutePage() {
  const { summary } = Route.useLoaderData()
  return <NgoHubPage summary={summary} search={Route.useSearch()} registry={isNgoRegistryEnabled()} />
}
