import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  legislationSectionClassName,
  legislationSectionTitleClassName,
} from '../lib/legislation-theme'

type AccordionProps = {
  /** Labels the group for assistive tech — the rows carry their own headings. */
  readonly label: string
  readonly children: ReactNode
}

/**
 * The follow-up rungs of the act page, in one container.
 *
 * Each of these blocks used to be its own bordered card, so four closed rows
 * cost four borders, four gaps and roughly a third of a screen to say four
 * short labels. They answer follow-up questions and none of them is the reason
 * anyone opened the page, so they belong in one list the reader can skim in a
 * single glance.
 *
 * Not `@/components/ui/accordion`: Radix animates the panel open, which means
 * measuring it, and the timeline on the Codul Fiscal is 479 rows. Rows here
 * mount their content only once opened and drop it again when closed.
 */
export function ActAccordion({ label, children }: AccordionProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={legislationSectionClassName}
    >
      {children}
    </div>
  )
}

type ItemProps = {
  readonly id: string
  readonly title: string
  /** Rendered next to the title — the count that justifies opening the row. */
  readonly meta?: ReactNode
  readonly description?: string
  readonly footnote?: ReactNode
  readonly children: ReactNode
}

/**
 * One row of `ActAccordion`.
 *
 * Rows self-suppress upstream — a band with no data returns `null` before it
 * gets here — so `last:border-b-0` lands on the last row actually rendered.
 */
export function ActAccordionItem({
  id,
  title,
  meta,
  description,
  footnote,
  children,
}: ItemProps) {
  const [open, setOpen] = useState(false)
  const panelId = `${id}-panel`

  return (
    <section
      aria-labelledby={id}
      className="border-b border-[var(--pnrr-subtle)] last:border-b-0"
    >
      <h2 id={id}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pnrr-blue)] sm:px-6"
        >
          <span className="min-w-0">
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={legislationSectionTitleClassName}>{title}</span>
              {meta ? (
                <span className="text-sm tabular-nums text-[var(--pnrr-muted)]">
                  {meta}
                </span>
              ) : null}
            </span>
            {description ? (
              <span className="mt-1 block text-sm text-[var(--pnrr-muted)]">
                {description}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              'h-5 w-5 shrink-0 text-[var(--pnrr-muted)] transition-transform',
              open ? 'rotate-180' : undefined,
            )}
            aria-hidden
          />
        </button>
      </h2>

      {open ? (
        <>
          <div id={panelId} className="border-t border-[var(--pnrr-subtle)]">
            {children}
          </div>
          {footnote ? (
            <div className="border-t border-[var(--pnrr-subtle)] px-5 py-2.5 text-xs text-[var(--pnrr-muted)] sm:px-6">
              {footnote}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
