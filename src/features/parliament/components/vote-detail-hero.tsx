import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { ParliamentVoteDetail } from '@/schemas/parliament'
import { formatVoteDivisionMeta } from '../lib/formatting'
import { cn } from '@/lib/utils'
import { getVoteDetailHeroColor, voteDetailPageContainerClassName } from '../lib/vote-detail-theme'

type Props = {
  readonly detail: ParliamentVoteDetail
}

/** UK Parliament division hero — title, meta, tallies */
export function VoteDetailHero({ detail }: Props) {
  const heroColor = getVoteDetailHeroColor(detail.chamber)

  return (
    <section className="py-8 text-white" style={{ backgroundColor: heroColor }}>
      <div
        className={cn(
          voteDetailPageContainerClassName,
          'grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start',
        )}
      >
        <div>
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-[2rem]">
            {detail.title}
          </h1>
          <p className="mt-3 text-base text-white/90">
            {formatVoteDivisionMeta(detail, detail.divisionNumber)}
          </p>
        </div>

        <div className="min-w-[14rem]">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-8 w-8 shrink-0" strokeWidth={2.25} aria-hidden />
                <span className="text-4xl font-bold tabular-nums">{detail.tally.pentru}</span>
              </div>
              <p className="mt-1 text-sm text-white/90">Pentru</p>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <ThumbsDown className="h-8 w-8 shrink-0" strokeWidth={2.25} aria-hidden />
                <span className="text-4xl font-bold tabular-nums">{detail.tally.impotriva}</span>
              </div>
              <p className="mt-1 text-sm text-white/90">Împotrivă</p>
            </div>
          </div>
          <p className="mt-4 text-sm italic text-white/90">{detail.outcomeLabel}</p>
        </div>
      </div>
    </section>
  )
}
