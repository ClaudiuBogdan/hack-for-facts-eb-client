import { Link } from '@tanstack/react-router'
import type { ParliamentVoteSummary } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  formatVoteDivisionMeta,
  getOutcomeLabel,
  getVoteChamberLabel,
  toVoteDetailChamberParam,
} from '../lib/formatting'
import { VOTE_KIND_CHIP_LABELS } from '../lib/votes-filter-state'
import { ParliamentCardChevron } from './parliament-card-chevron'
import { VoteKindChip } from './vote-kind-chip'

import {
  VOTE_CHAMBER_BADGE_CLASS_NAMES,
  VOTE_OUTCOME_BADGE_CLASS_NAMES,
  VOTE_OUTCOME_STRIPE_CLASS_NAMES,
} from '../lib/hub-theme'

type Props = {
  readonly vote: ParliamentVoteSummary
  readonly className?: string
  /**
   * Set on MIXED lists (the all-chambers browse), where rows from different
   * assemblies interleave and the chamber is the fact telling them apart. The
   * single-chamber lists omit it — there the page header already states the
   * chamber once, for every row.
   */
  readonly showChamber?: boolean
}

/**
 * Full-width vote row for the chamber list.
 *
 * The two-column grid of tall cards forced a reader to track two independent
 * columns down the page and stretched every long bill title into four or five
 * lines. At full width the same record fits one horizontal band: title and
 * context on the left, the tally on the right, one scan direction.
 *
 * The OUTCOME IS A WORD HERE, not only the accent stripe. On the grid card the
 * result was carried by border colour alone — invisible to anyone who cannot
 * separate the green from the crimson, and the single most important fact on
 * the row.
 */
export function VoteListRowCard({ vote, className, showChamber }: Props) {
  const outcomeLabel = getOutcomeLabel(vote.outcome)
  const { pentru, impotriva, abtinere, nuAVotat } = vote.tally

  // Only the counts the source actually recorded. `abtinere` / `nuAVotat` are
  // optional on the summary shape, and a missing count is not a zero.
  const counts = [
    { label: 'Pentru', value: pentru },
    { label: 'Împotrivă', value: impotriva },
    ...(abtinere === undefined ? [] : [{ label: 'Abțineri', value: abtinere }]),
    ...(nuAVotat === undefined ? [] : [{ label: 'Nu au votat', value: nuAVotat }]),
  ]

  return (
    <Link
      to="/parlament/voturi/$chamber/$voteId"
      params={{
        chamber: toVoteDetailChamberParam(vote.chamber),
        voteId: vote.voteId,
      }}
      className={cn(
        'group flex rounded-none border border-parliament-border bg-parliament-card transition-colors hover:bg-parliament-surface',
        className,
      )}
      // Title alone does not identify a row here: every division of a bill
      // carries the BILL's title, so a bill with nine divisions announced nine
      // identical links. The subject and the division meta are what separate
      // them, and the kind places the rows that have neither.
      aria-label={[
        vote.title,
        vote.voteSubject,
        // The chamber chip is VISIBLE on a mixed list; an explicit aria-label
        // replaces the link's text content, so omitting it hid a distinction
        // sighted readers can see.
        showChamber ? getVoteChamberLabel(vote.chamber) : undefined,
        vote.kind ? VOTE_KIND_CHIP_LABELS[vote.kind] : undefined,
        formatVoteDivisionMeta(vote, vote.divisionNumber),
        outcomeLabel,
      ]
        .filter(Boolean)
        .join(' — ')}
    >
      <span
        className={cn('w-[5px] shrink-0 self-stretch', VOTE_OUTCOME_STRIPE_CLASS_NAMES[vote.outcome])}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:gap-6">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug text-parliament-fg group-hover:underline">
            {vote.title}
          </h3>
          {/* The chamber's own label for the question. On this surface the title
              leads — the hub is where a vote is IDENTIFIED, and for a bill-linked
              division the title is the bill's — so the subject explains
              underneath rather than replacing it. */}
          {vote.voteSubject ? (
            <p className="mt-1 text-sm leading-5 text-parliament-muted">
              {vote.voteSubject}
            </p>
          ) : null}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-parliament-muted">
            {showChamber ? (
              <>
                <span
                  className={cn(
                    'inline-flex items-center rounded-none border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
                    VOTE_CHAMBER_BADGE_CLASS_NAMES[vote.chamber],
                  )}
                >
                  {getVoteChamberLabel(vote.chamber)}
                </span>
                <span aria-hidden>·</span>
              </>
            ) : null}
            <span
              className={cn(
                'inline-flex items-center rounded-none border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
                VOTE_OUTCOME_BADGE_CLASS_NAMES[vote.outcome],
              )}
            >
              {outcomeLabel}
            </span>
            <span aria-hidden>·</span>
            <span>{formatVoteDivisionMeta(vote, vote.divisionNumber)}</span>
            {vote.kind ? (
              <>
                <span aria-hidden>·</span>
                <VoteKindChip kind={vote.kind} />
              </>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-5 sm:gap-7">
          <dl className="flex gap-5 sm:gap-7">
            {counts.map((count) => (
              <div key={count.label}>
                <dt className="text-xs leading-none text-parliament-muted">
                  {count.label}
                </dt>
                <dd className="mt-1.5 text-xl font-bold leading-none tabular-nums text-parliament-fg sm:text-2xl">
                  {count.value}
                </dd>
              </div>
            ))}
          </dl>
          <ParliamentCardChevron className="hidden shrink-0 text-parliament-muted lg:block" />
        </div>
      </div>
    </Link>
  )
}
