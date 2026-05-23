import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  memberDetailCareerCardBodyClassName,
  memberDetailCareerCardClassName,
  memberDetailCareerCardFooterClassName,
  memberDetailCardLabelClassName,
} from '../lib/member-detail-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

type CareerCardLinkProps = {
  readonly label: string
  readonly title: string
  readonly subtitle?: string
  readonly footerLeft: string
  readonly footerRight: ReactNode
  readonly leading?: ReactNode
  readonly className?: string
} & (
  | {
      readonly to: '/parlament'
      readonly search?: Record<string, string | undefined>
      readonly params?: never
    }
  | {
      readonly to: '/parlament/grupuri/$groupId'
      readonly params: { readonly groupId: string }
      readonly search?: never
    }
  | {
      readonly to?: never
      readonly search?: never
      readonly params?: never
    }
)

/** UK Parliament career card — label above, gray left accent, footer row */
export function MemberProfileCareerCard(props: CareerCardLinkProps) {
  const { label, title, subtitle, footerLeft, footerRight, leading, className, to } = props

  const body = (
    <>
      <div className={memberDetailCareerCardBodyClassName}>
        <div className="flex min-w-0 flex-1 items-start justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-4">
            {leading}
            <div className="min-w-0">
              <p className="text-lg font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                {title}
              </p>
              {subtitle ? (
                <p className="mt-1 text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          {to ? <ParliamentCardChevron className="mt-1 shrink-0" /> : null}
        </div>
      </div>
      <div className={memberDetailCareerCardFooterClassName}>
        <span>{footerLeft}</span>
        {footerRight}
      </div>
    </>
  )

  return (
    <div className={cn('space-y-2', className)}>
      <h3 className={memberDetailCardLabelClassName}>{label}</h3>
      {to ? (
        <Link
          to={to}
          search={'search' in props ? props.search : undefined}
          params={'params' in props ? props.params : undefined}
          className={cn(
            memberDetailCareerCardClassName,
            'group block transition-colors hover:bg-[#f8f8f8] dark:hover:bg-[var(--pnrr-hover)]',
          )}
        >
          {body}
        </Link>
      ) : (
        <div className={memberDetailCareerCardClassName}>{body}</div>
      )}
    </div>
  )
}

type ChamberBadgeProps = {
  readonly chamber: 'camera' | 'senat'
}

/** Small chamber badge for career card footers */
export function MemberProfileChamberBadge({ chamber }: ChamberBadgeProps) {
  const label = chamber === 'camera' ? 'Camera Deputaților' : 'Senat'
  const color = chamber === 'camera' ? '#006435' : '#9C051A'

  return (
    <span className="inline-flex items-center gap-2 font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ backgroundColor: color }}
        aria-hidden
      >
        P
      </span>
      {label}
    </span>
  )
}

type PartyBadgeProps = {
  readonly shortName: string
  readonly color: string
}

/** Circular party badge for affiliation cards */
export function MemberProfilePartyBadge({ shortName, color }: PartyBadgeProps) {
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {shortName}
    </span>
  )
}
