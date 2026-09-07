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
 * room it prefers to stay below and shrink; it flips when the room runs out,
 * and the panel follows rather than being held in place.
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
          <span className="text-muted-foreground/55">Numele instituției sau codul fiscal.</span>
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
          <span className="text-muted-foreground/55">Încearcă numele complet sau CUI-ul.</span>
        </Message>
      )

    case 'error':
      return (
        <Message>
          <span className="text-destructive">Căutarea nu a răspuns.</span>{' '}
          <span className="text-muted-foreground/55">Încearcă din nou într-un moment.</span>
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
}: {
  readonly className?: string
  readonly placeholder?: string
  readonly autoFocus?: boolean
  readonly scrollToTopOnFocus?: boolean
  readonly selectionBehavior?: EntitySelectionBehavior
  readonly onSelect?: (entity: EntitySearchNode) => void
  readonly fallback?: (term: string) => readonly EntitySearchNode[]
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
                  'h-12 rounded-lg border-input bg-card pl-10 pr-20 text-base shadow-none md:text-base',
                  // The border and the lift move together, so `transition-colors`
                  // is not enough: it would fade the border over 150ms while the
                  // shadow snapped in, which is visible on every focus.
                  'transition-[border-color,box-shadow] duration-150',
                  // Hover is a step below focus rather than a different colour,
                  // so the two read as one scale. Unfocused hover carries no
                  // contrast obligation, which is why it can sit this light.
                  'hover:border-foreground/30',
                  // Focus is one treatment that does not change when the results
                  // arrive: a neutral border and a lift, open or closed. Blue
                  // was tried and is too much colour for a surface whose point
                  // is being quiet; suppressing the indicator once the panel
                  // opened was worse, because it then vanished under a reader
                  // whose focus had not moved.
                  //
                  // This is as light as it goes. A focus indicator owes 3:1 both
                  // against what sits beside it and against its own unfocused
                  // state, and the second binds here: the resting border is
                  // already a light grey. At 55% of the foreground this is
                  // rgb(132) — 3.75:1 against the card, 3.005:1 against the
                  // resting border. /54 is 2.92 and fails. Dark mode is not the
                  // constraint (5.78 and 4.19), so light mode is what breaks if
                  // this is ever lightened again, and dark mode will not show it.
                  'focus:border-foreground/55 data-popup-open:border-foreground/55',
                  'focus:shadow-lg data-popup-open:shadow-lg',
                  // shadcn's ring is a box-shadow, so it outlines the field
                  // alone and cannot follow the join. The border replaces it.
                  'focus-visible:ring-0',
                  // Squared and opened against whichever edge the panel actually
                  // landed on. `data-popup-side` is on the input, so the field
                  // follows the panel. The border on that edge goes with it: the
                  // divider under the header is the single line between the
                  // query and the answers, and a second one here would box the
                  // field off as its own object again.
                  'data-popup-open:data-[popup-side=bottom]:rounded-b-none data-popup-open:data-[popup-side=bottom]:border-b-0',
                  'data-popup-open:data-[popup-side=top]:rounded-t-none data-popup-open:data-[popup-side=top]:border-t-0',
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
        <Autocomplete.Positioner align="start" className="z-30 outline-hidden">
          <Autocomplete.Popup
            aria-busy={isBusy || undefined}
            // Width from the anchor, height from the room the collision
            // calculation actually found — both measurements rather than the
            // guess `65vh` was. `--available-height` has to be consumed here on
            // the popup: bounding only the inner scroller leaves the popup at
            // its natural height, hanging off the bottom of the window. `flex`
            // so the header keeps its height and the list takes what is left.
            className={cn(
              'flex max-h-[var(--available-height)] w-[var(--anchor-width)] max-w-[var(--available-width)] flex-col overflow-hidden rounded-lg border bg-card',
              // The same neutral as the focused field, so the pair is one
              // continuous outline rather than two that happen to meet.
              'border-foreground/55 shadow-lg',
              // No border along the seam — the field has one there already, and
              // two stacked is a 2px rule where the design wants a single line.
              // Which edge that is comes off `data-side` rather than being
              // assumed: Base UI flips when the room below runs out, and a join
              // that assumes "below" inverts instead of moving. Pinning the
              // panel down to prevent that was tried and was worse — with the
              // field near the bottom edge it put the panel entirely off-screen,
              // zero rows reachable at three viewport heights.
              'data-[side=bottom]:rounded-t-none data-[side=bottom]:border-t-0',
              'data-[side=top]:rounded-b-none data-[side=top]:border-b-0',
              // Base UI animates with transitions rather than keyframes:
              // `data-starting-style` is the state the popup is in for one frame
              // before it opens, so a transition off it is the enter. A fade and
              // nothing else — a panel attached to the field that also rises
              // reads as sliding out from behind it, which undoes the join in
              // the one moment the reader is watching it happen.
              'transition-opacity duration-150 data-starting-style:opacity-0',
            )}
            // Reduced motion is honoured with an inline rule because it has to
            // outrank the class above, and a `motion-reduce:` utility beside it
            // is a coin flip on stylesheet order.
            style={prefersReducedMotion ? { transition: 'none' } : undefined}
          >
            {/* The only divider between the query and the answers, with the
                field standing directly on it — no seam line of its own, because
                two rules 45px apart around a tinted strip reads as a boxed-off
                row rather than as one surface. Kept rather than dropped: it
                carries the CUI column label and the stand-in-data badge, and
                that badge is not optional. */}
            <div className="flex items-baseline justify-between gap-3 border-b bg-muted/40 px-4 py-3">
              <MonoLabel className="text-muted-foreground">
                {status.kind === 'results' ? 'Rezultate' : 'Caută'}
              </MonoLabel>
              {status.kind === 'results' && status.source === 'local' ? (
                <MonoLabel className="ml-auto shrink-0 whitespace-nowrap rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-500">
                  Date locale
                  <span className="hidden sm:inline"> · API indisponibil</span>
                </MonoLabel>
              ) : null}
              <MonoLabel className="text-muted-foreground/55">CUI</MonoLabel>
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
