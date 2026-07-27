import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PARLIAMENT_ACTION_BLUE } from '../lib/hub-theme'
import { voteMemberCardShadowClassName } from '../lib/vote-detail-theme'

type Props = {
  /**
   * Absent when the source ballot could not be resolved to a member. The card is
   * then plain text — a link would point at a member page that does not exist.
   */
  readonly memberId?: string
  readonly memberName: string
  readonly groupName: string
  readonly judetName?: string
  /**
   * How this member voted, for lists that MIX choices. Omitted when the
   * surrounding tab already states the choice — repeating it there would put
   * the same word on every card.
   */
  readonly choiceLabel?: string
  readonly accentColor: string
  readonly className?: string
}

const CARD_CLASS_NAME =
  'group flex overflow-hidden rounded-none border border-l-0 border-[#ececec] bg-white transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)]/50 dark:bg-[var(--pnrr-card)]'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase()
}

/** Links to the member profile only when the ballot resolved to a real mandate. */
function VoteMemberResultCardShell({
  memberId,
  memberName,
  className,
  children,
}: {
  readonly memberId?: string
  readonly memberName: string
  readonly className?: string
  readonly children: ReactNode
}) {
  if (memberId === undefined) {
    return (
      <div
        className={cn(CARD_CLASS_NAME, className)}
        title={`Votul nu a putut fi asociat unui parlamentar (${memberName})`}
      >
        {children}
      </div>
    )
  }

  return (
    <Link
      to="/parlament/membri/$memberId"
      params={{ memberId }}
      className={cn(CARD_CLASS_NAME, voteMemberCardShadowClassName, className)}
    >
      {children}
    </Link>
  )
}

/** UK Parliament “Members voting” member card — compact layout */
export function VoteMemberResultCard({
  memberId,
  memberName,
  groupName,
  judetName,
  choiceLabel,
  accentColor,
  className,
}: Props) {
  const resolved = memberId !== undefined
  // The footer row carries the choice, the county, or both — and the rule above
  // it only earns its place when there is something under it.
  const hasFootnote = Boolean(choiceLabel ?? judetName)

  return (
    <VoteMemberResultCardShell
      memberId={memberId}
      memberName={memberName}
      className={className}
    >
      <span
        className="w-1.5 shrink-0 self-stretch sm:w-2"
        style={{ backgroundColor: accentColor }}
        aria-hidden
      />

      <div className="grid min-w-0 flex-1 grid-cols-[3rem_1fr_auto] gap-x-2.5 px-3 pb-1 pt-4">
        <span
          className="col-start-1 row-start-1 flex h-12 w-12 shrink-0 items-center justify-center self-start rounded-full border-2 bg-[#eef2f6] text-xs font-bold text-[#1d70b8] dark:bg-[var(--pnrr-subtle)]"
          style={{ borderColor: PARLIAMENT_ACTION_BLUE }}
          aria-hidden
        >
          {getInitials(memberName)}
        </span>

        <div className="col-start-2 row-start-1 min-w-0 self-start">
          <p
            className={cn(
              'truncate text-[15px] font-bold leading-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]',
              resolved && 'group-hover:underline',
            )}
          >
            {memberName}
          </p>
          <p className="mt-0.5 truncate text-sm leading-tight text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {groupName}
          </p>
          {resolved ? null : (
            <p className="mt-0.5 truncate text-xs leading-tight text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Neasociat unui profil
            </p>
          )}
        </div>

        {resolved ? (
          <ChevronRight
            className="col-start-3 row-start-1 mt-0.5 h-5 w-5 shrink-0 self-start stroke-[2.5] text-[#505a5f] dark:text-[var(--pnrr-muted)]"
            aria-hidden
          />
        ) : (
          <span className="col-start-3 row-start-1" aria-hidden />
        )}

        {hasFootnote ? (
          <>
            <div
              className="col-start-2 col-end-4 row-start-2 border-t border-[#dee0e2] dark:border-[var(--pnrr-border)]/60"
              aria-hidden
            />
            <p className="col-start-2 col-end-4 row-start-3 truncate pb-1.5 pt-1.5 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {choiceLabel ? (
                <span className="font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                  {choiceLabel}
                </span>
              ) : null}
              {choiceLabel && judetName ? ' · ' : null}
              {judetName}
            </p>
          </>
        ) : null}
      </div>
    </VoteMemberResultCardShell>
  )
}
