import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PARLIAMENT_ACTION_BLUE } from '../lib/hub-theme'
import { voteMemberCardShadowClassName } from '../lib/vote-detail-theme'

type Props = {
  readonly memberId: string
  readonly memberName: string
  readonly groupName: string
  readonly judetName?: string
  readonly accentColor: string
  readonly className?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase()
}

/** UK Parliament “Members voting” member card — compact layout */
export function VoteMemberResultCard({
  memberId,
  memberName,
  groupName,
  judetName,
  accentColor,
  className,
}: Props) {
  return (
    <Link
      to="/parlament/membri/$memberId"
      params={{ memberId }}
      className={cn(
        'group flex overflow-hidden rounded-none border border-l-0 border-[#ececec] bg-white transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)]/50 dark:bg-[var(--pnrr-card)]',
        voteMemberCardShadowClassName,
        className,
      )}
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
          <p className="truncate text-[15px] font-bold leading-tight text-[#0b0c0c] group-hover:underline dark:text-[var(--pnrr-fg)]">
            {memberName}
          </p>
          <p className="mt-0.5 truncate text-sm leading-tight text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {groupName}
          </p>
        </div>

        <ChevronRight
          className="col-start-3 row-start-1 mt-0.5 h-5 w-5 shrink-0 self-start stroke-[2.5] text-[#505a5f] dark:text-[var(--pnrr-muted)]"
          aria-hidden
        />

        {judetName ? (
          <>
            <div
              className="col-start-2 col-end-4 row-start-2 border-t border-[#dee0e2] dark:border-[var(--pnrr-border)]/60"
              aria-hidden
            />
            <p className="col-start-2 col-end-4 row-start-3 pb-1.5 pt-1.5 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {judetName}
            </p>
          </>
        ) : null}
      </div>
    </Link>
  )
}
