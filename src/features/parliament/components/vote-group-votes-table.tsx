import { Fragment, useId, useState, type MouseEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, ChevronDown } from 'lucide-react'
import { t } from '@lingui/core/macro'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type {
  MemberVoteChoice,
  ParliamentMemberVoteRecord,
} from '@/schemas/parliament'
import { GROUP_BALLOT_COLORS } from '../lib/group-theme'
import {
  isUnattributedVote,
  memberChoiceLabel,
  voteKindColumnLabel,
  votePositionLabel,
} from '../lib/vote-position-labels'

type GroupedVotes = ReadonlyArray<
  readonly [string, ReadonlyArray<ParliamentMemberVoteRecord>]
>

type Props = {
  /** Already filtered and ordered by the section — this component never sorts. */
  readonly groups: GroupedVotes
  readonly groupColors: Readonly<Record<string, string>>
  readonly memberJudete: Readonly<Record<string, string>>
  readonly className?: string
}

/** The four recorded choices, in tally order, each with its ballot colour. */
const VOTE_KIND_COLUMNS: ReadonlyArray<{
  readonly choice: MemberVoteChoice
  readonly color: string
}> = [
  { choice: 'pentru', color: GROUP_BALLOT_COLORS.pentru },
  { choice: 'impotriva', color: GROUP_BALLOT_COLORS.impotriva },
  { choice: 'abtinere', color: GROUP_BALLOT_COLORS.abtinere },
  { choice: 'nu_a_votat', color: GROUP_BALLOT_COLORS.absent },
]

const UNRESOLVED_ACCENT = '#505a5f'

/**
 * The scroll box the sticky head sticks to. Bounded so a 300-member division
 * cannot push the rest of the page — chart, provenance, related bills — an
 * unreachable distance below, and so the head has something to stick INSIDE:
 * a table that scrolls the document has no viewport of its own.
 *
 * `min()` rather than a plain `vh`: 40rem is about a dozen member rows, which is
 * enough to read a group without the table becoming the page, and the 70vh arm
 * keeps it from outgrowing a short laptop window.
 */
const tableViewportClassName = 'max-h-[min(40rem,70vh)] [scrollbar-gutter:stable]'

/**
 * A 1px rule to the LEFT of every numeric column — enough to bind the five
 * count columns into a block the eye can scan down, and deliberately not a
 * boxed grid: no rule under the head cells of the block, none around the rows.
 */
const numericColumnRuleClassName =
  'border-l border-[#dee0e2] dark:border-[var(--pnrr-border)]/60'

/**
 * Sticky, opaque, and carrying its bottom rule as an INSET SHADOW: under
 * `border-collapse: collapse` a sticky cell's own border is painted by the
 * table, not the cell, so a plain `border-b` vanishes the moment the head
 * detaches and rows scroll under it.
 */
const headCellClassName =
  'sticky top-0 z-10 h-9 bg-white px-2 py-2 align-bottom text-xs font-bold uppercase tracking-wide text-[#505a5f] shadow-[inset_0_-2px_0_0_#b1b4b6] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-muted)] dark:shadow-[inset_0_-2px_0_0_var(--pnrr-border)]'

/**
 * The head's share of the column rule, as a second shadow layer for the same
 * reason as the rule under it: a sticky cell's `border-l` is painted by the
 * table too, so the vertical rules would stop dead at the head the moment the
 * reader scrolled. Body cells keep the real border.
 */
const numericHeadRuleClassName =
  'shadow-[inset_1px_0_0_0_#dee0e2,inset_0_-2px_0_0_#b1b4b6] dark:shadow-[inset_1px_0_0_0_var(--pnrr-border),inset_0_-2px_0_0_var(--pnrr-border)]'

const numericCellClassName = cn(
  'px-2 py-2 text-right tabular-nums',
  numericColumnRuleClassName,
)

const rowClassName =
  'border-b border-[#dee0e2] transition-colors motion-reduce:transition-none dark:border-[var(--pnrr-border)]/60'

/**
 * `top-9` is `h-9` on the head cells above — the head's height is PINNED rather
 * than left to its content so the two numbers cannot drift apart and let a group
 * row ride up over the column labels.
 */
const STICKY_HEAD_OFFSET_CLASS_NAME = 'top-9'

/**
 * Every cell of a group summary sticks — not the `<tr>`. Sticky on a row is
 * still the shakier of the two across browsers, and cells are what the fixed
 * colgroup sizes anyway, so pinning them keeps the geometry identical to the
 * unpinned state.
 *
 * All groups share ONE offset, so a group that is passed does not stack: the
 * next summary reaches the same line and, being later in the document at equal
 * z-index, simply paints over it. `z-[5]` sits under the column head (`z-10`)
 * and over the member rows, which are not positioned at all.
 *
 * Backgrounds and rules live on the CELLS for the same reason the head's do: a
 * `<tr>` background and a collapsed border are painted by the table at the row's
 * natural position, so they would stay behind and leave a stray band and a
 * floating line the moment the cells pinned.
 */
const summaryCellStickyClassName = cn(
  'sticky z-[5]',
  STICKY_HEAD_OFFSET_CLASS_NAME,
  'shadow-[inset_0_-1px_0_0_#dee0e2] dark:shadow-[inset_0_-1px_0_0_var(--pnrr-border)]',
)

/** The same pin, plus the numeric column's left rule as a second layer. */
const summaryNumericCellStickyClassName = cn(
  'sticky z-[5]',
  STICKY_HEAD_OFFSET_CLASS_NAME,
  'border-l-0 shadow-[inset_1px_0_0_0_#dee0e2,inset_0_-1px_0_0_#dee0e2] dark:shadow-[inset_1px_0_0_0_var(--pnrr-border),inset_0_-1px_0_0_var(--pnrr-border)]',
)

function countByChoice(
  votes: ReadonlyArray<ParliamentMemberVoteRecord>,
): Readonly<Record<MemberVoteChoice, number>> {
  const counts: Record<MemberVoteChoice, number> = {
    pentru: 0,
    impotriva: 0,
    abtinere: 0,
    nu_a_votat: 0,
  }
  for (const vote of votes) {
    if (vote.choice) counts[vote.choice] += 1
  }
  return counts
}

function MemberIdentityCell({
  vote,
  judetName,
}: {
  readonly vote: ParliamentMemberVoteRecord
  readonly judetName?: string
}) {
  const unattributed = isUnattributedVote(vote)
  // The source could not match the ballot to a mandate — a link would point at a
  // member page that does not exist.
  const name = vote.memberId ? (
    <Link
      to="/parlament/membri/$memberId"
      params={{ memberId: vote.memberId }}
      className="text-sm text-[#1d70b8] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:text-[#7fb3e3]"
    >
      {vote.memberName}
    </Link>
  ) : (
    <span
      className="text-sm text-[#0b0c0c] dark:text-[var(--pnrr-fg)]"
      title={t`Votul nu a putut fi asociat unui parlamentar`}
    >
      {vote.memberName}
    </span>
  )

  return (
    // A long name WRAPS inside the column it was given rather than widening it —
    // under `table-fixed` nothing here can move the count columns.
    <TableCell className="py-2 pl-6 pr-3 break-words">
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        {name}
        {judetName ? (
          <span className="shrink-0 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {judetName}
          </span>
        ) : null}
        {/* A conflicting or unmarked position ticks NO column, so without this
            the row would read as a member who simply is not there. */}
        {unattributed ? (
          <span className="shrink-0 text-xs font-bold text-[#912b88] dark:text-[#d8a3d0]">
            {votePositionLabel(vote)}
          </span>
        ) : null}
      </span>
    </TableCell>
  )
}

function MemberVoteRow({
  vote,
  judetName,
}: {
  readonly vote: ParliamentMemberVoteRecord
  readonly judetName?: string
}) {
  return (
    <TableRow className={cn(rowClassName, 'hover:bg-[#f8f8f8]')}>
      <MemberIdentityCell vote={vote} judetName={judetName} />
      {VOTE_KIND_COLUMNS.map((column) => (
        <TableCell key={column.choice} className={numericCellClassName}>
          {vote.choice === column.choice ? (
            <>
              <Check
                className="inline-block h-4 w-4 stroke-[3]"
                style={{ color: column.color }}
                aria-hidden
              />
              {/* The tick is the only visible mark; the word is what a screen
                  reader announces in a cell whose column head it may not read. */}
              <span className="sr-only">{memberChoiceLabel(column.choice)}</span>
            </>
          ) : null}
        </TableCell>
      ))}
      <TableCell className={numericCellClassName} />
      <TableCell className="px-2 py-2" />
    </TableRow>
  )
}

/**
 * The whole roll, group by group, as one compact table: a summary row per group
 * carrying its tally across the four recorded choices, expanding in place into a
 * row per member.
 *
 * `Total` is the sum of those four columns — the positions the source actually
 * recorded — NOT the group's roster. The two differ whenever a ballot carries a
 * contradictory or unmarked position, which is why the count next to the group
 * name (every listed ballot) is kept separate from it.
 */
export function VoteGroupVotesTable({
  groups,
  groupColors,
  memberJudete,
  className,
}: Props) {
  const baseId = useId()
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlySet<string>>(
    new Set(),
  )

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((current) => {
      const next = new Set(current)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  return (
    <Table
      // Bleeds to the card edge exactly like the tab strip above it, so a narrow
      // screen scrolls the table sideways instead of the whole document.
      containerClassName={cn(
        // `w-auto` so the negative margin bleeds on BOTH sides — the shadcn
        // default `w-full` would pin the width and shift the box left instead.
        'w-auto -mx-5 px-5 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0',
        tableViewportClassName,
        className,
      )}
      // `table-fixed` + the colgroup below are what make the geometry STABLE:
      // with automatic sizing, opening a group let its longest member name
      // widen the first column and slide every count sideways, so the numbers
      // the reader was comparing moved out from under their eye.
      className="min-w-[44rem] table-fixed"
    >
      <colgroup>
        {/* Identity takes whatever is left; every other column is pinned. */}
        <col />
        {VOTE_KIND_COLUMNS.map((column) => (
          <col key={column.choice} className="w-[5.5rem]" />
        ))}
        <col className="w-[4.5rem]" />
        <col className="w-[3rem]" />
      </colgroup>
      {/* The rule under the head is the cells' inset shadow, not the row's
          border — shadcn's own `[&_tr]:border-b` would otherwise draw a second
          line that stays behind while the sticky cells scroll away from it. */}
      <TableHeader className="[&_tr]:border-b-0!">
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col" className={cn(headCellClassName, 'pl-0')}>
            {t`Grup / membru`}
          </TableHead>
          {VOTE_KIND_COLUMNS.map((column) => (
            <TableHead
              key={column.choice}
              scope="col"
              className={cn(
                headCellClassName,
                numericHeadRuleClassName,
                'text-right',
              )}
            >
              {voteKindColumnLabel(column.choice)}
            </TableHead>
          ))}
          <TableHead
            scope="col"
            className={cn(
              headCellClassName,
              numericHeadRuleClassName,
              'text-right',
            )}
          >
            {t`Total`}
          </TableHead>
          <TableHead scope="col" className={headCellClassName}>
            <span className="sr-only">{t`Detalii grup`}</span>
          </TableHead>
        </TableRow>
      </TableHeader>

      {groups.map(([groupId, votes], index) => {
        const groupName = votes[0]?.groupName ?? groupId
        const counts = countByChoice(votes)
        const explicitTotal = VOTE_KIND_COLUMNS.reduce(
          (total, column) => total + counts[column.choice],
          0,
        )
        const unattributedCount = votes.length - explicitTotal
        const expanded = expandedGroupIds.has(groupId)
        // `groupId` is source data and can carry anything; the index keeps the
        // id a valid, collision-free token.
        const membersId = `${baseId}-group-${String(index)}`
        const groupLabel = `${groupName} (${String(votes.length)})`
        // The pinned cells carry the row's fill, so hover has to reach them from
        // the row: `group-hover` on each cell, not `hover` on the `<tr>`.
        const summaryFillClassName = expanded
          ? 'bg-[#f3f2f1] dark:bg-[var(--pnrr-subtle)]'
          : 'bg-white group-hover/summary:bg-[#f3f2f1] dark:bg-[var(--pnrr-card)] dark:group-hover/summary:bg-[var(--pnrr-subtle)]'
        const summaryCellClassName = cn(
          summaryCellStickyClassName,
          summaryFillClassName,
        )

        return (
          <Fragment key={groupId}>
            <TableBody>
              <TableRow
                // No row border and no row fill: both would be painted by the
                // table at the row's natural position and left behind the
                // moment the cells pin.
                className="group/summary cursor-pointer touch-manipulation border-b-0 hover:bg-transparent"
                // The whole row is a shortcut for the control at its end — but
                // a click that already hit the button must not toggle twice.
                onClick={(event: MouseEvent<HTMLTableRowElement>) => {
                  if ((event.target as HTMLElement).closest('a,button')) return
                  toggleGroup(groupId)
                }}
              >
                <TableCell
                  className={cn(
                    summaryCellClassName,
                    'py-2.5 pl-0 pr-3 break-words',
                  )}
                >
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
                    <span
                      className="h-3.5 w-1.5 shrink-0 self-center"
                      style={{
                        backgroundColor:
                          groupColors[groupId] ?? UNRESOLVED_ACCENT,
                      }}
                      aria-hidden
                    />
                    <span className="text-[15px] font-bold text-[#372554] dark:text-[var(--pnrr-fg)]">
                      {groupLabel}
                    </span>
                    {/* Says why the four columns do not add up to the count on
                        the name, rather than leaving the reader to assume a
                        miscount. */}
                    {unattributedCount > 0 ? (
                      <span className="shrink-0 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                        {t`${unattributedCount} fără alegere înregistrată`}
                      </span>
                    ) : null}
                  </span>
                </TableCell>

                {VOTE_KIND_COLUMNS.map((column) => (
                  <TableCell
                    key={column.choice}
                    className={cn(
                      numericCellClassName,
                      summaryNumericCellStickyClassName,
                      summaryFillClassName,
                      'text-sm font-bold',
                    )}
                  >
                    {counts[column.choice] > 0 ? (
                      <span style={{ color: column.color }}>
                        {counts[column.choice]}
                      </span>
                    ) : (
                      <span className="font-normal text-[#b1b4b6] dark:text-[var(--pnrr-muted)]">
                        0
                      </span>
                    )}
                  </TableCell>
                ))}

                <TableCell
                  className={cn(
                    numericCellClassName,
                    summaryNumericCellStickyClassName,
                    summaryFillClassName,
                    'text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]',
                  )}
                >
                  {explicitTotal}
                </TableCell>

                <TableCell
                  className={cn(
                    summaryCellClassName,
                    'px-2 py-2.5 text-center',
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={membersId}
                    onClick={() => {
                      toggleGroup(groupId)
                    }}
                    className="inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-none text-[#372554] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] focus-visible:ring-offset-1 dark:text-[var(--pnrr-fg)]"
                  >
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 stroke-[2] transition-transform motion-reduce:transition-none',
                        expanded && 'rotate-180',
                      )}
                      aria-hidden
                    />
                    <span className="sr-only">{groupLabel}</span>
                  </button>
                </TableCell>
              </TableRow>
            </TableBody>

            {/* Always rendered, so `aria-controls` never points at nothing.
                The last member keeps its rule (shadcn drops it) so a group is
                visibly closed off before the next summary pins over it. */}
            <TableBody
              id={membersId}
              className="[&_tr:last-child]:border-b!"
            >
              {expanded
                ? votes.map((vote) => (
                    <MemberVoteRow
                      key={vote.ballotKey}
                      vote={vote}
                      judetName={
                        vote.memberId ? memberJudete[vote.memberId] : undefined
                      }
                    />
                  ))
                : null}
            </TableBody>
          </Fragment>
        )
      })}
    </Table>
  )
}
