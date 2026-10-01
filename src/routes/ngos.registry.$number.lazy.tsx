import { createLazyFileRoute } from '@tanstack/react-router'
import type { NgoStatementsRead } from '@/features/ngos/organization/api'
import { NgoOrganizationPage } from '@/features/ngos/organization/components/ngo-organization-page'
import {
  NgoProfileUnavailable,
  NgoRegistryProfileChoice,
  NgoRegistryProfileNotFound,
} from '@/features/ngos/organization/components/profile-fallbacks'

export const Route = createLazyFileRoute('/ngos/registry/$number')({
  component: NgoRegistryProfileRoutePage,
  notFoundComponent: NgoRegistryProfileNotFound,
  errorComponent: NgoProfileUnavailable,
})

/** Statements are read by CUI: a profile drawn here has none to read, which the page says once. */
const NO_STATEMENTS: NgoStatementsRead = { status: 'ready', statements: [] }

function NgoRegistryProfileRoutePage() {
  const { registryNumber, read } = Route.useLoaderData()
  if (read.status === 'ambiguous') return <NgoRegistryProfileChoice registryNumber={registryNumber} candidates={read.candidates} />
  return (
    <NgoOrganizationPage
      organization={read.organization}
      statementsRead={NO_STATEMENTS}
      year={undefined}
      onYear={() => undefined}
      onRetry={() => undefined}
    />
  )
}
