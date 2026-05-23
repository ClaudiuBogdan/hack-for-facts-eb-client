import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { parliamentHubLinkClassName } from '../lib/hub-theme'

type FooterLinkProps = {
  readonly to: '/parlament' | '/buget-national-2026'
  readonly search?: Record<string, string | undefined>
  readonly label: string
}

type SearchPanelProps = {
  readonly title: ReactNode
  readonly intro: string
  readonly children: ReactNode
  readonly footerLink: FooterLinkProps
}

/** UK Parliament search column — icon + title, intro, form, footer link */
export function ParliamentSearchPanel({
  title,
  intro,
  children,
  footerLink,
}: SearchPanelProps) {
  return (
    <div className="flex min-h-[22rem] flex-col border-b-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-5 sm:p-6 lg:min-h-[24rem] lg:border-b-0 lg:border-r-2 lg:last:border-r-0">
      <div>
        <h3 className="flex items-start gap-2 text-lg font-bold leading-snug text-[var(--pnrr-fg)] sm:text-xl">
          {title}
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-[var(--pnrr-muted)]">
          {intro}
        </p>
      </div>

      <div className="mt-auto pt-8">
        {children}
        <Link
          to={footerLink.to}
          search={footerLink.search}
          className={cn(parliamentHubLinkClassName, 'mt-8 inline-block text-base')}
        >
          {footerLink.label}
        </Link>
      </div>
    </div>
  )
}

type PromoPanelProps = {
  readonly title: string
  readonly description: string
  readonly image: ReactNode
  readonly action: ReactNode
  readonly footerLink?: FooterLinkProps
}

/** UK Parliament “Visit” promo column */
export function ParliamentPromoPanel({
  title,
  description,
  image,
  action,
  footerLink,
}: PromoPanelProps) {
  return (
    <div className="flex min-h-[22rem] flex-col bg-[var(--pnrr-card)] p-5 sm:p-6 lg:min-h-[24rem]">
      <h3 className="text-lg font-bold leading-snug text-[var(--pnrr-fg)] sm:text-xl">
        {title}
      </h3>
      <div className="mt-4 overflow-hidden border-2 border-[var(--pnrr-border)]">
        {image}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--pnrr-muted)]">
        {description}
      </p>
      <div className="mt-auto pt-6">{action}</div>
      {footerLink ? (
        <Link
          to={footerLink.to}
          search={footerLink.search}
          className={cn(parliamentHubLinkClassName, 'mt-6 inline-block text-base')}
        >
          {footerLink.label}
        </Link>
      ) : null}
    </div>
  )
}

export function ParliamentChamberMark({
  color,
  className,
}: {
  readonly color: string
  readonly className?: string
}) {
  return (
    <span
      className={cn(
        'mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--pnrr-card)] ring-2 ring-[var(--pnrr-border)]',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={color}>
        <path d="M12 3 4 9v12h16V9l-8-6Zm0 2.2 6 4.5V19H6v-9.3l6-4.5Z" />
      </svg>
    </span>
  )
}
