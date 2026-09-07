import { useRef, useState } from 'react'
import { Command as CommandPrimitive } from 'cmdk'
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
  ResultRowContent,
  resultRowClass,
  shortHint,
  Skeleton,
  useModifierKey,
  usePrefersReducedMotion,
} from './home-refs.search-parts'
import { useEntitySelection, useSearchResults } from './home-refs.search-state'

/**
 * Candidate B — cmdk `Command`, inside the same Radix `Popover`.
 *
 * The zero-new-dependency option: cmdk is already a direct dependency and
 * already wrapped at `src/components/ui/command.tsx`, and Popover+Command is
 * shadcn's canonical combobox. If it were adequate it would win on that alone.
 *
 * It is not, and the reasons are worth having in front of you rather than in a
 * paragraph of prose, because they are all consequences of one thing: **cmdk is
 * built to filter and rank a list it owns.** Everything below follows.
 *
 * - **`shouldFilter={false}`** is required, or cmdk re-filters the server's
 *   answer against the input and silently drops rows the API deliberately
 *   returned — a search for a CUI matching an institution whose *name* does not
 *   contain the digits returns nothing.
 * - **`value` must be driven manually.** With filtering off, cmdk's automatic
 *   first-item selection points at whatever it saw first, so the highlight has
 *   to be controlled or Enter acts on a row nobody chose.
 * - **Items cannot be links.** `Command.Item` claims the click and turns it into
 *   `onSelect`; an anchor inside it double-fires. So this variant navigates
 *   imperatively, and that costs `preload="intent"` *and* Cmd-click — a reader
 *   cannot open a result in a new tab. That is the finding, not a footnote:
 *   for a research tool whose readers compare institutions side by side, losing
 *   middle-click and Cmd-click is a real loss of function.
 * - **Escape is cmdk's**, and it does not distinguish stages, so two-stage
 *   Escape has to be intercepted before cmdk sees it.
 *
 * What it does give, and gives well: `cmdk-list-sizer` keeps the list height
 * animatable, and `scrollIntoView` on the selected item is automatic.
 */

export function LandingSearchCmdk({
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
  // cmdk keys its selection by a string value, not by index.
  const [highlighted, setHighlighted] = useState('')
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

  const choose = (entity: EntitySearchNode | undefined) => {
    if (!entity) return
    // Imperative, because the row cannot be an anchor. This is where
    // `preload="intent"` and Cmd-click are lost.
    commit(entity)
    setTerm('')
    setIsOpen(false)
  }

  return (
    <Popover open={isDropdownOpen} onOpenChange={(next) => !next && setIsOpen(false)}>
      <CommandPrimitive
        // The server ranked these. Re-ranking them here would throw away the
        // only ordering that knows anything about the data.
        shouldFilter={false}
        value={highlighted}
        onValueChange={setHighlighted}
        // cmdk traps Escape and Enter for itself; both need intercepting on the
        // way down, before it decides what they mean.
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            if (isDropdownOpen) {
              setIsOpen(false)
              return
            }
            setTerm('')
            return
          }
          if (event.key === 'Enter' && !highlighted) {
            event.preventDefault()
            // Same freshness gate as everywhere else: Enter must not act on a
            // list that answers the previous term.
            if (isCurrent) choose(results[0])
          }
        }}
        className="w-full"
      >
        <div ref={containerRef} className={cn('relative w-full', className)}>
          <PopoverAnchor asChild>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <CommandPrimitive.Input
                asChild
                value={term}
                onValueChange={(next) => {
                  setTerm(next)
                  setIsOpen(true)
                }}
              >
                <Input
                  ref={inputRef}
                  autoFocus={autoFocus}
                  placeholder={placeholder}
                  aria-label={placeholder}
                  onFocus={() => {
                    if (scrollToTopOnFocus) {
                      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                    setIsOpen(true)
                  }}
                  className="h-12 rounded-lg border-input bg-card pl-10 pr-20 text-base shadow-none transition-colors hover:border-ring/50 focus:border-ring md:text-base"
                />
              </CommandPrimitive.Input>

              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                {isBusy ? (
                  <Loader2
                    aria-hidden="true"
                    className="size-4 animate-spin text-muted-foreground"
                  />
                ) : null}
                {term ? (
                  <button
                    type="button"
                    onClick={() => {
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

          <CommandPrimitive.List className="max-h-[min(var(--radix-popover-content-available-height,24rem),24rem)] overflow-y-auto">
            {status.kind === 'results' ? (
              <div className={cn('transition-opacity', status.stale && 'opacity-50')}>
                {status.results.map((entity) => (
                  <CommandPrimitive.Item
                    key={entity.cui}
                    value={entity.cui}
                    onSelect={() => choose(entity)}
                    className={cn(
                      resultRowClass(false),
                      // cmdk reports its own selection through a data
                      // attribute rather than through a prop, so the active
                      // styling has to be expressed as a selector.
                      'data-[selected=true]:bg-muted',
                    )}
                    data-active={highlighted === entity.cui || undefined}
                  >
                    <ResultRowContent
                      entity={entity}
                      query={term.trim()}
                      isActive={highlighted === entity.cui}
                    />
                  </CommandPrimitive.Item>
                ))}
              </div>
            ) : null}

            {status.kind === 'short' ? (
              <Message>
                {shortHint(status.remaining)}{' '}
                <span className="text-muted-foreground/70">
                  Numele instituției sau codul fiscal.
                </span>
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
          </CommandPrimitive.List>
        </PopoverContent>
      </CommandPrimitive>
    </Popover>
  )
}
