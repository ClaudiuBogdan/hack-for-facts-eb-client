import { Link } from '@tanstack/react-router'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { ParliamentVoteSummary } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  formatVoteDivisionMeta,
  getOutcomeLabel,
  getVoteOutcomeAccentColor,
  toVoteDetailChamberParam,
} from '../lib/formatting'
import {
  parliamentVoteCardClassName,
  parliamentVoteCardDividerClassName,
} from '../lib/hub-theme'
import {
  BillVoteRoleBadge,
  getVoteTallySubjectNote,
} from './bill-vote-role-badge'
import { ParliamentCardChevron } from './parliament-card-chevron'

type Props = {
  readonly vote: ParliamentVoteSummary
  readonly className?: string
  /**
   * Set ONLY when the card sits on a bill page. Every related vote carries the
   * BILL's title, so on that surface the title identifies nothing and the card
   * needs the chamber and the edge's role to be tellable apart. The votes hub
   * omits this: there the panel already states the chamber, and a vote listed on
   * its own has no bill-relative role.
   */
  readonly billContext?: { readonly linkRole?: string }
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
export function VoteChamberVoteCard({ vote, className, billContext }: Props) {
  const outcomeLabel = getOutcomeLabel(vote.outcome)
  // The accent reads the DIVISION's result, always — same rule on every surface.
  // What the division did to the BILL is a different fact, and the badge states
  // it in words rather than recolouring the bar to mean two things at once.
  const accentColor = getVoteOutcomeAccentColor(vote.outcome)
  const tallySubjectNote = billContext
    ? getVoteTallySubjectNote(billContext.linkRole, vote.outcome)
    : undefined

  // What the card leads with depends on what the reader already knows.
  //
  // On a BILL page the bill is the context, so `title` — which IS the bill's
  // title on every related vote — says nothing; the motion leads and the title
  // is dropped as pure repetition. On the votes hub the opposite holds: the bill
  // is the thing being identified, so the title leads and the motion explains
  // underneath. When the source printed no motion (9,223 of 20,745 divisions)
  // both surfaces fall back to the title, which is always true.
  const motion = vote.voteAction
  const heading = billContext && motion ? motion : vote.title
  const subheading = billContext ? undefined : motion

  return (
    <Link
      to="/parlament/voturi/$chamber/$voteId"
      params={{
        chamber: toVoteDetailChamberParam(vote.chamber),
        voteId: vote.voteId,
      }}
      className={cn(parliamentVoteCardClassName, className)}
      // Both facts, on every surface. Announcing `title` alone would give two
      // divisions on one bill the SAME accessible name — the defect the visible
      // card just stopped having.
      aria-label={
        motion
          ? `${vote.title} — ${motion} — ${outcomeLabel}`
          : `${vote.title} — ${outcomeLabel}`
      }
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
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold leading-snug text-[#0b0c0c] group-hover:underline sm:text-lg dark:text-[var(--pnrr-fg)]">
              {heading}
            </h3>
            {subheading ? (
              <p className="mt-1 text-sm leading-5 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                {subheading}
              </p>
            ) : null}
          </div>
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

        {/* Directly under the numbers it rescues: what a „Pentru" was cast FOR,
            printed only when the ballot direction and the bill's fate disagree. */}
        {tallySubjectNote ? (
          <p
            className={cn(
              'border-t px-4 py-2 text-sm leading-5 text-[#505a5f] sm:px-5 dark:text-[var(--pnrr-muted)]',
              parliamentVoteCardDividerClassName,
            )}
          >
            {tallySubjectNote}
          </p>
        ) : null}

        {/* The footer carries the WHEN on the left and, on a bill page, the
            WHAT on the right — the badge rides in space the meta line was
            already leaving empty, so it costs the card no height and keeps the
            title block to the title. */}
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t px-4 py-2.5 sm:px-5 sm:py-3',
            parliamentVoteCardDividerClassName,
          )}
        >
          <span className="text-sm leading-5 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {formatVoteDivisionMeta(vote, vote.divisionNumber)}
          </span>
          {billContext ? (
            <BillVoteRoleBadge
              chamber={vote.chamber}
              linkRole={billContext.linkRole}
            />
          ) : null}
        </div>
      </div>
    </Link>
  )
}
