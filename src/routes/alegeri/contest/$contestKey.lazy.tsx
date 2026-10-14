import { createLazyFileRoute } from '@tanstack/react-router'
import { ElectionContestPage } from '@/features/elections/catalog/election-contest-page'

export const Route = createLazyFileRoute('/alegeri/contest/$contestKey')({
  component: ElectionContestRoutePage,
})

function ElectionContestRoutePage() {
  const { contestKey } = Route.useParams()
  const data = Route.useLoaderData()

  return (
    <ElectionContestPage
      key={contestKey}
      contestKey={contestKey}
      // The server's read seeds the page only for the contest it was read for.
      {...(data.contestKey === contestKey && data.contest ? { initialContest: data.contest } : {})}
    />
  )
}
