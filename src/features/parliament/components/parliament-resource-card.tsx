import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PARLIAMENT_ICON_BG,
  PARLIAMENT_RESOURCE_PURPLE,
  parliamentResourceDescriptionClassName,
  parliamentResourceTitleClassName,
} from '../lib/hub-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

type LinkTarget = {
  readonly to:
    | '/parlament'
    | '/parlament/agenda'
    | '/parlament/comisii'
    | '/parlament/stenograme'
  readonly search?: Record<string, string | undefined>
}

type Props = {
  readonly title: string
  readonly description: string
  readonly icon: LucideIcon
  readonly link: LinkTarget
}

/** Horizontal resource card for the Parlament hub navigation grid */
export function ParliamentResourceCard({
  title,
  description,
  icon: Icon,
  link,
}: Props) {
  return (
    <Link
      to={link.to}
      search={link.search}
      className={cn(
        'group relative flex w-full min-h-[7.5rem] overflow-hidden bg-[var(--pnrr-card)] transition-colors',
        'hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] focus-visible:ring-inset',
      )}
    >
      <span
        className="w-[5px] shrink-0 self-stretch"
        style={{ backgroundColor: PARLIAMENT_RESOURCE_PURPLE }}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 gap-4 p-4 pr-10">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center"
          style={{ backgroundColor: PARLIAMENT_ICON_BG }}
        >
          <Icon className="h-8 w-8 text-white" strokeWidth={1.25} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(parliamentResourceTitleClassName, 'group-hover:underline')}>
            {title}
          </p>
          <p className={cn(parliamentResourceDescriptionClassName, 'mt-2')}>
            {description}
          </p>
        </div>
      </div>
      <ParliamentCardChevron className="absolute right-4 top-4" />
    </Link>
  )
}

/** Bordered grid wrapper for resource cards */
export function ParliamentResourceGrid({
  children,
}: {
  readonly children: ReactNode
}) {
  return (
    <div className="grid border-t-2 border-l-2 border-[var(--pnrr-border)] sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  )
}

export function ParliamentResourceGridItem({
  children,
}: {
  readonly children: ReactNode
}) {
  return (
    // `flex` makes the card stretch to the tallest cell in its row — otherwise the
    // card is content-sized and its 5px accent stops short of the cell's bottom border.
    <div className="flex border-b-2 border-r-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]">
      {children}
    </div>
  )
}
