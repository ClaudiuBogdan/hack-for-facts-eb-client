import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Info } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { HomeSection } from '@/features/procurement/lib/home-links'

/**
 * The legislation hub's chrome without running numbers (owner, 25 November 2026: the sections as the companies
 * hub now draws them). The shared chrome gains the same switches on the companies branch (`HubSectionHead`
 * without `index`, `HomeSectionNav numbered={false}`, `HubInfoNote`); until they are on dev these are the hub's
 * own, kept here so moving to the shared ones is a change in this one file.
 */

/** A section's head: its title, named by its data, and one sentence; a switch or link beside it. */
export function LegalSectionHead({
  title,
  lede,
  aside,
  titleId,
}: {
  readonly title: ReactNode
  readonly lede?: ReactNode
  readonly aside?: ReactNode
  readonly titleId: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="min-w-0">
        <h2 id={titleId} data-reveal className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {lede ? (
          <p data-reveal className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
            {lede}
          </p>
        ) : null}
      </div>
      {aside ? <div className="w-full min-w-0 sm:w-auto sm:max-w-full">{aside}</div> : null}
    </div>
  )
}

/** The pinned bar: the page's name, then its sections by their short names, no numbers. */
export function LegalSectionNav({ title, sections }: { readonly title: string; readonly sections: readonly HomeSection[] }) {
  return (
    <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 overflow-x-auto py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground md:block md:max-w-72">{title}</span>
        <ol className="flex shrink-0 gap-4 sm:gap-5 md:ml-auto">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </RuledFrame>
    </nav>
  )
}

/**
 * A section's note behind an info button, as the companies hub keeps its notes: what a figure is and where it
 * comes from, a tap away. A tap target on a phone, a quiet glyph beside the sentence from `sm`.
 */
export function LegalInfoNote({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <Popover>
      <PopoverTrigger
        className="-my-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center align-middle text-muted-foreground hover:text-foreground sm:my-0 sm:size-6 sm:min-h-0 sm:min-w-0"
        aria-label={label}
      >
        <Info className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={label} className="w-[min(92vw,24rem)] space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </PopoverContent>
    </Popover>
  )
}
