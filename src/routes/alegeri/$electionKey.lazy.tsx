import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { ElectionEditionPage } from '@/features/elections/catalog/election-edition-page'
import { electionsCatalogKeys, seedKeyOf } from '@/features/elections/lib/elections-catalog-keys'

export const Route = createLazyFileRoute('/alegeri/$electionKey')({
  component: ElectionEditionRoutePage,
})

function ElectionEditionRoutePage() {
  const { electionKey } = Route.useParams()
  const search = Route.useSearch()
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: '/alegeri/$electionKey' })
  // The server's reads seed the page only for the edition and the address they were read for.
  const sameEdition = data.electionKey === electionKey
  const contestsSeeded = sameEdition && data.contestsSeedKey === seedKeyOf(electionsCatalogKeys.contests(electionKey, search))

  return (
    <ElectionEditionPage
      // Another edition is another page: nothing carries over from this one.
      key={electionKey}
      electionKey={electionKey}
      search={search}
      onSearchChange={(next) => void navigate({ search: next, resetScroll: false })}
      {...(sameEdition && data.edition ? { initialEdition: data.edition } : {})}
      {...(contestsSeeded && data.contests ? { initialContests: data.contests } : {})}
    />
  )
}
