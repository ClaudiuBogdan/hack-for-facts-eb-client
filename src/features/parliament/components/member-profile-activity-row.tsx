import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  memberDetailCareerCardBodyClassName,
  memberDetailCareerCardClassName,
} from '../lib/member-detail-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

type Props = {
  readonly title: string
  readonly meta?: string
  readonly trailing?: ReactNode
  readonly href?: string
  readonly className?: string
}

/** UK-style activity row used across member profile sections */
export function MemberProfileActivityRow({
  title,
  meta,
  trailing,
  href,
  className,
}: Props) {
  const content = (
    <div className={memberDetailCareerCardBodyClassName}>
      <div className="flex min-w-0 flex-1 items-start justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-base font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {title}
          </p>
          {meta ? (
            <p className="mt-1 text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {meta}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {trailing}
          {href ? <ParliamentCardChevron className="mt-0.5" /> : null}
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          memberDetailCareerCardClassName,
          'group block transition-colors hover:bg-[#f8f8f8] dark:hover:bg-[var(--pnrr-hover)]',
          className,
        )}
      >
        {content}
      </a>
    )
  }

  return <div className={cn(memberDetailCareerCardClassName, className)}>{content}</div>
}
