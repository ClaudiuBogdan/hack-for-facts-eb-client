import { useEffect, useRef, type ReactNode, type Ref } from 'react'
import type { LucideIcon } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn } from '@/lib/utils'
import { useActiveSection } from '../hooks/use-active-section'

/** A band in a companies page's pinned bar: its anchor, its short name (resolved at render) and its icon. */
export interface CompanyBarSection {
  readonly id: string
  readonly label: string
  readonly icon: LucideIcon
}

// The row scrolls sideways on a phone, so an outward focus outline would be clipped: it is drawn inside.
const ITEM_CLASS = 'relative inline-flex h-12 items-center gap-2 px-2.5 text-sm focus-visible:-outline-offset-2'

/**
 * The bar's frame: the name on the left from `md`, the list on the right; only the list scrolls sideways on a
 * phone, smoothly unless reduced motion is asked for (CSS alone, no script reads the preference).
 */
function BarFrame({ name, listRef, children }: { readonly name: ReactNode; readonly listRef?: Ref<HTMLOListElement>; readonly children: ReactNode }) {
  return (
    <RuledFrame className="flex items-center gap-6 py-0">
      <span className="hidden min-w-0 truncate text-sm font-semibold tracking-tight text-foreground md:block md:max-w-72">{name}</span>
      <ol ref={listRef} className="relative -mx-2.5 flex min-w-0 scroll-smooth overflow-x-auto motion-reduce:scroll-auto md:ml-auto md:mr-0">
        {children}
      </ol>
    </RuledFrame>
  )
}

/**
 * A companies page's pinned bar, as the national budget page draws its own (owner, 25 November 2026): the
 * page's name, then its bands, each after its icon, the one being read underlined. On a phone, when the band
 * being read changes, the list (alone: never the page, never focus) brings its link to the middle, so the
 * reader always sees where they are; it runs only on that change, no scroll listener. Mounted with the bands,
 * so the sections it watches are there when it starts.
 */
export function CompanySectionBar({ name, sections }: { readonly name: ReactNode; readonly sections: readonly CompanyBarSection[] }) {
  const active = useActiveSection(sections.map((section) => section.id))
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const element = list.current
    const link = active && element ? element.querySelector<HTMLElement>(`a[href="#${active}"]`) : null
    // `scrollIntoView` or `focus()` would scroll the window too, and the page would jerk.
    if (element && link) element.scrollTo({ left: link.offsetLeft - (element.clientWidth - link.offsetWidth) / 2 })
  }, [active])
  return (
    <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <BarFrame name={name} listRef={list}>
        {sections.map((section) => {
          const current = active === section.id
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                aria-current={current ? 'location' : undefined}
                className={cn(
                  ITEM_CLASS,
                  'transition-colors hover:text-foreground',
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
      </BarFrame>
    </nav>
  )
}

/**
 * The bar while the page loads: the same frame and words, inert (no anchor offers a band that has not arrived,
 * and its scrolling list takes neither focus nor a drag), the icons faint. `name` may be a pulse while the
 * page's name is not known.
 */
export function CompanySectionBarPending({ name, sections }: { readonly name: ReactNode; readonly sections: readonly CompanyBarSection[] }) {
  return (
    <div className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur" aria-hidden="true" inert>
      <BarFrame name={name}>
        {sections.map((section) => (
          <li key={section.id} className="shrink-0">
            <span className={cn(ITEM_CLASS, 'text-muted-foreground')}>
              <section.icon className="size-4 shrink-0 text-primary/50" />
              {section.label}
            </span>
          </li>
        ))}
      </BarFrame>
    </div>
  )
}
