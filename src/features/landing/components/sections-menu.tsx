import { useEffect, useId, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { Link } from '@tanstack/react-router'
import { LayoutGrid } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'
import type { LandingGroup } from '@/features/landing/lib/landing-groups'

/**
 * Every section of the platform behind one icon button, beside the hero's
 * three shortcuts: the route out of the hero for a reader whose section is not
 * one of the three. The same groups as the index further down the page, as
 * titles alone.
 *
 * On a wide screen the panel is part of the page: an absolutely placed box
 * under the button, so it scrolls with the hero exactly as the hero does. A
 * floating popover (Radix) is pinned to the window and moved by script on each
 * scroll, a frame behind the page; nothing here is positioned by script. It
 * closes on Escape, on a press or a focus outside it, and when a link is
 * followed. On a phone it is the app's bottom sheet.
 *
 * No library code the landing did not already download: the sheet comes with
 * the app shell (`docs/design/landing/design.md`, „Sections menu").
 *
 * The content is links in a `nav`, not a `menu`: they can be opened in a new
 * tab, are read out as links, and the Tab key walks them, straight on from the
 * button.
 */

/** The panel under the button, its end on the button's end; the search dropdown's outline. */
const PANEL_CLASS =
  'absolute right-0 top-full z-30 mt-1 w-[30rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-foreground/55 bg-card shadow-lg motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 origin-top-right'
/** The sheet is as tall as its list. */
const SHEET_CLASS = 'max-h-[90vh] overflow-y-auto rounded-t-3xl p-0'
/** A phone's sheet starts below Tailwind's `sm`, where the list's own layout changes. */
const SHEET_BELOW_PX = 639

type SectionsMenuProps = {
  readonly groups: readonly LandingGroup[]
  /** Placement of the button in its row. */
  readonly className?: string
}

export function SectionsMenu({ groups, className }: SectionsMenuProps) {
  const [open, setOpen] = useState(false)
  const isPhone = useWindowSize().width <= SHEET_BELOW_PX
  const root = useRef<HTMLSpanElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const list = <SectionsList groups={groups} onNavigate={() => setOpen(false)} />

  useEffect(() => {
    if (!open || isPhone) return
    const closeIfOutside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', closeIfOutside)
    document.addEventListener('focusin', closeIfOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside)
      document.removeEventListener('focusin', closeIfOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, isPhone])

  if (isPhone) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <SectionsMenuButton className={className} />
        </SheetTrigger>
        <SheetContent side="bottom" onOverlayClick={() => setOpen(false)} className={SHEET_CLASS}>
          <SheetTitle className="sr-only">{t`Toate secțiunile`}</SheetTitle>
          <SheetDescription className="sr-only">{t`Legături către fiecare secțiune a platformei.`}</SheetDescription>
          {list}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <span ref={root} className={cn('relative inline-flex', className)}>
      <SectionsMenuButton ref={button} aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen((was) => !was)} />
      {open && (
        <div id={panelId} className={PANEL_CLASS}>
          {list}
        </div>
      )}
    </span>
  )
}

/** The trigger: 44px under a thumb, 32px beside the shortcuts on a wide screen. */
function SectionsMenuButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={t`Toate secțiunile`}
      title={t`Toate secțiunile`}
      className={cn('size-11 text-muted-foreground aria-expanded:bg-secondary aria-expanded:text-foreground sm:size-8', className)}
      {...props}
    >
      <LayoutGrid aria-hidden="true" />
    </Button>
  )
}

type SectionsListProps = {
  readonly groups: readonly LandingGroup[]
  /** Closes the panel at the click: the next page can take a moment to arrive. */
  readonly onNavigate: () => void
}

/**
 * The panel's content. On a phone each group's links sit two abreast, 44px
 * tall, so the whole list fits a sheet without scrolling; on a wide screen the
 * groups flow into two columns of single-file links.
 */
function SectionsList({ groups, onNavigate }: SectionsListProps) {
  const { i18n } = useLingui()
  const id = useId()
  return (
    <>
      <p aria-hidden="true" className="border-b bg-muted/40 px-4 py-3 text-sm font-medium text-foreground">
        {t`Toate secțiunile`}
      </p>
      <nav aria-label={t`Toate secțiunile`} className="px-2 pb-4 sm:columns-2 sm:gap-x-2 sm:pb-0 sm:pt-3">
        {groups.map((group) => (
          <div key={group.key} className="break-inside-avoid pt-3 sm:pb-3 sm:pt-0">
            <p id={`${id}-${group.key}`} className="px-2 pb-1 text-xs text-muted-foreground">
              {i18n._(group.title)}
            </p>
            <ul aria-labelledby={`${id}-${group.key}`} className="grid grid-cols-2 sm:grid-cols-1">
              {group.entries.map((entry) => (
                <li key={entry.to}>
                  <Link
                    to={entry.to}
                    preload="intent"
                    onClick={onNavigate}
                    className="flex min-h-11 items-center gap-2.5 rounded-md px-2 text-sm font-medium leading-tight text-foreground transition-colors hover:bg-secondary focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring sm:min-h-9"
                  >
                    <entry.icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                    {i18n._(entry.title)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  )
}
