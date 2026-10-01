import { useState } from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import { NgoRegistryListPage } from '@/features/ngos/registry/components/registry-list-page'
import { siteKeys } from '@/features/ngos/registry/api'
import { searchOf } from '@/features/ngos/registry/model'

export const Route = createLazyFileRoute('/ngos/registry/')({
  component: RegistryRoutePage,
})

function RegistryRoutePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  // What the server read, for the address it rendered: kept for the page's life, used only while the page shows that selection.
  const [seed] = useState(Route.useLoaderData().seed)
  return (
    <NgoRegistryListPage
      search={search}
      seed={seed}
      // A change of question stays where the reader is: the page answers in place, it is not a new page.
      // The site's own keys (`lang`) stay: only the question changes.
      onSearch={(query) => void navigate({ search: (previous) => ({ ...siteKeys(previous), ...searchOf(query) }), resetScroll: false })}
    />
  )
}
