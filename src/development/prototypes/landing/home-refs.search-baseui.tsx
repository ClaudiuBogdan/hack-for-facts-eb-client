import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Autocomplete } from '@base-ui/react/autocomplete'
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
} from './home-refs.search-parts'
import { useEntitySelection, useSearchResults } from './home-refs.search-state'
import type { SearchStatus } from './home-refs.search-state'

/**
 * Candidate D — Base UI `Autocomplete`.
 *
 * From the team that built Radix, and the only one of the four candidates whose
 * API was designed for this exact widget: an input, a server-driven list, and a
 * popup that has to behave. Three things it gives that nothing else here does.
 *
 * **`filter={null}` is a first-class mode.** Every other candidate treats
 * server-driven results as filtering that has been switched off — cmdk needs
 * `shouldFilter={false}`, downshift never filtered but never positions either.
 * Here the list is simply `items`, in the order the API returned it.
 *
 * **Every change carries a `reason`.** `escape-key`, `item-press`,
 * `outside-press`, `input-change`, `focus-out`, `link-press`. Two-stage Escape
 * stops being a fight with the library and becomes one comparison, which is the
 * single biggest difference against the Radix version, where Escape had to be
 * taken away from the layer entirely because it fired from the document and
 * flushed React state before the input's own handler ran.
 *
 * **The popup exposes what it measured.** `--anchor-width`, `--available-width`
 * and `--available-height` are set from the collision calculation, so the list
 * is bounded by the room actually found rather than by a guessed `65vh`.
 *
 * What it costs: a dependency at 1.8.0 — stable, but young, and this is a
 * component the app would be adopting rather than borrowing. Note the package
 * name: `@base-ui-components/react` is deprecated and renamed to
 * `@base-ui/react`, and the deprecated one is still on npm at an older
 * `1.0.0-rc.0`, which is easy to install by mistake.
 */

function BaseUiStatusView({
  status,
  query,
  selectionBehavior,
  onCommit,
}: {
  readonly status: SearchStatus
  readonly query: string
  readonly selectionBehavior: EntitySelectionBehavior
  readonly onCommit: (entity: EntitySearchNode) => void
}) {
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
      return (
        <Autocomplete.List className={cn('transition-opacity', status.stale && 'opacity-50')}>
          {(entity: EntitySearchNode) => (
            <Autocomplete.Item
              key={entity.cui}
              value={entity}
              className={resultRowClass(false)}
              // `render` is what lets the option *be* the anchor rather than
              // contain one. That keeps `preload="intent"` and, more
              // importantly, keeps Cmd-click opening a new tab — the thing cmdk
              // cannot do, because it turns every item click into `onSelect`.
              // The anchor does the navigating, so the recorder is told to
              // skip it. Cmd-click then works for free: the browser opens a
              // tab, the router never runs, and the selection is still counted.
              onClick={() => onCommit(entity)}
              render={
                <Link to={destinationFor(entity, selectionBehavior) as '/'} preload="intent" />
              }
            >
              <ResultRowContent entity={entity} query={query} isActive={false} />
            </Autocomplete.Item>
          )}
        </Autocomplete.List>
      )

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

export function LandingSearchBaseUi({
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
  const { term, setTerm, status, results, source } = useSearchResults({ fallback })
  const commit = useEntitySelection({ selectionBehavior, onSelect, source })

  const [isOpen, setIsOpen] = useState(false)
  const modifier = useModifierKey()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useHotkeys('mod+k', (event) => {
    event.preventDefault()
    inputRef.current?.focus()
  })

  const isBusy = status.kind === 'loading' || (status.kind === 'results' && status.stale)
  const isDropdownOpen = isOpen && status.kind !== 'idle'

  return (
    <Autocomplete.Root
      items={results as EntitySearchNode[]}
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
                onKeyDown={(event) => {
                  // The second stage. Base UI has already closed the popup, so
                  // by the time Escape reaches a closed input the reader is
                  // asking for the field itself to be emptied.
                  if (event.key === 'Escape' && !isDropdownOpen) setTerm('')
                }}
                className="h-12 rounded-lg border-input bg-card pl-10 pr-20 text-base shadow-none transition-colors hover:border-ring/50 focus:border-ring md:text-base"
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
        <Autocomplete.Positioner sideOffset={8} align="start" className="z-30 outline-hidden">
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
            className="flex max-h-[var(--available-height)] w-[var(--anchor-width)] max-w-[var(--available-width)] flex-col overflow-hidden rounded-lg border bg-card shadow-md"
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <BaseUiStatusView
                status={status}
                query={term.trim()}
                selectionBehavior={selectionBehavior}
                onCommit={(entity) => {
                  commit(entity, { skipNavigate: true })
                  setTerm('')
                  setIsOpen(false)
                }}
              />
            </div>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  )
}
