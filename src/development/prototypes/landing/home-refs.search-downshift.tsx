import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useCombobox } from 'downshift'
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

/**
 * Candidate C — downshift `useCombobox`, with Radix only as the layer.
 *
 * downshift is the WAI-ARIA 1.2 combobox pattern written down. It owns the
 * keyboard, the `aria-*` wiring and the highlight; it owns no pixels at all,
 * which is why it is paired here with the same `Popover` candidate A uses. The
 * split is the point: behaviour from the reference implementation, positioning
 * from the layer library, neither pretending to do the other's job.
 *
 * **Two-stage Escape is the default.** Its reducer is literally
 * `{ isOpen: false, highlightedIndex: -1, ...(!state.isOpen && { inputValue: '' }) }`
 * — close first, clear second. Candidate A had to write that by hand, and
 * adopting Radix then broke it, because Radix's own Escape fires from the
 * document and flushes React state before the input's handler runs. Here there
 * is nothing to fix: Radix's Escape is turned off and downshift's is correct.
 *
 * **Scroll-into-view is the default too**, via `compute-scroll-into-view`,
 * which arrived as a dependency of downshift rather than as something to
 * remember. Candidate A does it in a `useEffect` that has to know the list's
 * ref and the active row's attribute.
 *
 * **`getInputProps()` owns the ARIA.** Nothing here sets `role="combobox"`,
 * `aria-expanded`, `aria-controls` or `aria-activedescendant` — setting them
 * alongside downshift is how they drift apart. That is a real advantage and a
 * real loss of control: the `aria-controls` fix candidate A needed, pointing at
 * the popup rather than the list, is downshift's decision to make, not ours.
 *
 * The one thing it does not give is anything to do with where the popup goes.
 * That is `Popover`'s job below, and it is why this variant carries two
 * libraries where candidate D carries one.
 */

export function LandingSearchDownshift({
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

  const modifier = useModifierKey()
  const prefersReducedMotion = usePrefersReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Read inside the reducer, which is not re-created per render and would
  // otherwise close over the first value of `isCurrent` forever.
  const isCurrentRef = useRef(isCurrent)
  isCurrentRef.current = isCurrent

  const items = results as EntitySearchNode[]

  const {
    isOpen,
    getInputProps,
    getMenuProps,
    getItemProps,
    highlightedIndex,
    openMenu,
    closeMenu,
    reset,
  } = useCombobox<EntitySearchNode>({
    items,
    inputValue: term,
    itemToString: (item) => item?.name ?? '',
    onInputValueChange: ({ inputValue }) => setTerm(inputValue ?? ''),
    onSelectedItemChange: ({ selectedItem }) => {
      // The row is an anchor, so the navigation has already happened or is
      // about to; this only records it and empties the field.
      commit(selectedItem ?? undefined, { skipNavigate: true })
      setTerm('')
    },
    stateReducer(state, { type, changes }) {
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
          // Enter with nothing highlighted is a convenience — take the first
          // result — but only once the list is known to answer what is in the
          // box. Without this, typing 'Cluj', pausing, adding ' N' and pressing
          // Enter opens the first result for 'Cluj'. downshift's own default
          // does nothing at all here, so the convenience is added rather than
          // restrained.
          if (state.highlightedIndex < 0) {
            if (!state.isOpen || !isCurrentRef.current || items.length === 0) return state
            return { ...changes, selectedItem: items[0], isOpen: false, inputValue: '' }
          }
          return changes

        default:
          // Escape is deliberately not listed. downshift's default is already
          // the two-stage behaviour — close, then clear — and overriding it
          // would be writing by hand what the library was chosen for.
          return changes
      }
    },
  })

  useHotkeys('mod+k', (event) => {
    event.preventDefault()
    inputRef.current?.focus()
  })

  const isBusy = status.kind === 'loading' || (status.kind === 'results' && status.stale)
  const isDropdownOpen = isOpen && status.kind !== 'idle'

  // `getMenuProps` must be called on every render, even when the list is not
  // drawn, or downshift warns that the menu ref was never attached. Spreading
  // it onto the popover content is enough.
  const menuProps = getMenuProps({}, { suppressRefError: !isDropdownOpen })

  const inputProps = getInputProps({
    ref: inputRef,
    placeholder,
    'aria-label': placeholder,
    autoFocus,
    onFocus: () => {
      if (scrollToTopOnFocus) {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      openMenu()
    },
  })

  return (
    <Popover open={isDropdownOpen} onOpenChange={(next) => !next && closeMenu()}>
      <div ref={containerRef} className={cn('relative w-full', className)}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            {/* Every ARIA attribute on this input comes from downshift. */}
            <Input
              {...inputProps}
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
                    reset()
                    setTerm('')
                    inputRef.current?.focus()
                  }}
                  aria-label="Șterge căutarea"
                  className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
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
        </PopoverAnchor>

        <p aria-live="polite" className="sr-only">
          {isDropdownOpen ? announcement(status) : ''}
        </p>
      </div>

      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        // downshift owns Escape, and its default is the two-stage behaviour
        // this widget wants. Radix dismissing as well collapses both stages
        // into one press.
        onEscapeKeyDown={(event) => event.preventDefault()}
        className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border bg-card p-0 shadow-md data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100"
        style={prefersReducedMotion ? { animation: 'none' } : undefined}
      >
        <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
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

        <div className="max-h-[min(var(--radix-popover-content-available-height,24rem),24rem)] overflow-y-auto">
          <ul
            {...menuProps}
            className={cn(
              'transition-opacity',
              status.kind === 'results' && status.stale && 'opacity-50',
            )}
          >
            {status.kind === 'results'
              ? status.results.map((entity, index) => (
                  <li
                    key={entity.cui}
                    {...getItemProps({
                      item: entity,
                      index,
                      onClick: (event: React.MouseEvent) => {
                        // A modified click is the reader asking the *browser*
                        // for a tab. downshift would otherwise treat it as a
                        // selection, close the list and swallow the modifier.
                        // `preventDownshiftDefault` is the documented way to
                        // stand down; without it the anchor never gets the
                        // event and Cmd-click silently does nothing.
                        if (event.metaKey || event.ctrlKey || event.button === 1) {
                          ;(
                            event.nativeEvent as MouseEvent & {
                              preventDownshiftDefault?: boolean
                            }
                          ).preventDownshiftDefault = true
                        }
                      },
                    })}
                    className={resultRowClass(highlightedIndex === index)}
                    data-active={highlightedIndex === index || undefined}
                  >
                    {/* The anchor is inside the option rather than being it,
                        because `getItemProps` claims the element it is spread
                        on. Cmd-click still opens a tab; a plain click is
                        handled by downshift and the anchor's default is
                        suppressed by the router. */}
                    <Link
                      to={destinationFor(entity, selectionBehavior) as '/'}
                      preload="intent"
                      tabIndex={-1}
                      className="contents"
                    >
                      <ResultRowContent
                        entity={entity}
                        query={term.trim()}
                        isActive={highlightedIndex === index}
                      />
                    </Link>
                  </li>
                ))
              : null}
          </ul>

          {status.kind === 'short' ? (
            <Message>
              {shortHint(status.remaining)}{' '}
              <span className="text-muted-foreground/70">Numele instituției sau codul fiscal.</span>
            </Message>
          ) : null}
          {status.kind === 'pending' || status.kind === 'loading' ? <Skeleton /> : null}
          {status.kind === 'empty' ? (
            <Message>
              Nicio instituție pentru{' '}
              <strong className="font-medium text-foreground">{status.term}</strong>.{' '}
              <span className="text-muted-foreground/70">Încearcă numele complet sau CUI-ul.</span>
            </Message>
          ) : null}
          {status.kind === 'error' ? (
            <Message>
              <span className="text-destructive">Căutarea nu a răspuns.</span>{' '}
              <span className="text-muted-foreground/70">Încearcă din nou într-un moment.</span>
            </Message>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
