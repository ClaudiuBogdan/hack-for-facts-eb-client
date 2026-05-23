import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentVotes } from '../hooks/use-parliament-data'
import {
  parliamentVotesOverviewGridClassName,
  parliamentVotesSurfaceClassName,
} from '../lib/hub-theme'
import { cn } from '@/lib/utils'
import { VotesChamberPanel } from './votes-chamber-panel'

/** UK Parliament two-column votes overview */
export function VotesOverviewLayout() {
  const { data: cameraData, isLoading: cameraLoading } = useParliamentVotes({
    chamber: 'camera',
    page: 1,
    pageSize: 4,
  })
  const { data: senatData, isLoading: senatLoading } = useParliamentVotes({
    chamber: 'senat',
    page: 1,
    pageSize: 4,
  })

  if (cameraLoading || senatLoading) {
    return (
      <div
        className={cn(
          parliamentVotesSurfaceClassName,
          parliamentVotesOverviewGridClassName,
        )}
      >
        <Skeleton className="h-[42rem] w-full rounded-none bg-white/60" />
        <Skeleton className="h-[42rem] w-full rounded-none bg-white/60" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        parliamentVotesSurfaceClassName,
        parliamentVotesOverviewGridClassName,
      )}
    >
      <VotesChamberPanel chamber="camera" votes={cameraData?.votes ?? []} />
      <VotesChamberPanel chamber="senat" votes={senatData?.votes ?? []} />
    </div>
  )
}
