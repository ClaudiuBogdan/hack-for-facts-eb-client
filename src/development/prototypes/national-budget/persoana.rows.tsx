import { useState, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'

import { siteKeys, type YearView } from '@/features/national-budget/home/lib/home-data'
import { moneyText } from '@/features/national-budget/home/lib/home-format'
import { cn } from '@/lib/utils'
import { leiText, leiWord, perPerson } from './persoana.data'
import { Note, usePersonYear } from './persoana.shell'

/**
 * The working version's lists of lei out of 100: two lists side by side, each
 * closed on its five largest lines (owner: the full lists were too big), one
 * button across the width that opens both and closes them again (owner: one
 * button, not one per list), and the note on how to read the figures shown
 * with the full lists only (owner: keep the closed section clean).
 */

export type HundredPart = {
  readonly key: string
  readonly label: string
  readonly hint: string | null
  readonly exact: string
  /** Whole lei of every 100. */
  readonly lei: number
  readonly change: string | null
  readonly fill: { readonly className?: string; readonly style?: CSSProperties }
  readonly strong?: boolean
  /** The institution's page, when the line is an institution. */
  readonly cui?: string
}

export type HundredList = { readonly title: string; readonly parts: readonly HundredPart[] }

/** How many lines a list shows before the lists are opened: the largest ones. */
const SHOWN = 5

/** The largest lines of a list, kept in the list's order (the borrowed lei stay last). */
function largestOf(parts: readonly HundredPart[]): readonly HundredPart[] {
  const keys = new Set(
    [...parts]
      .sort((a, b) => b.lei - a.lei || Number(b.exact) - Number(a.exact))
      .slice(0, SHOWN)
      .map((part) => part.key),
  )
  return parts.filter((part) => keys.has(part.key))
}

/** „5.212 lei", or „sub 1 leu" for an amount that rounds to nothing. */
function perResident(exact: string, view: YearView): string {
  const lei = perPerson(exact, view)
  return lei !== null && lei < 0.5 ? 'sub 1 leu' : leiText(lei)
}

/**
 * A list's lines, two lines each (owner: clean and compact, no bars): the
 * lei of 100, what the line is and its official amount; under them, in one
 * quiet line, how it moved, the amount per resident and what the line holds
 * (cut at the line's end, whole on hover). `swatch` shows the line's colour,
 * the key to a chart above; a list with no chart has none.
 */
function Rows({ title, parts, previous, swatch }: { readonly title: string; readonly parts: readonly HundredPart[]; readonly previous: string; readonly swatch: boolean }) {
  const { view } = usePersonYear()
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 divide-y border-y">
        {parts.map((part) => {
          const details = [part.change ? `${part.change} față de ${previous}` : null, `${perResident(part.exact, view)} pe locuitor`, part.hint].filter(Boolean).join(' · ')
          return (
            <li key={part.key} className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2">
              {/* The figures share a right edge, whatever word follows them („lei", „de lei"). */}
              <span className="whitespace-nowrap text-base font-semibold tabular-nums">
                <span className="inline-block w-6 text-right">{part.lei || '<1'}</span> <span className="text-xs font-normal text-muted-foreground">{part.lei ? leiWord(part.lei) : 'leu'}</span>
              </span>
              <span className="flex min-w-0 items-baseline gap-2 text-sm">
                {swatch ? <span className={cn('size-2.5 shrink-0 translate-y-px rounded-[2px]', part.fill.className)} style={part.fill.style} aria-hidden="true" /> : null}
                {part.cui ? (
                  <Link to="/entities/$cui" params={{ cui: part.cui }} search={((before: Record<string, unknown>) => siteKeys(before)) as never} className="transition-colors hover:text-primary sm:truncate">
                    {part.label}
                  </Link>
                ) : (
                  <span className={cn('sm:truncate', part.strong && 'font-semibold')}>{part.label}</span>
                )}
              </span>
              <span className="whitespace-nowrap text-right text-sm tabular-nums">{moneyText(part.exact)}</span>
              <span className="col-span-2 col-start-2 truncate text-xs text-muted-foreground" title={details}>
                {details}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function TwoLists({
  left,
  right,
  previous,
  note,
  swatches = true,
  className,
}: {
  readonly left: HundredList
  readonly right: HundredList
  /** What a change is measured against: „2024", „aceleași luni din 2025". */
  readonly previous: string
  /** How to read the figures; shown with the full lists. */
  readonly note: ReactNode
  /** Each line's colour as a small square: the key to a chart above the lists. */
  readonly swatches?: boolean
  readonly className?: string
}) {
  const [open, setOpen] = useState(false)
  const shown = (list: HundredList) => (open ? list.parts : largestOf(list.parts))
  const hidden = left.parts.length + right.parts.length - largestOf(left.parts).length - largestOf(right.parts).length
  // Closing takes rows away above the button; the page is moved by as much, so the button stays under the pointer.
  const toggle = (button: HTMLButtonElement) => {
    const before = button.getBoundingClientRect().top
    flushSync(() => setOpen((was) => !was))
    if (open) window.scrollBy(0, button.getBoundingClientRect().top - before)
  }
  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-2">
        <Rows title={left.title} parts={shown(left)} previous={previous} swatch={swatches} />
        <Rows title={right.title} parts={shown(right)} previous={previous} swatch={swatches} />
      </div>
      {hidden > 0 ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={(event) => toggle(event.currentTarget)}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border text-sm font-medium outline-none transition-colors [overflow-anchor:none] hover:border-foreground/30 focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {open ? 'Arată mai puține rânduri' : 'Arată toate rândurile'}
          {open ? null : <span className="font-normal text-muted-foreground">încă {hidden}</span>}
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      ) : null}
      {open || hidden === 0 ? <Note>{note}</Note> : null}
    </div>
  )
}
