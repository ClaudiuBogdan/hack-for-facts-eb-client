import { createLazyFileRoute } from '@tanstack/react-router'
import { ElectionContestPage } from '@/features/elections/catalog/election-contest-page'

export const Route = createLazyFileRoute('/alegeri/contest/$contestKey')({
  component: ElectionContestRoutePage,
})

function ElectionContestRoutePage() {
  const { contestKey } = Route.useParams()
  const data = Route.useLoaderData()
  // The server's reads seed the page only for the contest they were read for.
  const same = data.contestKey === contestKey

  return (
    <ElectionContestPage
      key={contestKey}
      contestKey={contestKey}
      {...(same && data.contest ? { initialContest: data.contest } : {})}
      {...(same && data.contest && data.result !== undefined ? { initialResult: data.result } : {})}
      {...(same && data.event ? { initialEvent: data.event } : {})}
    />
  )
}
