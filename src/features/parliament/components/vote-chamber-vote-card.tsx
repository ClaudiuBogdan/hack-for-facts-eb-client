import { Link } from '@tanstack/react-router'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { ParliamentVoteSummary } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  formatVoteDivisionMeta,
  getOutcomeLabel,
  getVoteChamberLabel,
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
    ? getVoteTallySubjectNote(billContext.linkRole, vote.outcome, vote.voteSubject)
    : undefined

  // What the card leads with depends on what the reader already knows.
  //
  // On a BILL page the bill is the context, so `title` — which IS the bill's
  // title on every related vote — says nothing; the chamber's own subject label
  // leads and the title is dropped as pure repetition. On the votes hub the
  // opposite holds: the bill is the thing being identified, so the title leads
  // and the subject explains underneath. Where the source printed no label (a
  // large minority) both fall back to the title, which is always true.
  const subject = vote.voteSubject
  const heading = billContext && subject ? subject : vote.title
  const subheading = billContext ? undefined : subject

  return (
    <Link
      to="/parlament/voturi/$chamber/$voteId"
      params={{
        chamber: toVoteDetailChamberParam(vote.chamber),
        voteId: vote.voteId,
      }}
      className={cn(parliamentVoteCardClassName, className)}
      // Title, subject, CHAMBER and the division's own date/number — because
      // title+subject is not enough to be unique. Review measured 240 groups of
      // same-title, same-subject, same-outcome links covering 534 votes, worst
      // case nine divisions on one bill on a single day: they would all have
      // announced identically. The meta line is what actually separates them.
      aria-label={[
        vote.title,
        subject,
        getVoteChamberLabel(vote.chamber),
        formatVoteDivisionMeta(vote, vote.divisionNumber),
        outcomeLabel,
      ]
        .filter(Boolean)
        .join(' — ')}
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
            {/* On a bill page the heading is normally the division's subject, so
                a card falling back to the bill title looks the same as one whose
                subject happens to BE that text. Saying which is which costs one
                muted line and removes the ambiguity the fallback created. */}
            {billContext && !subject ? (
              <p className="mt-1 text-sm italic leading-5 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                Subiectul votului nu a fost consemnat de sursă
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
              voteSubject={vote.voteSubject}
            />
          ) : null}
        </div>
      </div>
    </Link>
  )
}
