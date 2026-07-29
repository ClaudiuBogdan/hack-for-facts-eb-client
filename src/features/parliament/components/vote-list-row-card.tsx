import { Link } from '@tanstack/react-router'
import type { ParliamentVoteSummary, VoteChamber } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  formatVoteDivisionMeta,
  getOutcomeLabel,
  getVoteChamberLabel,
  getVoteOutcomeAccentColor,
  toVoteDetailChamberParam,
} from '../lib/formatting'
import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_RESOURCE_PURPLE,
  PARLIAMENT_SENAT_RED,
} from '../lib/hub-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

const CHAMBER_BADGE_COLOR: Readonly<Record<VoteChamber, string>> = {
  camera: PARLIAMENT_CAMERA_GREEN,
  senat: PARLIAMENT_SENAT_RED,
  comun: PARLIAMENT_RESOURCE_PURPLE,
}

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
  const accentColor = getVoteOutcomeAccentColor(vote.outcome)
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
        'group flex rounded-none border border-[#b1b4b6] bg-white transition-colors hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:hover:bg-[var(--pnrr-surface)]',
        className,
      )}
      aria-label={`${vote.title} — ${outcomeLabel}`}
    >
      <span
        className="w-[5px] shrink-0 self-stretch"
        style={{ backgroundColor: accentColor }}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:gap-6">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-snug text-[#0b0c0c] group-hover:underline dark:text-[var(--pnrr-fg)]">
            {vote.title}
          </h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {showChamber ? (
              <>
                <span
                  className="inline-flex items-center rounded-none border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: CHAMBER_BADGE_COLOR[vote.chamber],
                    color: CHAMBER_BADGE_COLOR[vote.chamber],
                  }}
                >
                  {getVoteChamberLabel(vote.chamber)}
                </span>
                <span aria-hidden>·</span>
              </>
            ) : null}
            <span
              className="inline-flex items-center rounded-none border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              {outcomeLabel}
            </span>
            <span aria-hidden>·</span>
            <span>{formatVoteDivisionMeta(vote, vote.divisionNumber)}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-5 sm:gap-7">
          <dl className="flex gap-5 sm:gap-7">
            {counts.map((count) => (
              <div key={count.label}>
                <dt className="text-xs leading-none text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  {count.label}
                </dt>
                <dd className="mt-1.5 text-xl font-bold leading-none tabular-nums text-[#0b0c0c] dark:text-[var(--pnrr-fg)] sm:text-2xl">
                  {count.value}
                </dd>
              </div>
            ))}
          </dl>
          <ParliamentCardChevron className="hidden shrink-0 text-[#505a5f] lg:block dark:text-[var(--pnrr-muted)]" />
        </div>
      </div>
    </Link>
  )
}
