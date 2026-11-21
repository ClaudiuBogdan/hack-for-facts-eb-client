import { Link } from '@tanstack/react-router'
import { AlertTriangle, CircleHelp, ThumbsDown, ThumbsUp } from 'lucide-react'
import type {
  MemberVoteChoice,
  ParliamentVotePositionStatus,
} from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  getMemberVoteChoiceLabel,
  formatVoteDayLong,
  formatVoteDivisionMeta,
} from '../lib/formatting'
import {
  MEMBER_VOTE_CHOICE_MARK_COLORS,
  MEMBER_VOTE_CONFLICT_MARK_COLOR,
  MEMBER_VOTE_UNKNOWN_MARK_COLOR,
  memberDetailCareerCardClassName,
} from '../lib/member-detail-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

type Props = {
  readonly voteId: string
  readonly chamber: 'camera' | 'senat'
  readonly title: string
  readonly heldAt: string
  readonly choice?: MemberVoteChoice
  readonly positionStatus: ParliamentVotePositionStatus
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
  positionStatus,
  divisionNumber,
  tally,
}: Props) {
  const isConflict = positionStatus === 'conflicting_choice'
  const isUnknown =
    positionStatus === 'unknown_marker' ||
    positionStatus === 'identity_conflict'
  const Icon = isConflict
    ? AlertTriangle
    : isUnknown || choice === undefined
      ? CircleHelp
      : choice === 'impotriva'
        ? ThumbsDown
        : ThumbsUp
  // The left rule carries no text: a mark, so it takes the flipping colours.
  const accentColor = isConflict
    ? MEMBER_VOTE_CONFLICT_MARK_COLOR
    : isUnknown || choice === undefined
      ? MEMBER_VOTE_UNKNOWN_MARK_COLOR
      : MEMBER_VOTE_CHOICE_MARK_COLORS[choice]
  const positionLabel = isConflict
    ? 'Conflict în sursă'
    : isUnknown || choice === undefined
      ? 'Poziție neclară'
      : getMemberVoteChoiceLabel(choice)

  return (
    <Link
      to="/parlament/voturi/$chamber/$voteId"
      params={{ chamber, voteId }}
      className={cn(
        memberDetailCareerCardClassName,
        'group block transition-colors hover:bg-parliament-hover',
      )}
    >
      <div
        className="flex border-l-[5px]"
        style={{ borderLeftColor: accentColor }}
      >
        <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 border-r border-parliament-border px-3 py-5">
          <Icon
            className="h-5 w-5 text-parliament-muted"
            strokeWidth={2}
            aria-hidden
          />
          <span className="text-sm font-bold text-parliament-fg">
            {positionLabel}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-base font-bold leading-snug text-parliament-fg">
              {title}
            </p>
            <p className="mt-1 text-sm text-parliament-muted">
              {divisionNumber
                ? formatVoteDivisionMeta({ heldAt }, divisionNumber)
                : formatVoteDayLong(heldAt)}
            </p>
          </div>

          {tally ? (
            <div className="hidden shrink-0 gap-6 sm:flex">
              <div>
                <p className="text-sm text-parliament-muted">Pentru</p>
                <p className="text-2xl font-bold tabular-nums text-parliament-fg">
                  {tally.pentru}
                </p>
              </div>
              <div>
                <p className="text-sm text-parliament-muted">Împotrivă</p>
                <p className="text-2xl font-bold tabular-nums text-parliament-fg">
                  {tally.impotriva}
                </p>
              </div>
            </div>
          ) : null}

          <ParliamentCardChevron className="mt-1 shrink-0" />
        </div>
      </div>
    </Link>
  )
}
