import { Link } from '@tanstack/react-router'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { ParliamentVoteSummary } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  formatVoteDivisionMeta,
  getOutcomeLabel,
  getVoteOutcomeAccentColor,
} from '../lib/formatting'
import {
  parliamentVoteCardClassName,
  parliamentVoteCardDividerClassName,
} from '../lib/hub-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

type Props = {
  readonly vote: ParliamentVoteSummary
  readonly divisionNumber: number
  readonly className?: string
}

type TallyColumnProps = {
  readonly label: string
  readonly count: number
  readonly icon: 'up' | 'down'
  readonly className?: string
}

/** Single pentru / împotrivă column — UK Parliament division grid cell */
function VoteTallyColumn({ label, count, icon, className }: TallyColumnProps) {
  const Icon = icon === 'up' ? ThumbsUp : ThumbsDown

  return (
    <div className={cn('flex min-h-[4.75rem] flex-col justify-center py-3.5 sm:py-4', className)}>
      <p className="text-sm leading-none text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        {label}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <span className="text-[1.75rem] font-bold leading-none tabular-nums text-[#0b0c0c] dark:text-[var(--pnrr-fg)] sm:text-[2rem]">
          {count}
        </span>
        <Icon
          className="h-[1.125rem] w-[1.125rem] shrink-0 text-[#b1b4b6] dark:text-[var(--pnrr-muted)]"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
    </div>
  )
}

/** UK Parliament division card — border color reflects vote outcome */
export function VoteChamberVoteCard({ vote, divisionNumber, className }: Props) {
  const accentColor = getVoteOutcomeAccentColor(vote.outcome)
  const outcomeLabel = getOutcomeLabel(vote.outcome)

  return (
    <Link
      to="/parlament/voturi/$chamber/$voteId"
      params={{ chamber: vote.chamber, voteId: vote.voteId }}
      className={cn(parliamentVoteCardClassName, className)}
      aria-label={`${vote.title} — ${outcomeLabel}`}
    >
      <span
        className="w-[5px] shrink-0 self-stretch"
        style={{ backgroundColor: accentColor }}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'flex min-h-[3.5rem] items-center gap-3 border-b px-4 py-3.5 sm:px-5 sm:py-4',
            parliamentVoteCardDividerClassName,
          )}
        >
          <h3 className="min-w-0 flex-1 text-base font-bold leading-snug text-[#0b0c0c] group-hover:underline sm:text-lg dark:text-[var(--pnrr-fg)]">
            {vote.title}
          </h3>
          <ParliamentCardChevron className="shrink-0 text-[#505a5f] dark:text-[var(--pnrr-muted)]" />
        </div>

        <div
          className={cn(
            'grid grid-cols-2 divide-x',
            parliamentVoteCardDividerClassName,
          )}
        >
          <VoteTallyColumn
            label="Pentru"
            count={vote.tally.pentru}
            icon="up"
            className="px-4 sm:px-5"
          />
          <VoteTallyColumn
            label="Împotrivă"
            count={vote.tally.impotriva}
            icon="down"
            className="px-4 sm:px-5"
          />
        </div>

        <p
          className={cn(
            'border-t px-4 py-2.5 text-sm leading-5 text-[#505a5f] sm:px-5 sm:py-3 dark:text-[var(--pnrr-muted)]',
            parliamentVoteCardDividerClassName,
          )}
        >
          {formatVoteDivisionMeta(vote, divisionNumber)}
        </p>
      </div>
    </Link>
  )
}
