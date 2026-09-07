import { useEffect, useRef } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import type { EntitySelectionBehavior } from '@/lib/entity-navigation'
import type { EntitySearchNode } from '@/schemas/entities'
import { MonoLabel } from './home-refs.mono-label'
import {
  announcement,
  Message,
  ResultRow,
  shortHint,
  Skeleton,
  useModifierKey,
  usePrefersReducedMotion,
} from './home-refs.search-parts'
import { MIN_QUERY_CHARS, useLandingSearch, type SearchStatus } from './home-refs.search-state'

/**
 * The hero search and its results.
 *
 * Written to replace `src/components/entities/EntitySearch`, not to sit beside
 * it — same `selectionBehavior`/`onSelect` contract, same navigation helper,
 * same guarded blur — so promoting it is a move plus wrapping the strings in
 * Lingui macros. The strings are plain Romanian here because running the extract
 * cycle rewrites both catalogs, and a prototype should not be the reason a
 * translation file changes.
 *
 * **The layer is Radix; the combobox is not.** `Popover` — the one in
 * `src/components/ui/`, so the app's floating layers stay one component —
 * provides the portal, the collision-aware positioning and the dismissal layer,
 * which is the part that is genuinely hard and was genuinely wrong when this
 * was hand-rolled: Tab left the popup open behind the reader, and at a 560px
 * viewport the panel ran 75px below the fold with nowhere to go. It is used
 * through `Anchor` rather than `Trigger`, because what opens this is typing.
 * The bare `Popper` / `DismissableLayer` primitives would be a closer fit than
 * a popover, but they are not installed, and pulling in two packages to avoid
 * four props is the wrong trade.
 *
 * **The combobox itself stays hand-written, and `Command` (cmdk) is not used.**
 * cmdk owns the filtering, and the filtering here happens on the server: the
 * list is whatever the API returned for a debounced term, in the order it
 * returned it. Handing that to a component built to filter a known set means
 * fighting it to keep the order and to render six states it has no concept of —
 * `pending`, `stale`, `short`. What cmdk would genuinely give is roving-focus
 * keyboard handling, which is about forty lines of the hook next door.
 *
 * **Layout is the caller's.** No `max-w-3xl mx-auto pt-8` baked in, which is
 * what forced the landing to reach into the shipped component with
 * `[&_input]:` descendant selectors — a hack that outranks the component's own
 * classes and breaks silently when its internals change.
 *
 * **Design.** Radius caps at `lg` and the palette is tokens, per DESIGN.md; the
 * shipped component's `rounded-3xl` and hardcoded `slate-*` are both why it
 * looks wrong on this page and why it is unreadable in dark mode. The dropdown
 * is a genuinely floating layer, so it takes `shadow-md` and nothing heavier.
 *
 * **Motion.** The shared popover's 150ms enter, with its zoom neutralised: at
 * tooltip width a 95% scale is a flourish, but on a panel as wide as the field
 * it is thirty pixels of horizontal growth and reads as the list arriving from
 * somewhere rather than opening where it already is. No per-item stagger — the
 * list is at most eight rows and would be over before a stagger finished — and
 * no transition at all on the active row, because it tracks the arrow keys and
 * a colour fade on a held key turns a moving selection into a smear. Reduced
 * motion is honoured with an inline `animation: none`, which is the only thing
 * that outranks the shared component's own rule.
 */

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
  /** Passed straight through. See the hook — there is no default, on purpose. */
  readonly fallback?: (term: string) => readonly EntitySearchNode[]
}) {
  const {
    id,
    term,
    onChange,
    status,
    activeIndex,
    isDropdownOpen,
    open,
    close,
    clear,
    select,
    onKeyDown,
  } = useLandingSearch({ selectionBehavior, onSelect, fallback })

  const modifier = useModifierKey()
  const prefersReducedMotion = usePrefersReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // The list is capped, so past the sixth row an arrow key moves a highlight
  // that is no longer on screen. `nearest` scrolls only when it has to, which
  // keeps the list still while the selection is already visible. Refs are a
  // React relationship rather than a DOM one, so this still reaches the rows
  // now that they are rendered through a portal.
  useEffect(() => {
    if (activeIndex < 0) return
    listRef.current
      ?.querySelector('[data-active]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // The shortcut the `kbd` above advertises. Kept on the component rather than
  // on the page, so the hint and the binding cannot drift apart.
  useHotkeys('mod+k', (event) => {
    event.preventDefault()
    inputRef.current?.focus()
  })

  const isBusy = status.kind === 'loading' || (status.kind === 'results' && status.stale)
  const listboxId = `${id}-listbox`

  return (
    /*
     * Radix owns the layer; the hook still owns whether it is open.
     *
     * `open` is driven from the hook rather than from a `Trigger`, because the
     * thing that opens this is typing, not clicking. `Anchor` is used for the
     * same reason: a `Trigger` would set its own `aria-expanded` and
     * `aria-haspopup` on the input and fight the combobox attributes below.
     *
     * Three problems this fixes, all measured on the hand-rolled version:
     *
     * - **Tab left the popup open.** Focus moved to the clear button with the
     *   list still showing, and the blur guard did not fire because the button
     *   is inside the same container. Radix dismisses on focus leaving the
     *   layer. (Tab still does not step *through* the results: per the ARIA
     *   combobox pattern options stay out of the tab order and are reached with
     *   the arrow keys, which is what `aria-activedescendant` is for.)
     * - **No collision handling.** At a 560px viewport the panel ran 75px below
     *   the fold with nowhere to go. Radix flips and shifts, and exposes the
     *   room it found as `--radix-popover-content-available-height`, which caps
     *   the scroll area better than a guessed `65vh` ever did.
     * - **Clipping.** The panel is portalled, so no ancestor's overflow can cut
     *   it. The hero's clip was removed for the old version; this no longer
     *   depends on that.
     *
     * `useGuardedBlur` is gone, and had to go: it decides what is "inside" by
     * `container.contains(target)`, and through a portal every click on a
     * result is outside — it would have closed the dropdown before the link's
     * own handler ran, which is precisely the bug it was written to prevent.
     * Radix's dismissable layer already treats the anchor branch as inside.
     */
    <Popover open={isDropdownOpen} onOpenChange={(next) => !next && close()}>
      <div ref={containerRef} className={cn('relative w-full', className)}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={inputRef}
              type="text"
              value={term}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={onKeyDown}
              // Opening is bound to the input, not to the container. On the
              // container it also fired when Tab moved focus to the clear
              // button, which reopened a dropdown the reader had just left.
              onFocus={() => {
                if (scrollToTopOnFocus) {
                  containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                open()
              }}
              placeholder={placeholder}
              role="combobox"
              aria-label={placeholder}
              aria-autocomplete="list"
              aria-expanded={isDropdownOpen}
              aria-controls={listboxId}
              aria-activedescendant={activeIndex > -1 ? `${id}-result-${activeIndex}` : undefined}
              // `pr-20` leaves room for the trailing affordance in both its
              // forms — the shortcut hint and the clear button share the slot.
              className="h-12 rounded-lg border-input bg-card pl-10 pr-20 text-base shadow-none transition-colors hover:border-ring/50 focus:border-ring md:text-base"
            />

            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {isBusy ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
              ) : null}
              {term ? (
                <button
                  type="button"
                  onClick={() => {
                    clear()
                    inputRef.current?.focus()
                  }}
                  aria-label="Șterge căutarea"
                  className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
              ) : (
                // The mod+K hotkey has always existed and has never been
                // visible. Hidden below sm, where there is no keyboard.
                <kbd className="hidden items-center gap-0.5 rounded-sm border bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground sm:flex">
                  <span className={modifier === '⌘' ? 'text-xs leading-none' : undefined}>
                    {modifier}
                  </span>
                  K
                </kbd>
              )}
            </div>
          </div>
        </PopoverAnchor>

        {/* Politely announced, never drawn. Kept outside the popover so the
            region is in the document before there is anything to say — a live
            region that mounts with its own message is often not announced. */}
        <p aria-live="polite" className="sr-only">
          {isDropdownOpen ? announcement(status) : ''}
        </p>
      </div>

      <PopoverContent
        id={listboxId}
        role="listbox"
        aria-busy={isBusy}
        align="start"
        sideOffset={8}
        collisionPadding={16}
        // Focus belongs to the input for the whole life of the popup. Without
        // the first of these Radix moves it into the panel on open and the
        // caret leaves mid-word; without the second, closing snaps it back to
        // the anchor and steals a Tab the reader had already spent.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        // Escape stays with the hook, which spends it in two stages: dismiss,
        // then clear. Letting Radix dismiss as well collapses them into one
        // press, and not for a reason any amount of ordering care would fix —
        // Radix listens on the document, so React flushes the close before the
        // input's own handler runs, and that handler then reads `isOpen` as
        // already false and goes on to clear a term the reader had only asked
        // to stop looking at. jsdom does not reproduce it; a browser does.
        onEscapeKeyDown={(event) => event.preventDefault()}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border bg-card p-0 shadow-md',
          // The shipped popover animation, minus the zoom. On a 72px-wide
          // tooltip a 95% scale is a flourish; on a panel as wide as the field
          // it is 30px of horizontal growth, which reads as the dropdown
          // arriving from somewhere rather than opening where it already is.
          'data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100',
        )}
        // `PopoverContent` carries no reduced-motion guard of its own, and a
        // `motion-reduce:` class beside its own animation loses the cascade.
        // Losing that guard silently was the cost of adopting the shared
        // component; this puts it back where nothing can outrank it.
        style={prefersReducedMotion ? { animation: 'none' } : undefined}
      >
        {/* The listbox is the panel, not the list inside it. `aria-controls`
            has to name an element that exists, and four of the seven states
            draw a message rather than a list — so pinning the role to the list
            left the field pointing at a missing id whenever it was not showing
            results, which is when a screen-reader user most needs the popup to
            be findable. Options are `div`s for the same reason: a `ul` is not a
            valid child of a listbox. */}
        <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
          <MonoLabel className="text-muted-foreground">
            {status.kind === 'results' ? 'Rezultate' : 'Caută'}
          </MonoLabel>
          {/* Stand-in data is never allowed to look served. The tag sits in the
              header rather than under the list because it qualifies every row,
              and because a reader who scans and clicks never reaches a
              footnote. */}
          {status.kind === 'results' && status.source === 'local' ? (
            <MonoLabel className="ml-auto shrink-0 whitespace-nowrap rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-500">
              Date locale
              {/* The cause is dropped on a narrow field, where it wrapped the
                  tag onto two lines and pushed the CUI header off. The label
                  itself never is: it is the part that must not be missed. */}
              <span className="hidden sm:inline"> · API indisponibil</span>
            </MonoLabel>
          ) : null}
          <MonoLabel className="text-muted-foreground/60">CUI</MonoLabel>
        </div>

        {/* Capped by the room Radix actually found, not by a guess. The 24rem
            ceiling keeps eight results from filling a tall window. */}
        <div className="max-h-[min(var(--radix-popover-content-available-height,24rem),24rem)] overflow-y-auto">
          <SearchStatusView
            status={status}
            query={term.trim()}
            id={id}
            listRef={listRef}
            activeIndex={activeIndex}
            selectionBehavior={selectionBehavior}
            onSelect={select}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * One state, one form. A `switch` over the union rather than nested ternaries,
 * so adding a state to the machine fails to compile until it has been drawn.
 */
function SearchStatusView({
  status,
  query,
  id,
  listRef,
  activeIndex,
  selectionBehavior,
  onSelect,
}: {
  readonly status: SearchStatus
  readonly query: string
  readonly id: string
  readonly listRef: React.RefObject<HTMLDivElement | null>
  readonly activeIndex: number
  readonly selectionBehavior: EntitySelectionBehavior
  readonly onSelect: (index: number, options?: { readonly skipNavigate?: boolean }) => void
}) {
  switch (status.kind) {
    case 'short':
      return (
        <Message>
          {shortHint(status.remaining)}{' '}
          <span className="text-muted-foreground/70">
            Numele instituției sau codul fiscal.
          </span>
        </Message>
      )

    // Both draw the list forming. They are distinct in the machine because only
    // one of them has a request out — which the spinner in the field shows —
    // but the answer to "what goes here" is the same shape either way.
    case 'pending':
    case 'loading':
      return <Skeleton />

    case 'results':
      return (
        <div
          ref={listRef}
          // Dimmed rather than emptied while the next term is in flight. The
          // list stays legible and in place, so the reader can keep reading a
          // row they were already looking at.
          className={cn('transition-opacity', status.stale && 'opacity-50')}
        >
          {status.results.map((entity, index) => (
            <ResultRow
              key={entity.cui}
              entity={entity}
              query={query}
              id={`${id}-result-${index}`}
              isActive={activeIndex === index}
              selectionBehavior={selectionBehavior}
              onSelect={(event) => {
                // Cmd/Ctrl-click is the reader asking for a new tab. Let the
                // browser do it and only record the selection.
                if (event.metaKey || event.ctrlKey) {
                  onSelect(index, { skipNavigate: true })
                  return
                }
                event.preventDefault()
                onSelect(index)
              }}
            />
          ))}
        </div>
      )

    case 'empty':
      return (
        <Message>
          Nicio instituție pentru <strong className="font-medium text-foreground">{status.term}</strong>.{' '}
          <span className="text-muted-foreground/70">
            Încearcă numele complet sau CUI-ul.
          </span>
        </Message>
      )

    case 'error':
      return (
        <Message>
          <span className="text-destructive">Căutarea nu a răspuns.</span>{' '}
          <span className="text-muted-foreground/70">Încearcă din nou într-un moment.</span>
        </Message>
      )

    // `idle` never reaches here — the dropdown does not open on an empty field,
    // because the panel beside it is already a list of places to start.
    case 'idle':
    default:
      return null
  }
}

/** Re-exported so the landing can state the threshold beside the field. */
export { MIN_QUERY_CHARS }
