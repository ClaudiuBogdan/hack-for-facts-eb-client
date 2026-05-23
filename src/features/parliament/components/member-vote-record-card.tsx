import { Link } from '@tanstack/react-router'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { MemberVoteChoice } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  getMemberVoteChoiceLabel,
  formatVoteDivisionMeta,
  getVoteChoiceAccentColor,
} from '../lib/formatting'
import { memberDetailCareerCardClassName } from '../lib/member-detail-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

type Props = {
  readonly voteId: string
  readonly chamber: 'camera' | 'senat'
  readonly title: string
  readonly heldAt: string
  readonly choice: MemberVoteChoice
  readonly divisionNumber?: number
  readonly tally?: {
    readonly pentru: number
    readonly impotriva: number
  }
}

/** UK-style member voting record row */
export function MemberVoteRecordCard({
  voteId,
  chamber,
  title,
  heldAt,
  choice,
  divisionNumber,
  tally,
}: Props) {
  const Icon = choice === 'impotriva' ? ThumbsDown : ThumbsUp
  const accentColor = getVoteChoiceAccentColor(choice)

  return (
    <Link
      to="/parlament/voturi/$chamber/$voteId"
      params={{ chamber, voteId }}
      className={cn(
        memberDetailCareerCardClassName,
        'group block transition-colors hover:bg-[#f8f8f8] dark:hover:bg-[var(--pnrr-hover)]',
      )}
    >
      <div className="flex border-l-[5px]" style={{ borderLeftColor: accentColor }}>
        <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 border-r border-[#b1b4b6] px-3 py-5 dark:border-[var(--pnrr-border)]">
          <Icon className="h-5 w-5 text-[#505a5f]" strokeWidth={2} aria-hidden />
          <span className="text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {getMemberVoteChoiceLabel(choice)}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-base font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {title}
            </p>
            <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {divisionNumber
                ? formatVoteDivisionMeta({ heldAt }, divisionNumber)
                : new Intl.DateTimeFormat('ro-RO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }).format(new Date(heldAt))}
            </p>
          </div>

          {tally ? (
            <div className="hidden shrink-0 gap-6 sm:flex">
              <div>
                <p className="text-sm text-[#505a5f]">Pentru</p>
                <p className="text-2xl font-bold tabular-nums text-[#0b0c0c]">{tally.pentru}</p>
              </div>
              <div>
                <p className="text-sm text-[#505a5f]">Împotrivă</p>
                <p className="text-2xl font-bold tabular-nums text-[#0b0c0c]">{tally.impotriva}</p>
              </div>
            </div>
          ) : null}

          <ParliamentCardChevron className="mt-1 shrink-0" />
        </div>
      </div>
    </Link>
  )
}
