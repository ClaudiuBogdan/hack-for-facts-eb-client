import { useState, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ChevronDown } from 'lucide-react'

import { plotOf } from '@/features/national-budget/analytics/lib/exact'
import { cn } from '@/lib/utils'
import { siteKeys } from '../lib/home-data'
import { moneyText } from '../lib/home-format'
import { perResident } from '../lib/per-resident'
import { leiWord, residentText } from '../lib/person-format'
import { usePageYear } from '../hooks/use-page-year'
import { Note } from './person-shell'

/**
 * The lists of lei out of 100: two lists side by side, each closed on its
 * five largest lines, one button across the width that opens both, and the
 * note on how to read them shown with the full lists. Each line is two
 * lines tall: the lei of 100, the name, the official amount; then, quiet,
 * how it moved, the amount per resident and what it holds.
 */

export type HundredPart = {
  readonly key: string
  readonly label: string
  readonly hint: string | null
  /** Lei, as printed. */
  readonly exact: string
  /** Whole lei of every 100. */
  readonly lei: number
  readonly change: string | null
  readonly fill: { readonly className?: string; readonly style?: CSSProperties }
  readonly strong?: boolean
  /** The institution's page, when the line is an institution. */
  readonly cui?: string
  /** Whole lei per resident when the line belongs to a whole apportioned so (the receipt's); else its own rounding. */
  readonly resident?: number
}

export type HundredList = { readonly title: string; readonly parts: readonly HundredPart[] }

/** How many lines a list shows before the lists are opened: the largest ones. */
const SHOWN = 5

/** The largest lines of a list, kept in the list's order (the borrowed lei stay last). */
function largestOf(parts: readonly HundredPart[]): readonly HundredPart[] {
  const keys = new Set(
    [...parts]
      .sort((a, b) => b.lei - a.lei || (plotOf(b.exact) ?? 0) - (plotOf(a.exact) ?? 0))
      .slice(0, SHOWN)
      .map((part) => part.key),
  )
  return parts.filter((part) => keys.has(part.key))
}

function Rows({ title, parts, previous, swatch }: { readonly title: string; readonly parts: readonly HundredPart[]; readonly previous: string; readonly swatch: boolean }) {
  const { view } = usePageYear()
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 divide-y border-y">
        {parts.map((part) => {
          const resident = residentText(part.resident ?? perResident(part.exact, view.year))
          const details = [part.change ? t`${part.change} față de ${previous}` : null, t`${resident} pe locuitor`, part.hint].filter(Boolean).join(' · ')
          return (
            <li key={part.key} className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2">
              {/* The figures share a right edge, whatever word follows them („lei", „de lei"). */}
              <span className="whitespace-nowrap text-base font-semibold tabular-nums">
                <span className="inline-block w-6 text-right">{part.lei || '<1'}</span>{' '}
                <span className="text-xs font-normal text-muted-foreground">{leiWord(part.lei || 1)}</span>
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
          // The lists' last row, across both columns: their rules above and below, no sides; its top rule lies on theirs.
          className="-mt-px flex h-11 w-full items-center justify-center gap-2 border-y text-sm font-medium outline-none transition-colors [overflow-anchor:none] hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          {open ? t`Arată mai puține rânduri` : t`Arată toate rândurile`}
          {open ? null : <span className="font-normal text-muted-foreground">{t`încă ${hidden}`}</span>}
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      ) : null}
      {open || hidden === 0 ? <Note>{note}</Note> : null}
    </div>
  )
}

