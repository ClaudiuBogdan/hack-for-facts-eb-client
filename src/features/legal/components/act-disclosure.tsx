import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  legislationSectionClassName,
  legislationSectionTitleClassName,
} from '../lib/legislation-theme'

type Props = {
  readonly id: string
  readonly title: string
  /** Rendered next to the title — the count that justifies opening it. */
  readonly meta?: ReactNode
  readonly description?: string
  readonly footnote?: ReactNode
  readonly defaultOpen?: boolean
  readonly children: ReactNode
}

/**
 * Rung 4 wrapper — a band that is closed until asked for.
 *
 * The whole rung exists only for acts that have the data (see the thresholds in
 * `docs/design/legal/act-detail.md` §5), so this component is never rendered
 * empty. It is closed by default because these blocks answer follow-up
 * questions, not the first one: a reader who wants the plain summary should not
 * have to scroll past 479 timeline entries to leave.
 *
 * Plain `<button>` + conditional render rather than Radix Collapsible: the
 * content is heavy (hundreds of rows) and there is no animation to coordinate,
 * so keeping it out of the DOM until opened is both simpler and cheaper.
 */
export function ActDisclosure({
  id,
  title,
  meta,
  description,
  footnote,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = `${id}-panel`

  return (
    <section aria-labelledby={id} className={legislationSectionClassName}>
      <h2 id={id}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] sm:px-6"
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
          <div id={panelId} className="border-t-2 border-[var(--pnrr-border)]">
            {children}
          </div>
          {footnote ? (
            <div className="border-t-2 border-[var(--pnrr-border)] px-5 py-2.5 text-xs text-[var(--pnrr-muted)] sm:px-6">
              {footnote}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
