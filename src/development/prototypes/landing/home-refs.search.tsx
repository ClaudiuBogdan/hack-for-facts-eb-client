import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Autocomplete } from '@base-ui/react/autocomplete'
import type { BaseUIEvent } from '@base-ui/react/types'
import { Loader2, Search, X } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import type { EntitySelectionBehavior } from '@/lib/entity-navigation'
import type { EntitySearchNode } from '@/schemas/entities'
import { MonoLabel } from './home-refs.mono-label'
import {
  announcement,
  destinationFor,
  Message,
  ResultRowContent,
  resultRowClass,
  shortHint,
  Skeleton,
  useModifierKey,
  usePrefersReducedMotion,
} from './home-refs.search-parts'
import { useEntitySelection, useSearchResults } from './home-refs.search-state'
import type { SearchStatus } from './home-refs.search-state'

/**
 * The hero search and its results, on Base UI `Autocomplete`.
 *
 * Chosen over three alternatives that were built and measured side by side —
 * a hand-rolled combobox on Radix Popover, cmdk, and downshift — and the
 * reasoning is kept in `docs/design/landing-search-comparison.md` so it does
 * not have to be rediscovered. The short version:
 *
 * **`filter={null}` is a first-class server-driven mode**, not filtering
 * switched off. The list is `items`, in the order the API returned it.
 *
 * **Every change carries a `reason`** — `escape-key`, `item-press`,
 * `link-press`, `outside-press`, `focus-out`. Two-stage Escape becomes one
 * comparison instead of a fight with the layer, which is what it was on Radix,
 * where Escape fired from the document and flushed React state before the
 * input's own handler ran, collapsing both stages into one press.
 *
 * **Items take a `render` prop**, so an option genuinely *is* a TanStack
 * `Link` — the DOM has `<a role="option">`. That keeps `preload="intent"` and
 * keeps Cmd-click opening a new tab, which cmdk cannot do at all: it claims the
 * click for `onSelect` and a modified click navigates away in the current tab.
 *
 * **The popup reports the room it found**, as `--available-height` — consumed
 * on the popup itself below, because bounding only an inner scroller leaves the
 * popup at its natural height and hanging off the bottom of the window. Given
 * room it prefers to stay below and shrink; it still flips when the room runs
 * out, which is why the joined variant pins it.
 *
 * Written against the same prop contract as the shipped
 * `src/components/entities/EntitySearch`, so promoting it is a file move plus
 * wrapping the strings in Lingui macros. They are plain Romanian here because
 * running the extract cycle rewrites both catalogs, and a prototype should not
 * be why a translation file changes.
 *
 * Layout is the caller's — no `max-w-3xl mx-auto pt-8` baked in. That was what
 * forced the landing to reach into the shipped component with `[&_input]:`
 * descendant selectors, a hack that outranked the component's own classes and
 * broke silently when its internals moved.
 */
function SearchStatusView({ status }: { readonly status: SearchStatus }) {
  switch (status.kind) {
    case 'short':
      return (
        <Message>
          {shortHint(status.remaining)}{' '}
          <span className="text-muted-foreground/70">Numele instituției sau codul fiscal.</span>
        </Message>
      )

    case 'pending':
    case 'loading':
      return <Skeleton />

    case 'results':
      // The rows come from the always-mounted list below; nothing extra here.
      return null

    case 'empty':
      return (
        <Message>
          Nicio instituție pentru{' '}
          <strong className="font-medium text-foreground">{status.term}</strong>.{' '}
          <span className="text-muted-foreground/70">Încearcă numele complet sau CUI-ul.</span>
        </Message>
      )

    case 'error':
      return (
        <Message>
          <span className="text-destructive">Căutarea nu a răspuns.</span>{' '}
          <span className="text-muted-foreground/70">Încearcă din nou într-un moment.</span>
        </Message>
      )

    case 'idle':
    default:
      return null
  }
}

export function LandingSearch({
  className,
  placeholder = 'Caută o instituție sau CUI...',
  autoFocus,
  scrollToTopOnFocus,
  selectionBehavior = 'navigate-to-preferred-entity',
  onSelect,
  fallback,
  joined = false,
}: {
  readonly className?: string
  readonly placeholder?: string
  readonly autoFocus?: boolean
  readonly scrollToTopOnFocus?: boolean
  readonly selectionBehavior?: EntitySelectionBehavior
  readonly onSelect?: (entity: EntitySearchNode) => void
  readonly fallback?: (term: string) => readonly EntitySearchNode[]
  /**
   * Whether the panel is attached to the field or floats below it.
   *
   * Detached (the default) the panel is a layer over the page: an 8px gap, a
   * radius all round, and it rises 4px as it fades in. Joined, the two are one
   * surface — the field's bottom corners square off while it is open, the panel
   * takes no top border of its own, and the field's bottom border becomes the
   * seam between the question and the answers.
   *
   * Only this attachment changes. The rows, the header, the states and the
   * keyboard are shared, so comparing the two is comparing one thing.
   *
   * This is the shape Base UI's collision handling actually suits. Radix flips
   * a panel that will not fit above the field, which would tear a joined pair
   * apart; Base UI keeps it attached and shrinks it instead, so the join
   * survives a short window rather than being the first thing to break in one.
   */
  readonly joined?: boolean
}) {
  const { term, setTerm, status, results, source, isCurrent } = useSearchResults({ fallback })
  const commit = useEntitySelection({ selectionBehavior, onSelect, source })

  const [isOpen, setIsOpen] = useState(false)
  // Which row the keyboard is on, if any. Kept in a ref rather than in state
  // because only the Enter handler reads it, and re-rendering the whole field
  // on every arrow key to store something nothing draws would be waste.
  const highlightedRef = useRef<EntitySearchNode | undefined>(undefined)
  const modifier = useModifierKey()
  const prefersReducedMotion = usePrefersReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useHotkeys('mod+k', (event) => {
    event.preventDefault()
    inputRef.current?.focus()
  })

  const isBusy = status.kind === 'loading' || (status.kind === 'results' && status.stale)
  const isDropdownOpen = isOpen && status.kind !== 'idle'
  const visibleResults = status.kind === 'results' ? (status.results as EntitySearchNode[]) : []

  return (
    <Autocomplete.Root
      // What the list may draw, which is not always what the query holds:
      // `keepPreviousData` keeps the previous term's rows around, and in the
      // `short` state those must not reappear under a two-character query.
      items={visibleResults}
      // The list is the server's answer, in the server's order. Filtering it
      // again on the client would silently drop rows the API chose to return.
      filter={null}
      value={term}
      onValueChange={(next) => {
        setTerm(next)
        setIsOpen(true)
      }}
      open={isDropdownOpen}
      onOpenChange={(next, details) => {
        if (next) {
          setIsOpen(true)
          return
        }
        setIsOpen(false)
        // Escape in two stages, expressed as one comparison. The first press
        // arrives here with the list open and only closes it; the second
        // arrives with nothing open, so the input handler below clears.
        if (details.reason === 'escape-key' && !isDropdownOpen) setTerm('')
      }}
      itemToStringValue={(entity: EntitySearchNode) => entity.name}
      onItemHighlighted={(entity) => {
        highlightedRef.current = entity
      }}
      openOnInputClick={false}
      // No row is preselected. Auto-highlighting the first result makes Enter
      // act on a guess, which is the same defect the hand-rolled version had to
      // gate against explicitly.
      autoHighlight={false}
    >
      <div ref={containerRef} className={cn('relative w-full', className)}>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Autocomplete.Input
            render={
              <Input
                ref={inputRef}
                autoFocus={autoFocus}
                onFocus={() => {
                  if (scrollToTopOnFocus) {
                    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                  setIsOpen(true)
                }}
                onKeyDown={(event: BaseUIEvent<KeyboardEvent<HTMLInputElement>>) => {
                  // ArrowUp with the highlight already back in the field ends
                  // the walk there.
                  //
                  // Base UI's Autocomplete exposes no `loop` control, and its
                  // default sends the highlight round to the last row — so a
                  // reader who presses Up once more than they needed, trying to
                  // get back to what they typed, is thrown to the bottom of the
                  // list instead. Down walks into the results, Up walks back
                  // out, and the field is where the walk stops.
                  //
                  // `preventDefault()` does not do this. Base UI merges the
                  // handler passed through `render` with its own and runs both
                  // regardless; opting its handler out is a separate call, and
                  // measuring was the only way to find that out — the guard ran
                  // on every press and the highlight moved anyway.
                  if (event.key === 'ArrowUp' && isDropdownOpen && !highlightedRef.current) {
                    event.preventBaseUIHandler()
                    return
                  }

                  // The second stage. Base UI has already closed the popup, so
                  // by the time Escape reaches a closed input the reader is
                  // asking for the field itself to be emptied.
                  if (event.key === 'Escape' && !isDropdownOpen) {
                    setTerm('')
                    return
                  }
                  if (event.key !== 'Enter') return

                  // Enter on a closed field with a term still in it reopens the
                  // list, which is what makes the first Escape reversible.
                  if (!isDropdownOpen) {
                    if (term.trim().length === 0) return
                    event.preventDefault()
                    setIsOpen(true)
                    return
                  }

                  // Enter with a row highlighted is Base UI's to handle — it
                  // presses the item, the item is an anchor, the router
                  // navigates. Only the *unhighlighted* case is ours.
                  if (highlightedRef.current) return

                  // Enter with nothing highlighted takes the first result, but
                  // only once the list is known to answer what is in the box.
                  // Without the gate, typing 'Cluj', pausing, adding ' N' and
                  // pressing Enter opens the first result for 'Cluj'. Nothing
                  // is auto-highlighted precisely so that this stays a decision
                  // rather than a side effect of results arriving.
                  if (!isCurrent) return
                  const first = results[0]
                  if (!first) return
                  event.preventDefault()
                  commit(first)
                  setTerm('')
                  setIsOpen(false)
                }}
                className={cn(
                  'h-12 rounded-lg border-input bg-card pl-10 pr-20 text-base shadow-none transition-colors hover:border-ring/50 focus:border-ring md:text-base',
                  // `data-popup-open` is on the input itself, so the field
                  // squares off only while there is something below it to
                  // square off against, and rounds again the moment the panel
                  // closes. The border goes to `ring` with it: the panel below
                  // carries the same colour, and a focused blue field seamed to
                  // a grey panel would draw the join it is trying to hide.
                  joined && 'data-popup-open:rounded-b-none data-popup-open:border-ring',
                )}
              />
            }
            placeholder={placeholder}
            aria-label={placeholder}
          />

          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {isBusy ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
            ) : null}
            {term ? (
              <Autocomplete.Clear
                aria-label="Șterge căutarea"
                // Base UI keeps this out of the tab order. Defensible — Escape
                // twice also clears, so the function is reachable — but it is a
                // visible control, and a sighted keyboard user who can see a
                // button and cannot reach it has been told the interface is
                // lying. Escape stays the faster path; this is the discoverable
                // one.
                tabIndex={0}
                className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </Autocomplete.Clear>
            ) : (
              <kbd className="hidden items-center gap-0.5 rounded-sm border bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground sm:flex">
                <span className={modifier === '⌘' ? 'text-xs leading-none' : undefined}>
                  {modifier}
                </span>
                K
              </kbd>
            )}
          </div>
        </div>

        <p aria-live="polite" className="sr-only">
          {isDropdownOpen ? announcement(status) : ''}
        </p>
      </div>

      <Autocomplete.Portal>
        <Autocomplete.Positioner
          sideOffset={joined ? 0 : 8}
          align="start"
          // Joined, the panel is pinned below the field and never flips.
          //
          // Base UI does flip — the claim that it only ever shrinks was made
          // from one measurement on a page where it happened not to. Sixteen
          // pixels of extra chrome above the field was enough to send it above,
          // and a joined panel that flips is worse than a floating one that
          // does: it detaches from the field, squares the wrong two corners and
          // drops the wrong border, so the join inverts rather than moves.
          //
          // `side: 'none'` keeps it below and lets `--available-height` do the
          // work instead, which is the behaviour the join was designed around.
          // The cost is real and worth stating: in a short window the panel
          // shrinks to a scroller rather than moving somewhere roomier, so the
          // reader sees fewer rows at once. Attached-and-shorter beats
          // detached-and-taller when the attachment is the design.
          collisionAvoidance={
            joined ? { side: 'none', align: 'shift', fallbackAxisSide: 'none' } : undefined
          }
          className="z-30 outline-hidden"
        >
          <Autocomplete.Popup
            aria-busy={isBusy || undefined}
            // Width from the anchor, height from the room the collision
            // calculation actually found. Both are measurements rather than
            // guesses, which is what `65vh` was.
            // Base UI *shrinks* where Radix flips: rather than moving the
            // popup above the field when there is no room below, it reports the
            // room it found and expects the popup to fit itself into it. That
            // is only true if `--available-height` is actually consumed, and it
            // has to be consumed here on the popup — bounding an inner scroller
            // alone leaves the popup at its natural height and hanging off the
            // bottom of the window, which is exactly what the first measurement
            // showed. `flex` so the header keeps its height and the list takes
            // what is left.
            className={cn(
              'flex max-h-[var(--available-height)] w-[var(--anchor-width)] max-w-[var(--available-width)] flex-col overflow-hidden rounded-lg border bg-card shadow-md',
              // One surface: no top border, because the field already has a
              // bottom one and two of them stacked is a 2px rule where the
              // design wants a seam.
              joined && 'rounded-t-none border-t-0 border-ring',
              // Base UI animates with transitions rather than keyframes:
              // `data-starting-style` is the state the popup is in for one
              // frame before it opens, so a transition off it is the enter. A
              // 4px rise and a fade, 150ms, and no scale — at tooltip width a
              // 95% zoom is a flourish, at field width it is thirty pixels of
              // horizontal growth and reads as the list arriving from
              // somewhere rather than opening where it already is.
              // A 4px rise is right for a panel that arrives over the page and
              // wrong for one that is attached to the field: a joined panel
              // that rises reads as sliding out from behind the input, which
              // undoes the join in the one moment the reader is watching it.
              // Fade only.
              joined
                ? 'transition-opacity duration-150 data-starting-style:opacity-0'
                : 'transition-[opacity,translate] duration-150 data-starting-style:-translate-y-1 data-starting-style:opacity-0',
            )}
            // Reduced motion is honoured with an inline rule because it has to
            // outrank the class above, and a `motion-reduce:` utility beside it
            // is a coin flip on stylesheet order.
            style={prefersReducedMotion ? { transition: 'none' } : undefined}
          >
            <div
              className={cn(
                'flex items-baseline justify-between gap-3 border-b px-4 py-3',
                // Directly under the field with no gap, the header would read
                // as an orphan first row. Tinted, it reads as the shoulder
                // between the field and the answers. It is kept rather than
                // dropped because it carries the CUI column label and the
                // stand-in-data badge, and that badge is not optional.
                joined && 'bg-muted/30',
              )}
            >
              <MonoLabel className="text-muted-foreground">
                {status.kind === 'results' ? 'Rezultate' : 'Caută'}
              </MonoLabel>
              {status.kind === 'results' && status.source === 'local' ? (
                <MonoLabel className="ml-auto shrink-0 whitespace-nowrap rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-500">
                  Date locale
                  <span className="hidden sm:inline"> · API indisponibil</span>
                </MonoLabel>
              ) : null}
              <MonoLabel className="text-muted-foreground/60">CUI</MonoLabel>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {/* Always mounted, even with nothing in it.
                  `aria-controls` on the field points at this list, so in the
                  four states that draw a message rather than rows — short,
                  pending, empty, error — rendering it conditionally left the
                  field announcing an open popup and naming an id that was not
                  in the document. That is the same defect the hand-rolled
                  version shipped, arriving here through the library's wiring
                  instead of through ours. */}
              <Autocomplete.List
                className={cn(
                  'transition-opacity',
                  status.kind === 'results' && status.stale && 'opacity-50',
                )}
              >
                {(entity: EntitySearchNode) => (
                  <Autocomplete.Item
                    key={entity.cui}
                    value={entity}
                    className={resultRowClass}
                    // The anchor navigates, so the recorder is told to skip it.
                    // Cmd-click then works for free: the browser opens a tab,
                    // the router never runs, the selection is still counted.
                    onClick={() => {
                      commit(entity, { skipNavigate: true })
                      setTerm('')
                      setIsOpen(false)
                    }}
                    // `render` is what lets the option *be* the anchor rather
                    // than contain one, which is what keeps `preload="intent"`
                    // and Cmd-click working.
                    render={
                      <Link
                        to={destinationFor(entity, selectionBehavior) as '/'}
                        preload="intent"
                      />
                    }
                  >
                    <ResultRowContent entity={entity} query={term.trim()} />
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>

              <SearchStatusView status={status} />
            </div>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  )
}
