import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import { Check, Search } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { statisticsTheme } from '../../lib/statistics-theme'

/** Rows from the end at which the next page is asked for. */
const PREFETCH_ROWS = 40
/** A row of one line; taller rows are measured once drawn. */
const ROW_ESTIMATE_PX = 36
const PAGE_KEY_ROWS = 10

/** One pickable row. `key` is what the URL will carry. */
export type DetailOption = {
  readonly key: string
  readonly label: string
}

type Props = {
  /** Names the list for assistive tech — the axis being chosen. */
  readonly label: string
  readonly placeholder: string
  readonly draft: string
  readonly onDraftChange: (next: string) => void
  /** Everything held so far, deduplicated by key. */
  readonly options: readonly DetailOption[]
  readonly selectedKey: string | null
  readonly onPick: (option: DetailOption) => void
  /** The first page, or a query still settling: rows are not yet trusted. */
  readonly loading: boolean
  /** Rendered in the list's place; the caller says what went wrong. */
  readonly error?: ReactNode
  /** Loaded, and nothing matched. */
  readonly empty: boolean
  /** What the list says then. */
  readonly emptyLabel: string
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
  readonly fetchNextPage: () => void
  /**
   * `popover` paints a floating panel edge to edge: the search is its top
   * strip. `inline` sits inside a filter section, beside other controls, so
   * the search is a field and the rows sit in their own framed box — the
   * shape of the shared filter lists (`components/filters/base-filter`).
   */
  readonly appearance?: 'popover' | 'inline'
}

/**
 * A searched, scrolling list of options: the one list every axis of the
 * detail rail opens onto.
 *
 * It reads a page, then the next when the reader nears the end, and only
 * draws the rows in view — so a 3,000-locality axis costs the same to draw
 * as a 3-row one. The lists used to page instead, twenty rows and a
 * „1–20 din 3182" pager, which made the reader click 159 times to reach the
 * end of an axis they could have scrolled.
 *
 * Not cmdk. cmdk keeps its cursor in the DOM and walks the rendered items,
 * and a virtualised list renders only the rows in view — so the cursor would
 * have vanished with the row it sat on, and End would have stopped at the
 * overscan. This is a plain WAI-ARIA combobox: the input owns the focus,
 * `aria-activedescendant` names the row the arrows are on, and the
 * virtualiser scrolls that row into view.
 */
export function DetailOptionList({
  label,
  placeholder,
  draft,
  onDraftChange,
  options,
  selectedKey,
  onPick,
  loading,
  error,
  empty,
  emptyLabel,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  appearance = 'popover',
}: Props) {
  const inline = appearance === 'inline'
  const listId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  // The cursor opens on the row already chosen, once the rows are here: a
  // reader who opens „Sexe" with „Feminin" chosen should hear „Feminin,
  // selected", not the first row. Seeded once per mount, from the first
  // page that holds any rows.
  const [cursorSeeded, setCursorSeeded] = useState(false)
  if (!cursorSeeded && options.length > 0) {
    const chosenIndex = selectedKey === null ? -1 : options.findIndex((option) => option.key === selectedKey)
    if (chosenIndex > 0) setActiveIndex(chosenIndex)
    setCursorSeeded(true)
  }

  const virtualizer = useVirtualizer({
    count: options.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 8,
    // The row the cursor is on stays mounted wherever the wheel has taken
    // the list: `aria-activedescendant` must name an element that exists,
    // and Enter must pick a row the reader can be shown.
    rangeExtractor: (range) => {
      const indexes = defaultRangeExtractor(range)
      if (activeIndex >= range.count || indexes.includes(activeIndex)) return indexes
      return [...indexes, activeIndex].sort((left, right) => left - right)
    },
  })
  const virtualRows = virtualizer.getVirtualItems()

  // The chosen row is also shown: a cursor seeded on row 140 of a page that
  // opens on row 0 would have Enter pick a row the reader cannot see. Once,
  // when the seed lands; after that the arrows scroll as they move.
  const scrolledToSeed = useRef(false)
  useEffect(() => {
    if (!cursorSeeded || scrolledToSeed.current) return
    scrolledToSeed.current = true
    if (activeIndex > 0) virtualizer.scrollToIndex(activeIndex, { align: 'center' })
  }, [cursorSeeded, activeIndex, virtualizer])

  // The next page is asked for when the rows in view reach the end of what
  // is held. An effect, because the trigger is the scroll position — which
  // only the virtualiser sees — and not any event the list handles itself.
  // Never while loading or failed: a failed page keeps `hasNextPage`, and
  // with no rows held the end is always in view — the effect would ask
  // again on every render, over the retry button's head.
  const lastVisible = virtualRows[virtualRows.length - 1]?.index ?? -1
  const settled = !loading && !error
  useEffect(() => {
    if (!settled || !hasNextPage || isFetchingNextPage) return
    if (lastVisible >= options.length - 1 - PREFETCH_ROWS) fetchNextPage()
  }, [settled, lastVisible, options.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleDraftChange = (next: string) => {
    onDraftChange(next)
    setActiveIndex(0)
    // A new query starts at the top. Assigned, not `scrollTo`: jsdom has no
    // `scrollTo` on elements, and a search box that throws in a test is not
    // one that can be tested.
    if (listRef.current) listRef.current.scrollTop = 0
  }

  const moveTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, options.length - 1))
    setActiveIndex(clamped)
    virtualizer.scrollToIndex(clamped)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (options.length === 0) return

    switch (event.key) {
      case 'ArrowDown':
        moveTo(activeIndex + 1)
        break
      case 'ArrowUp':
        moveTo(activeIndex - 1)
        break
      case 'PageDown':
        moveTo(activeIndex + PAGE_KEY_ROWS)
        break
      case 'PageUp':
        moveTo(activeIndex - PAGE_KEY_ROWS)
        break
      case 'Home':
        moveTo(0)
        break
      case 'End':
        // The end of what is held; the effect above then reads on from there.
        moveTo(options.length - 1)
        break
      case 'Enter': {
        const option = options[activeIndex]
        if (option) onPick(option)
        break
      }
      default:
        return
    }
    event.preventDefault()
  }

  const activeOption = options[activeIndex]
  const optionId = (option: DetailOption) => `${listId}-${option.key}`

  return (
    <>
      <div
        className={cn(
          'flex items-center px-3',
          inline
            ? 'rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring'
            : 'border-b border-border/70',
        )}
      >
        <Search aria-hidden className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          type="text"
          role="combobox"
          aria-label={t`Caută în ${label}`}
          aria-expanded
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption ? optionId(activeOption) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={(event) => handleDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'flex w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground',
            inline ? 'h-9 py-2' : 'h-10 py-3',
          )}
        />
      </div>

      {loading ? (
        <div className="space-y-1 p-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : null}

      {!loading && error ? <div className="space-y-2 p-3 text-sm">{error}</div> : null}

      {!loading && !error && empty ? (
        <p className="py-6 text-center text-sm">{emptyLabel}</p>
      ) : null}

      {/* The scroller is always mounted, so the virtualiser has its element
          from the first render and the list does not jump when the first
          page lands. */}
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={label}
        className={cn(
          'overflow-y-auto overflow-x-hidden overscroll-contain p-1',
          inline && 'mt-2 rounded-md border border-border/70',
          options.length > 0 ? (inline ? 'max-h-64' : 'max-h-72') : 'max-h-0 border-0 p-0',
        )}
      >
        <div
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualRows.map((row) => {
            const option = options[row.index]
            if (!option) return null
            const chosen = option.key === selectedKey
            const isActive = row.index === activeIndex

            return (
              <div
                key={option.key}
                id={optionId(option)}
                role="option"
                // The combobox pattern: `aria-selected` follows the cursor,
                // so a reader arrowing through 3,000 localities hears
                // „selected" on the row they are on. The value already
                // chosen is the current one, marked by the check beside it.
                aria-selected={isActive}
                aria-current={chosen || undefined}
                data-index={row.index}
                data-active={isActive}
                ref={virtualizer.measureElement}
                onPointerMove={() => {
                  if (!isActive) setActiveIndex(row.index)
                }}
                onClick={() => onPick(option)}
                className={cn(
                  'absolute left-0 top-0 w-full',
                  statisticsTheme.optionRow,
                  chosen && statisticsTheme.optionRowChosen,
                )}
                style={{ transform: `translateY(${row.start}px)` }}
              >
                <Check
                  aria-hidden
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0 text-primary',
                    chosen ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="min-w-0 flex-1 leading-snug">{option.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
