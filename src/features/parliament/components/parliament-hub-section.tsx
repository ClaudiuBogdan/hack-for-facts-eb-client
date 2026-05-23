import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  parliamentHubDescriptionClassName,
  parliamentHubSectionBodyClassName,
  parliamentHubSectionClassName,
  parliamentHubSectionHeaderClassName,
  parliamentHubTitleClassName,
} from '../lib/hub-theme'

type Props = {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly bodyClassName?: string
  readonly hideHeader?: boolean
}

/** Shared PNRR-style section shell for the Parlament hub */
export function ParliamentHubSection({
  id,
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  hideHeader = false,
}: Props) {
  return (
    <section
      aria-labelledby={id}
      className={cn(parliamentHubSectionClassName, className)}
    >
      {hideHeader ? null : (
        <div
          className={cn(
            parliamentHubSectionHeaderClassName,
            action ? 'flex flex-wrap items-start justify-between gap-4' : undefined,
          )}
        >
          <div>
            <h2 id={id} className={parliamentHubTitleClassName}>
              {title}
            </h2>
            {description ? (
              <p className={parliamentHubDescriptionClassName}>{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      <div className={cn(bodyClassName ?? parliamentHubSectionBodyClassName)}>
        {children}
      </div>
    </section>
  )
}
