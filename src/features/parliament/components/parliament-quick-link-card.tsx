import { Link } from '@tanstack/react-router'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PARLIAMENT_RESOURCE_PURPLE,
  parliamentQuickLinkDescriptionClassName,
  parliamentQuickLinkTitleClassName,
} from '../lib/hub-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

type LinkTarget = {
  readonly to: '/parlament' | '/buget-national-2026'
  readonly search?: Record<string, string | undefined>
}

type Props = {
  readonly title: string
  readonly description: string
  readonly icon: LucideIcon
  readonly illustrationColor: string
  readonly iconColor?: string
  readonly link: LinkTarget
  readonly external?: boolean
  readonly href?: string
}

/** UK Parliament “Quick links” card — illustration block + title + description */
export function ParliamentQuickLinkCard({
  title,
  description,
  icon: Icon,
  illustrationColor,
  iconColor = '#ffffff',
  link,
  external,
  href,
}: Props) {
  const className = cn(
    'group relative flex h-full min-h-[18rem] flex-col overflow-hidden rounded-none',
    'border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]',
    'shadow-[1px_2px_4px_rgba(0,0,0,0.08)]',
    'transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
  )

  const content = (
    <>
      <span
        className="absolute bottom-0 left-0 top-0 w-[5px]"
        style={{ backgroundColor: PARLIAMENT_RESOURCE_PURPLE }}
        aria-hidden
      />
      <div
        className="ml-[5px] flex h-[7.25rem] items-center justify-center sm:h-[7.75rem]"
        style={{ backgroundColor: illustrationColor }}
      >
        <Icon
          className="h-11 w-11 sm:h-12 sm:w-12"
          style={{ color: iconColor }}
          strokeWidth={1.25}
          aria-hidden
        />
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4 pl-6">
        <div className="flex items-start justify-between gap-4">
          <h3
            className={cn(
              parliamentQuickLinkTitleClassName,
              'min-w-0 group-hover:underline',
            )}
          >
            {title}
          </h3>
          <ParliamentCardChevron className="mt-0.5" />
        </div>
        <p className={cn(parliamentQuickLinkDescriptionClassName, 'mt-3 flex-1')}>
          {description}
        </p>
      </div>
    </>
  )

  if (external && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    )
  }

  return (
    <Link to={link.to} search={link.search} className={className}>
      {content}
    </Link>
  )
}
