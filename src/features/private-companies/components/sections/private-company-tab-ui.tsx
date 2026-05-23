import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type TabPanelProps = {
  readonly category: ReactNode
  readonly hint?: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly contentVariant?: 'list' | 'plain'
}

export function PrivateCompanyTabPanel({
  category,
  hint,
  children,
  className,
  contentVariant = 'list',
}: TabPanelProps) {
  return (
    <div
      className={cn(
        'overflow-hidden border-2 border-[var(--pnrr-border)]',
        className,
      )}
      style={{ backgroundColor: 'var(--pnrr-card)' }}
    >
      <div className="border-b-2 border-[var(--pnrr-border)] px-4 py-3 sm:px-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]">
          {category}
        </p>
        {hint ? (
          <p className="mt-1.5 text-sm leading-snug text-[var(--pnrr-muted)]">
            {hint}
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          contentVariant === 'list' &&
            'divide-y-2 divide-[var(--pnrr-border)]',
        )}
      >
        {children}
      </div>
    </div>
  )
}

type TabListItemProps = {
  readonly headline: ReactNode
  readonly supporting?: ReactNode
  readonly aside?: ReactNode
  readonly className?: string
}

export function PrivateCompanyTabListItem({
  headline,
  supporting,
  aside,
  className,
}: TabListItemProps) {
  return (
    <li
      className={cn(
        'px-4 py-4 sm:px-5',
        aside ? 'flex items-start justify-between gap-4' : undefined,
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-base font-semibold leading-relaxed text-[var(--pnrr-fg)]">
          {headline}
        </p>
        {supporting ? (
          <p className="text-sm leading-snug text-[var(--pnrr-muted)]">
            {supporting}
          </p>
        ) : null}
      </div>
      {aside ? (
        <p className="max-w-[40%] shrink-0 text-right text-sm font-semibold leading-snug text-[var(--pnrr-muted)] sm:max-w-none">
          {aside}
        </p>
      ) : null}
    </li>
  )
}

type TabNoteProps = {
  readonly children: ReactNode
}

export function PrivateCompanyTabNote({ children }: TabNoteProps) {
  return (
    <p className="text-sm leading-relaxed text-[var(--pnrr-muted)]">{children}</p>
  )
}
