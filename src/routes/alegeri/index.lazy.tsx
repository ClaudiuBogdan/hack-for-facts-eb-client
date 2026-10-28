import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { ElectionsCatalogPage } from '@/features/elections/catalog/elections-catalog-page'
import { electionsCatalogKeys, seedKeyOf } from '@/features/elections/lib/elections-catalog-keys'

export const Route = createLazyFileRoute('/alegeri/')({
  component: ElectionsCatalogRoutePage,
})

function ElectionsCatalogRoutePage() {
  const search = Route.useSearch()
  const { page, seedKey } = Route.useLoaderData()
  const navigate = useNavigate({ from: '/alegeri/' })
  // The server's page seeds the query only for the address it was read for.
  const initialPage = page && seedKey === seedKeyOf(electionsCatalogKeys.events(search)) ? page : undefined

  return (
    <ElectionsCatalogPage
      search={search}
      onSearchChange={(next) => void navigate({ search: next, resetScroll: false })}
      {...(initialPage ? { initialPage } : {})}
    />
  )
}
