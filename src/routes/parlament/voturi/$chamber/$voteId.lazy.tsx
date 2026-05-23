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

const groupColors = getParliamentGroupColorMap()
const memberJudete = getMemberJudetMap()

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

  return (
    <VoteDetailContent
      detail={detail}
      groupColors={groupColors}
      memberJudete={memberJudete}
    />
  )
}
