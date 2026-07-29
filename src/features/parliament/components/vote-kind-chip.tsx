import type { VoteKind } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { VOTE_KIND_CHIP_LABELS } from '../lib/votes-filter-state'

/**
 * WHAT THE CHAMBER WAS VOTING ON, for the surfaces that have nothing else.
 *
 * The bill page can lean on the division's own subject and on the edge's role.
 * The votes hub and the vote-detail page cannot: 8,408 divisions have no bill
 * link at all, and outside the `legislative` bucket the chamber printed no
 * subject on 92-97% of rows. There the title IS the motion — "Art. 178",
 * "Anexa 3/15 - amendament respins 672", "Vot din 27 mai 2020" — and the kind is
 * what places it.
 *
 * NOT a verdict and not a role: it says what class of thing was voted, never
 * what was decided. The tally and (on a bill-linked vote) the role answer that.
 *
 * Deliberately flat and muted. Only ONE bucket is backed by a column
 * (`legislative` = the vote has a bill link); the other five are title
 * heuristics over free text, and a coloured chip would lend a regex match the
 * authority of a fact.
 */
export function VoteKindChip({
  kind,
  tone = 'muted',
  className,
}: {
  readonly kind: VoteKind | undefined
  /** `inverse` for the coloured detail hero, where grey-on-colour is unreadable. */
  readonly tone?: 'muted' | 'inverse'
  readonly className?: string
}) {
  if (kind === undefined) return null

  return (
    <span
      className={cn(
        'border px-1.5 py-0.5 text-xs font-semibold uppercase leading-none tracking-wide',
        tone === 'inverse'
          ? 'border-white/60 text-white'
          : 'border-[#b1b4b6] text-[#505a5f] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-muted)]',
        className,
      )}
    >
      {VOTE_KIND_CHIP_LABELS[kind]}
    </span>
  )
}
