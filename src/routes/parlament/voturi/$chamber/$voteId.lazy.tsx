import { createLazyFileRoute } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getMemberJudetMap,
  getParliamentGroupColorMap,
} from '@/features/parliament/api/parliament-api'
import { VoteDetailContent } from '@/features/parliament/components/vote-detail-content'
import { ParliamentVoteNotFoundPage } from '@/features/parliament/components/parliament-not-found-page'
import { useParliamentVoteDetail } from '@/features/parliament/hooks/use-parliament-data'
import { VOTE_DETAIL_SURFACE, voteDetailPageContainerClassName } from '@/features/parliament/lib/vote-detail-theme'

export const Route = createLazyFileRoute('/parlament/voturi/$chamber/$voteId')({
  component: ParliamentVoteDetailRoutePage,
})

// Group colours are a derive-on-access Proxy (safe to read at module scope).
const groupColors = getParliamentGroupColorMap()

function ParliamentVoteDetailRoutePage() {
  const { chamber, voteId } = Route.useParams()
  const { data: detail, isLoading } = useParliamentVoteDetail(chamber, voteId)

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: VOTE_DETAIL_SURFACE }}>
        <div className={voteDetailPageContainerClassName}>
          <Skeleton className="mt-6 h-64 rounded-none" />
        </div>
      </div>
    )
  }

  if (!detail) {
    return <ParliamentVoteNotFoundPage chamber={chamber} voteId={voteId} />
  }

  // Read AFTER the vote detail resolves — the member→județ map is primed from
  // this vote's ballots during the fetch, so a module-scope snapshot would be
  // empty. (Group colours are a Proxy and don't need this.)
  const memberJudete = getMemberJudetMap()

  return (
    <VoteDetailContent
      detail={detail}
      groupColors={groupColors}
      memberJudete={memberJudete}
    />
  )
}
