import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type AccordionProps = {
  /** Labels the group for assistive tech — the rows carry their own headings. */
  readonly label: string
  readonly children: ReactNode
}

/**
 * The follow-up rungs of the act page, in one list: the closing record,
 * "Fișa actului".
 *
 * Each of these blocks used to be its own bordered card, so four closed rows
 * cost four borders, four gaps and roughly a third of a screen to say four
 * short labels. They answer follow-up questions and none of them is the reason
 * anyone opened the page, so they belong in one list the reader can skim in a
 * single glance.
 *
 * The group has no frame of its own (owner, 26 November 2026, the act page's
 * redesign: "folding sections with counts"): the section around it carries the
 * heading and its rule, and each row opens with a hairline.
 *
 * Not `@/components/ui/accordion`: Radix animates the panel open, which means
 * measuring it, and the timeline on the Codul Fiscal is 479 rows. Rows here
 * mount their content only once opened and drop it again when closed.
 */
export function ActAccordion({ label, children }: AccordionProps) {
  return (
    <div role="group" aria-label={label}>
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
  /**
   * Open at the first render, on the server too: for the rows a reader most
   * often needs (owner, 26 November 2026). Closing it still drops its body.
   */
  readonly defaultOpen?: boolean
  readonly children: ReactNode
}

/**
 * One row of `ActAccordion`: a hairline, then a head the row's full width that
 * folds the body open and shut.
 *
 * Rows self-suppress upstream — a band with no data returns `null` before it
 * gets here. The title is an `h3`: the page's `h2` is "Fișa actului". The
 * keyboard focus ring is the site's own (`*:focus-visible` in `index.css`).
 */
export function ActAccordionItem({
  id,
  title,
  meta,
  description,
  footnote,
  defaultOpen = false,
  children,
}: ItemProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = `${id}-panel`

  return (
    <section aria-labelledby={id} className="border-t">
      <h3 id={id}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-12 w-full items-center gap-2 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          <span className="min-w-0 flex-1">
            {title}
            {/* A space, not only padding: the head's accessible name reads
                "title count", never the two run together. */}
            {meta ? ' ' : null}
            {meta ? (
              <span className="pl-1 font-normal tabular-nums text-muted-foreground">
                {meta}
              </span>
            ) : null}
            {description ? (
              <span className="mt-0.5 block text-xs font-normal leading-5 text-muted-foreground">
                {description}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              open ? 'rotate-180' : undefined,
            )}
            aria-hidden
          />
        </button>
      </h3>

      {open ? (
        <div id={panelId} className="min-w-0 pb-5 text-sm leading-6">
          {children}
          {footnote ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {footnote}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
