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
  // The server's reads seed the page only for the event and the address they were read for.
  const sameEvent = data.electionKey === electionKey
  const contests = data.contests
  const contestsSeeded = sameEvent && contests !== undefined && contests.seedKey === seedKeyOf(electionsCatalogKeys.contests(contests.occurrenceKey, search))

  return (
    <ElectionEditionPage
      // Another event is another page: nothing carries over from this one.
      key={electionKey}
      electionKey={electionKey}
      search={search}
      onSearchChange={(next) => void navigate({ search: next, resetScroll: false })}
      {...(sameEvent && data.event ? { initialEvent: data.event } : {})}
      {...(contestsSeeded ? { initialContests: { occurrenceKey: contests.occurrenceKey, page: contests.page } } : {})}
    />
  )
}
