import { useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import { Link } from '@tanstack/react-router'
import { Autocomplete } from '@base-ui/react/autocomplete'
import type { BaseUIEvent } from '@base-ui/react/types'
import { Loader2, Search, X } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { cn } from '@/lib/utils'
import type { EntitySearchHit } from '@/schemas/entity-search'
import { MonoLabel } from './home-refs.mono-label'
import { describeScope } from './home-refs.search-filters'
import type { SearchFilter } from './home-refs.search-filters'
import {
  announcement,
  FilterChip,
  FilterSuggestionContent,
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
 * **Filters are suggested, then worn as chips** — Gmail's labels. Type `firma
 * dedeman` and the list opens with a *Firme* row above the results; accept it
 * and `firma` leaves the text and becomes a chip in the field, the results
 * narrow to companies, and the query that goes out is `dedeman`. The vocabulary
 * and the narrowing live in `home-refs.search-filters.ts`; what this file owns
 * is the two places a filter is drawn and the three ways it moves — accepted
 * from the list, removed from its own button, removed by Backspace on an empty
 * field. Suggestions are real options in their own group, so the arrow keys
 * reach them and Enter accepts them; a row of buttons above the list would have
 * needed a second keyboard model. Two Base UI defaults are opted out of for
 * them: an item press fills the input with the item's text, which
 * `onValueChange` ignores by reason, and closes the popup, which `onOpenChange`
 * ignores when the pressed item was a filter — the chip has just changed what
 * the list means, and the reader should see the list change.
 *
 * **The field is `Autocomplete.InputGroup`, not the input.** Chips sit inside
 * the border, so the border has to belong to something that contains both, and
 * the popup has to be as wide as that something. Base UI anchors the popup to
 * the group when there is one, and puts the open/side state attributes on it,
 * so the joined-panel styling below moved from the input to the group without
 * changing.
 *
 * Layout is the caller's — no `max-w-3xl mx-auto pt-8` baked in. That was what
 * forced the landing to reach into the shipped component with `[&_input]:`
 * descendant selectors, a hack that outranked the component's own classes and
 * broke silently when its internals moved.
 */

/** What the list can hold: a filter to accept, or an entity to open. */
type ListItem = SearchFilter | EntitySearchHit
type ListGroup =
  | { readonly value: 'filters'; readonly items: readonly SearchFilter[] }
  | { readonly value: 'results'; readonly items: readonly EntitySearchHit[] }

function isFilterItem(item: ListItem | undefined): item is SearchFilter {
  return item !== undefined && 'triggers' in item
}

function SearchStatusView({ status, scope }: { readonly status: SearchStatus; readonly scope: string }) {
  switch (status.kind) {
    case 'scoped':
      return (
        <Message>
          Scrie un nume pentru a căuta în{' '}
          <strong className="font-medium text-foreground">{scope}</strong>.
        </Message>
      )

    case 'short':
      return (
        <Message>
          {shortHint(status.remaining)}{' '}
          <span className="text-muted-foreground/55">Nume sau identificator.</span>
        </Message>
      )

    case 'pending':
    case 'loading':
      return <Skeleton />

    case 'results':
      // The rows come from the always-mounted list below; nothing extra here.
      return null

    case 'empty':
      return status.narrowed ? (
        // Honest about the reach: the chip was applied to the page the server
        // returned, not to the index. There may be a company called this; it
        // was not among the first rows for the unfiltered query.
        <Message>
          Niciun rezultat de tip{' '}
          <strong className="font-medium text-foreground">{scope}</strong> printre primele
          rezultate pentru <strong className="font-medium text-foreground">{status.term}</strong>.{' '}
          <span className="text-muted-foreground/55">Încearcă numele complet.</span>
        </Message>
      ) : (
        <Message>
          Niciun rezultat pentru{' '}
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
  inputRef: externalInputRef,
  placeholder = 'Caută entități sau CUI...',
  autoFocus,
  scrollToTopOnFocus,
  onSelect,
}: {
  readonly className?: string
  /**
   * Lets a caller move focus into the field.
   *
   * Optional and substituted for the internal one rather than merged with it,
   * because there is only ever one input and nothing here needs two handles on
   * it. Used by the hero, which has a control that removes itself and has to
   * put focus somewhere real afterwards.
   */
  readonly inputRef?: RefObject<HTMLInputElement | null>
  readonly placeholder?: string
  readonly autoFocus?: boolean
  readonly scrollToTopOnFocus?: boolean
  readonly onSelect?: (entity: EntitySearchHit) => void
}) {
  const {
    term, setTerm, filters, suggestions, addFilter, removeFilter, reset, status, results, isCurrent,
  } = useSearchResults()
  const commit = useEntitySelection({ onSelect })

  const [isOpen, setIsOpen] = useState(false)
  // Whether focus reached the input from the keyboard. The browser cannot say:
  // a text input matches `:focus-visible` however it was focused, so the
  // global `*:focus-visible` rule drew a blue outline on every click. The
  // pointer is remembered from `pointerdown` — which precedes the focus it
  // causes — and consumed by the focus event; a focus with no pointer before
  // it was Tab, ⌘K or a script. Autofocus on mount counts as not-keyboard.
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const pointerFocusRef = useRef(Boolean(autoFocus))
  // Which row the keyboard is on, if any. Kept in a ref rather than in state
  // because only the Enter handler reads it, and re-rendering the whole field
  // on every arrow key to store something nothing draws would be waste.
  const highlightedRef = useRef<ListItem | undefined>(undefined)
  const modifier = useModifierKey()
  const prefersReducedMotion = usePrefersReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const localInputRef = useRef<HTMLInputElement>(null)
  const inputRef = externalInputRef ?? localInputRef

  useHotkeys('mod+k', (event) => {
    event.preventDefault()
    inputRef.current?.focus()
  })

  const isBusy = status.kind === 'loading' || (status.kind === 'results' && status.stale)
  const isDropdownOpen = isOpen && status.kind !== 'idle'
  const visibleResults = status.kind === 'results' ? status.results : []
  const scope = describeScope(filters)
  const hasContent = term.length > 0 || filters.length > 0

  // Two groups, each present only when it has rows. Suggestions first: they
  // change what the rows below mean, so they are read before the rows are.
  const groups: readonly ListGroup[] = [
    ...(suggestions.length > 0 ? [{ value: 'filters', items: suggestions } as const] : []),
    ...(visibleResults.length > 0 ? [{ value: 'results', items: visibleResults } as const] : []),
  ]

  /**
   * Puts focus back in the input after a press elsewhere, remembering how the
   * press was made. A real click has `detail >= 1`; the `.click()` Base UI
   * dispatches for Enter on a highlighted option has `detail === 0`, and so
   * does a Space or Enter on a button. Without this, every mouse press on a
   * suggestion or a chip's remove button was read as keyboard focus and drew
   * the ring — measured 2026-09-10 in Chromium.
   */
  const refocusInput = (event: { readonly detail: number }) => {
    pointerFocusRef.current = event.detail > 0
    inputRef.current?.focus()
    // Focus events dispatch synchronously inside `focus()`, so the flag has
    // been consumed by now if focus moved — and must not linger if it did not.
    pointerFocusRef.current = false
  }

  const acceptFilter = (filter: SearchFilter, event: { readonly detail: number }) => {
    addFilter(filter)
    // The field keeps the reader's attention: a chip has appeared and the text
    // has changed, and both are in the field, not in the list.
    refocusInput(event)
  }

  return (
    <Autocomplete.Root
      // What the list may draw, which is not always what the query holds:
      // `keepPreviousData` keeps the previous term's rows around, and in the
      // `short` state those must not reappear under a two-character query.
      items={groups}
      // The list is the server's answer, in the server's order. Filtering it
      // again on the client would silently drop rows the API chose to return.
      // (A chip narrows it — deliberately, visibly, and named in the header.)
      filter={null}
      value={term}
      onValueChange={(next, details) => {
        // Pressing an option writes its text into the field, which is right
        // for an autocomplete and wrong here for both kinds of row: results
        // are anchors that navigate, and a filter becomes a chip, not text.
        if (details.reason === 'item-press') return
        setTerm(next)
        setIsOpen(true)
      }}
      open={isDropdownOpen}
      onOpenChange={(next, details) => {
        if (next) {
          setIsOpen(true)
          return
        }
        // Accepting a filter is not a reason to close. The list is about to
        // show what the chip kept, which is the whole point of accepting it.
        if (details.reason === 'item-press' && isFilterItem(highlightedRef.current)) return
        setIsOpen(false)
        // Escape in two stages, expressed as one comparison. The first press
        // arrives here with the list open and only closes it; the second
        // arrives with nothing open, so the input handler below clears.
        if (details.reason === 'escape-key' && !isDropdownOpen) reset()
      }}
      itemToStringValue={(item: ListItem) => (isFilterItem(item) ? item.label : item.title)}
      onItemHighlighted={(item) => {
        highlightedRef.current = item
      }}
      openOnInputClick={false}
      // No row is preselected. Auto-highlighting the first result makes Enter
      // act on a guess, which is the same defect the hand-rolled version had to
      // gate against explicitly.
      autoHighlight={false}
    >
      <div ref={containerRef} className={cn('relative w-full', className)}>
        <Autocomplete.InputGroup
          aria-label="Căutare"
          onPointerDown={() => { pointerFocusRef.current = true }}
          // Focus moves on pointerdown, so by pointerup the flag has either
          // been consumed or was for a press that moved nothing.
          onPointerUp={() => { pointerFocusRef.current = false }}
          onFocus={(event) => {
            if (event.target === inputRef.current) setKeyboardFocus(!pointerFocusRef.current)
            pointerFocusRef.current = false
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false)
          }}
          className={cn(
            // The field. Border, radius and lift live here rather than on the
            // input because the chips are inside them too.
            'flex h-12 items-center gap-1.5 rounded-lg border border-input bg-card pl-10 pr-20 shadow-none',
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
            //
            // `focus-within` rather than `focus`: the input is a child now,
            // and so is each chip's remove button, and the field is focused
            // whichever of them has the caret.
            'focus-within:border-foreground/55 data-popup-open:border-foreground/55',
            'focus-within:shadow-lg data-popup-open:shadow-lg',
            // Squared and opened against whichever edge the panel actually
            // landed on. `data-popup-side` is on the group, so the field
            // follows the panel. The border on that edge goes with it: the
            // divider under the header is the single line between the
            // query and the answers, and a second one here would box the
            // field off as its own object again.
            'data-popup-open:data-[popup-side=bottom]:rounded-b-none data-popup-open:data-[popup-side=bottom]:border-b-0',
            'data-popup-open:data-[popup-side=top]:rounded-t-none data-popup-open:data-[popup-side=top]:border-t-0',
            // The blue ring is for keyboard focus only. A reader who clicked
            // into the field can see where their pointer is; a reader who
            // tabbed in cannot, and the neutral border alone is not enough
            // of an answer for them.
            keyboardFocus && 'outline-2 outline-offset-2 outline-ring',
          )}
        >
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />

          {filters.map((filter) => (
            <FilterChip
              key={filter.id}
              filter={filter}
              onRemove={(removed, event) => {
                removeFilter(removed)
                refocusInput(event)
              }}
            />
          ))}

          <Autocomplete.Input
            ref={inputRef}
            autoFocus={autoFocus}
            onFocus={() => {
              if (scrollToTopOnFocus) {
                // The scroll is motion too, and DESIGN.md §Motion makes
                // reduced motion drop the flourish rather than shorten it.
                containerRef.current?.scrollIntoView({
                  behavior: prefersReducedMotion ? 'auto' : 'smooth',
                  block: 'start',
                })
              }
              setIsOpen(true)
            }}
            onKeyDown={(event: BaseUIEvent<KeyboardEvent<HTMLInputElement>>) => {
              // Nothing below may act while an IME is composing. The Enter
              // that confirms a candidate — CJK, or a dead-key accent on
              // macOS Chrome — arrives here as a keydown, and without this
              // gate it took the first result and navigated away mid-word;
              // the Escape that cancels a composition would have emptied
              // the field. Base UI already ignores these for its own
              // handling; this handler has to as well. Both checks are
              // needed: Chrome reports `isComposing`, Safari reports the
              // real key with `isComposing` false and only keyCode 229
              // gives it away. Base UI's own handler is opted out as
              // well: it checks 229 for navigation and Enter, but its
              // "Escape on a closed field clears it" runs before that
              // check and would empty a half-composed word.
              if (event.nativeEvent.isComposing || event.keyCode === 229) {
                event.preventBaseUIHandler()
                return
              }

              // Backspace on an empty field takes the last chip off, which is
              // what a reader who has just watched a word turn into a chip
              // expects the key to do. Only on an empty field: with text in
              // it, Backspace is Backspace.
              if (event.key === 'Backspace' && term.length === 0 && filters.length > 0) {
                event.preventDefault()
                removeFilter(filters[filters.length - 1])
                return
              }

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
              // asking for the field itself to be emptied — chips included.
              if (event.key === 'Escape' && !isDropdownOpen) {
                reset()
                return
              }
              if (event.key !== 'Enter') return

              // Enter on a closed field with something still in it reopens
              // the list, which is what makes the first Escape reversible.
              if (!isDropdownOpen) {
                if (!hasContent) return
                event.preventDefault()
                setIsOpen(true)
                return
              }

              // Enter on a highlighted filter is Base UI's to handle — it
              // presses the item and the press handler below puts the chip
              // on. Before the freshness gate, because a suggestion comes
              // from the text, not from the request, and is never stale.
              if (isFilterItem(highlightedRef.current)) return

              // Enter with a result highlighted is Base UI's to handle too —
              // the row is an anchor and the router navigates. Only the
              // *unhighlighted* case is ours.
              if (!isCurrent) {
                event.preventDefault()
                event.preventBaseUIHandler()
                return
              }
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
              reset()
              setIsOpen(false)
            }}
            className={cn(
              // Bare: the group draws the field. `min-w-0` lets the chips take
              // room from the text rather than overflowing the border. The
              // outline is forced off because `src/index.css` draws one on
              // every `:focus-visible` element from outside any layer, where a
              // plain utility cannot reach it — and a text input is
              // focus-visible on click. The group draws focus instead.
              'h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-hidden! placeholder:text-muted-foreground md:text-base',
            )}
            placeholder={filters.length > 0 ? 'Nume sau CUI...' : placeholder}
            aria-label={placeholder}
            // Labels the phone keyboard's action key. Enter here takes the
            // first result once the list answers what is in the box, which is
            // what a reader who has typed into a search field expects that key
            // to do; without the hint iOS shows a plain "return".
            enterKeyHint="search"
          />

          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {isBusy ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
            ) : null}
            {hasContent ? (
              <Autocomplete.Clear
                aria-label="Șterge căutarea"
                // Base UI clears the text; the chips are ours to clear.
                onClick={reset}
                // Base UI keeps this out of the tab order. Defensible — Escape
                // twice also clears, so the function is reachable — but it is a
                // visible control, and a sighted keyboard user who can see a
                // button and cannot reach it has been told the interface is
                // lying. Escape stays the faster path; this is the discoverable
                // one.
                tabIndex={0}
                // The drawn button is 24px, which is exactly WCAG 2.2's floor
                // for a target and well under the 44px that is comfortable on
                // a phone. The hit area is grown with a pseudo-element rather
                // than padding so the visible box, and the focus ring around
                // it, stay the size the field was designed for: 10px on every
                // side makes 44×44, which fits inside the 48px field and,
                // leftwards, overlaps only the decorative spinner.
                className="relative rounded-sm p-1 text-muted-foreground transition-colors after:absolute after:-inset-2.5 after:content-[''] hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
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
        </Autocomplete.InputGroup>

        <p aria-live="polite" className="sr-only">
          {isDropdownOpen ? announcement(status, suggestions.length) : ''}
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
                field standing directly on it. The left names the scope when
                there is one — the chips, read out — because the rows below are
                a different list once a chip is on. The right column holds each
                result's identifier, which is not necessarily a CUI. */}
            <div className="flex items-baseline justify-between gap-3 border-b bg-muted/40 px-4 py-3">
              <MonoLabel className="text-muted-foreground">
                {scope || (status.kind === 'results' ? 'Rezultate' : 'Caută')}
              </MonoLabel>
              <MonoLabel className="text-muted-foreground/55">Identificator</MonoLabel>
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
                  // The stale dim fades in. Measured under
                  // `prefers-reduced-motion: reduce`: the popup's inline rule
                  // above did not reach this element, and the list still
                  // reported a 150ms opacity transition. Same element, so
                  // the variant outranks the base utility and the cascade
                  // order concern in `usePrefersReducedMotion` does not apply.
                  'transition-opacity motion-reduce:transition-none',
                  status.kind === 'results' && status.stale && 'pointer-events-none opacity-50',
                )}
              >
                {(group: ListGroup) => (
                  <Autocomplete.Group key={group.value} items={group.items}>
                    {group.value === 'filters' ? (
                      <>
                        <Autocomplete.GroupLabel className="sr-only">Filtre sugerate</Autocomplete.GroupLabel>
                        <Autocomplete.Collection>
                          {(filter: SearchFilter) => (
                            <Autocomplete.Item
                              key={filter.id}
                              value={filter}
                              className={cn(resultRowClass, 'bg-muted/20')}
                              onClick={(event) => acceptFilter(filter, event)}
                            >
                              <FilterSuggestionContent filter={filter} />
                            </Autocomplete.Item>
                          )}
                        </Autocomplete.Collection>
                      </>
                    ) : (
                      <>
                        <Autocomplete.GroupLabel className="sr-only">Rezultate</Autocomplete.GroupLabel>
                        <Autocomplete.Collection>
                          {(entity: EntitySearchHit) => (
                            <Autocomplete.Item
                              key={entity.id}
                              value={entity}
                              className={resultRowClass}
                              // The anchor navigates, so the recorder is told to skip it.
                              // Cmd-click then works for free: the browser opens a tab,
                              // the router never runs, the selection is still counted.
                              disabled={!isCurrent}
                              onClick={(event) => {
                                if (!isCurrent) {
                                  event.preventDefault()
                                  return
                                }
                                commit(entity, { skipNavigate: true })
                                reset()
                                setIsOpen(false)
                              }}
                              // `render` is what lets the option *be* the anchor rather
                              // than contain one, which is what keeps `preload="intent"`
                              // and Cmd-click working.
                              render={
                                <Link
                                  to={entity.href as '/'}
                                  preload={false}
                                  onClick={(event) => { if (!isCurrent) event.preventDefault() }}
                                />
                              }
                            >
                              <ResultRowContent entity={entity} query={term.trim()} />
                            </Autocomplete.Item>
                          )}
                        </Autocomplete.Collection>
                      </>
                    )}
                  </Autocomplete.Group>
                )}
              </Autocomplete.List>

              <SearchStatusView status={status} scope={scope} />
            </div>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  )
}
