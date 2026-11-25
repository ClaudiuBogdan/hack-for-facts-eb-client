import { useEffect, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Info } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { LegalHubSection } from './legislation-hub-lib'

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

/** The reading line: a quarter of the way down the window. */
const READING_LINE = 0.25

/**
 * The section a reader is in: the first section, in page order, crossing a thin band at the reading line; with
 * none crossing it (a gap, a short section scrolled past), the last one whose top has passed the line; above the
 * first section, none. The sections crossing the band are kept as a set and the current one is chosen once per
 * batch of entries, so a section that leaves while another is still in the band never clears the mark. The band is
 * set in pixels from the window's height (a percentage margin misplaces it on tall phones) and rebuilt when the
 * height changes.
 */
function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join(' ')
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const order = key.split(' ')
    const inside = new Set<string>()
    let observer: IntersectionObserver | null = null
    let height = -1
    const pick = (): string | null => {
      const first = order.find((id) => inside.has(id))
      if (first !== undefined) return first
      const line = window.innerHeight * READING_LINE
      let passed: string | null = null
      for (const id of order) {
        const element = document.getElementById(id)
        if (element && element.getBoundingClientRect().top <= line) passed = id
      }
      return passed
    }
    const build = () => {
      if (window.innerHeight === height) return
      height = window.innerHeight
      observer?.disconnect()
      inside.clear()
      const top = Math.round(height * READING_LINE)
      const bottom = Math.max(0, height - top - 2)
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) inside.add(entry.target.id)
            else inside.delete(entry.target.id)
          }
          setActive(pick())
        },
        { rootMargin: `-${top}px 0px -${bottom}px 0px` },
      )
      for (const id of order) {
        const element = document.getElementById(id)
        if (element) observer.observe(element)
      }
    }
    build()
    window.addEventListener('resize', build)
    return () => {
      window.removeEventListener('resize', build)
      observer?.disconnect()
    }
  }, [key])
  return active
}

/**
 * The pinned bar, as the national budget page draws it: the page's name, then its sections by their short names,
 * each after its icon, no numbers; the section the reader is in is underlined.
 */
export function LegalSectionNav({ title, sections }: { readonly title: string; readonly sections: readonly LegalHubSection[] }) {
  const active = useActiveSection(sections.map((section) => section.id))
  return (
    <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden shrink-0 text-sm font-semibold tracking-tight text-foreground md:block">{title}</span>
        <ol className="-mx-2.5 flex min-w-0 overflow-x-auto md:ml-auto md:mr-0">
          {sections.map((section) => {
            const current = active === section.id
            return (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  aria-current={current ? 'location' : undefined}
                  className={cn(
                    // the row scrolls sideways, so an outward focus outline would be clipped: drawn inside
                    'relative inline-flex h-12 items-center gap-2 px-2.5 text-sm transition-colors hover:text-foreground focus-visible:-outline-offset-2',
                    // the underline fades only where motion is welcome
                    'after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0 motion-safe:after:transition-opacity',
                    current ? 'text-foreground after:opacity-100' : 'text-muted-foreground',
                  )}
                >
                  <section.icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  {section.label}
                </a>
              </li>
            )
          })}
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
