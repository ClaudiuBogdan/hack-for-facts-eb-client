import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  legislationSectionBodyClassName,
  legislationSectionClassName,
  legislationSectionDescriptionClassName,
  legislationSectionFootnoteClassName,
  legislationSectionHeaderClassName,
  legislationSectionTitleClassName,
} from '../lib/legislation-theme'

type Props = {
  readonly id: string
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
  /** Quiet metadata under the body — provenance, caveats, query notes. */
  readonly footnote?: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly bodyClassName?: string
}

/** Shared section container for the legislation surfaces — heading, body, footnote. */
export function LegislationSection({
  id,
  title,
  description,
  action,
  footnote,
  children,
  className,
  bodyClassName,
}: Props) {
  return (
    <section
      aria-labelledby={id}
      className={cn(legislationSectionClassName, className)}
    >
      <div
        className={cn(
          legislationSectionHeaderClassName,
          action
            ? 'flex flex-wrap items-start justify-between gap-4'
            : undefined,
        )}
      >
        <div>
          <h2 id={id} className={legislationSectionTitleClassName}>
            {title}
          </h2>
          {description ? (
            <p className={legislationSectionDescriptionClassName}>
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className={cn(bodyClassName ?? legislationSectionBodyClassName)}>
        {children}
      </div>
      {footnote ? (
        <div className={legislationSectionFootnoteClassName}>{footnote}</div>
      ) : null}
    </section>
  )
}
