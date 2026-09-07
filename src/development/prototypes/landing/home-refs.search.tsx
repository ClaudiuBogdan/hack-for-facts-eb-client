import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, Search, X } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useGuardedBlur } from '@/lib/hooks/useGuardedBlur'
import {
  buildEntitySelectionPath,
  type EntitySelectionBehavior,
} from '@/lib/entity-navigation'
import type { EntitySearchNode } from '@/schemas/entities'
import { MonoLabel } from './home-refs.mono-label'
import { highlightSegments } from './home-refs.search-highlight'
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
 * **Why this is hand-rolled rather than `Command` (cmdk), which is in
 * `src/components/ui/`.** cmdk owns the filtering, and the filtering here
 * happens on the server: the list is whatever the API returned for a debounced
 * term, in the order it returned it. Handing that to a component built to filter
 * a known set means fighting it to keep the order and to render six states it
 * has no concept of — `pending`, `stale`, `short`. What cmdk would genuinely
 * give is the roving-focus keyboard handling, which is about forty lines of the
 * hook next door. The trade favoured writing those forty lines.
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
 * **Motion.** One 150ms enter on the panel — opacity and a 4px rise, no exit,
 * no per-item stagger. A stagger here would mean the reader's eye is drawn down
 * a list that is still arriving, and the list is at most eight rows: it is over
 * before a stagger would finish. The active-row highlight has no transition at
 * all, because it tracks the arrow keys and a 150ms colour fade on a held key
 * turns a moving selection into a smear. `motion-safe:` gates the enter.
 */

/** Rows shown while a request is out, matching the height of a real row. */
const SKELETON_ROWS = 3

/**
 * The place line under a name: locality, then county.
 *
 * Two shapes have to survive this. The API sends a bare county (`Cluj`), which
 * needs the prefix. `PREDEFINED_ENTITIES` stores some already prefixed
 * (`Jud. Cluj`) and some not (`București`). Prefixing unconditionally — as the
 * shipped component does — renders `Jud. Jud. Cluj` on the second shape.
 *
 * The redundancy is the more interesting half. A municipality is usually the
 * seat of the county it names, so the obvious formatting produces
 * `Sibiu · Jud. Sibiu` and, for the capital, `București · Jud. București` —
 * which is not merely repetitive but wrong, since Bucharest is not a county.
 * Both disappear under one rule: when the county *is* the locality, there is no
 * second fact to state, so only the locality is shown.
 */
export function placeLine(entity: EntitySearchNode): string {
  const locality = entity.uat?.name?.trim() ?? ''
  const bareCounty = (entity.uat?.county_name?.trim() ?? '').replace(/^jud\.?\s+/i, '')

  if (!bareCounty || bareCounty.toLocaleLowerCase('ro') === locality.toLocaleLowerCase('ro')) {
    return locality
  }

  return [locality, `Jud. ${bareCounty}`].filter(Boolean).join(' · ')
}

/** Marked-up name, county and CUI. Marks come from the folded matcher. */
function Highlighted({
  text,
  query,
  className,
}: {
  readonly text: string
  readonly query: string
  readonly className?: string
}) {
  const segments = highlightSegments(text, query)

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.match ? (
          // `mark` rather than a styled span: the semantics are exactly right,
          // and it is what a screen reader will describe as relevant.
          <mark
            key={index}
            className="bg-primary/15 text-inherit underline decoration-primary/40 underline-offset-2"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </span>
  )
}

function ResultRow({
  entity,
  query,
  id,
  isActive,
  selectionBehavior,
  onSelect,
}: {
  readonly entity: EntitySearchNode
  readonly query: string
  readonly id: string
  readonly isActive: boolean
  readonly selectionBehavior: EntitySelectionBehavior
  readonly onSelect: (event: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  const destination = buildEntitySelectionPath(
    { cui: entity.cui, entityType: entity.entity_type, isUat: entity.is_uat },
    selectionBehavior,
  )
  const place = placeLine(entity)

  return (
    <div role="option" id={id} aria-selected={isActive} data-active={isActive || undefined}>
      <Link
        to={destination as '/'}
        preload="intent"
        onClick={onSelect}
        tabIndex={-1}
        className={cn(
          // The row shape is the panel's row shape: name over a quiet subline,
          // tabular CUI right-aligned. Same grid, so the dropdown reads as the
          // panel answering rather than as a layer over it.
          'flex items-baseline justify-between gap-3 border-b px-4 py-2.5 last:border-b-0',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          isActive ? 'bg-muted' : 'hover:bg-muted/50',
        )}
      >
        <span className="min-w-0">
          <Highlighted
            text={entity.name}
            query={query}
            className={cn(
              'block truncate text-sm font-medium',
              isActive ? 'text-primary' : 'text-card-foreground',
            )}
          />
          {place ? (
            <Highlighted
              text={place}
              query={query}
              className="block truncate text-xs text-muted-foreground"
            />
          ) : null}
        </span>
        <Highlighted
          text={entity.cui}
          query={query}
          className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
        />
      </Link>
    </div>
  )
}

/** A quiet single line, for every state that is not a list. */
function Message({ children }: { readonly children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>
}

function Skeleton() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
          <span className="min-w-0 flex-1 space-y-1.5">
            {/* Widths vary per row so the placeholder reads as names of
                different lengths rather than as a loading graphic. */}
            <span
              className="block h-3.5 rounded-sm bg-muted"
              style={{ width: `${68 - index * 14}%` }}
            />
            <span className="block h-2.5 w-1/3 rounded-sm bg-muted/60" />
          </span>
          <span className="h-3 w-14 shrink-0 rounded-sm bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

/**
 * The modifier key this reader actually presses.
 *
 * `mod+k` binds to Cmd on macOS and Ctrl everywhere else, so a hardcoded ⌘ is
 * wrong for most readers. It cannot be resolved during render either: the
 * server has no platform to read, and returning a different glyph on the client
 * than the one in the SSR HTML is a hydration mismatch. So it starts as the
 * server's guess and is corrected in an effect, after hydration has matched.
 */
function useModifierKey() {
  const [label, setLabel] = useState('⌘')

  useEffect(() => {
    const isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!isApple) setLabel('Ctrl')
  }, [])

  return label
}

/** Romanian counts the noun, so the hint cannot be assembled from a number. */
function shortHint(remaining: number) {
  return remaining === 1
    ? 'Încă un caracter pentru a căuta.'
    : `Încă ${remaining} caractere pentru a căuta.`
}

/** What a screen reader is told when the list changes. Kept out of the visual. */
function announcement(status: SearchStatus) {
  switch (status.kind) {
    case 'results': {
      if (status.stale) return 'Se actualizează rezultatele.'
      const count = `${status.results.length} ${status.results.length === 1 ? 'rezultat' : 'rezultate'}.`
      // The caveat is spoken too. A label only a sighted reader gets is not a
      // label; it is decoration that happens to be true.
      return status.source === 'local' ? `${count} Date locale, API indisponibil.` : count
    }
    case 'empty':
      return 'Niciun rezultat.'
    case 'error':
      return 'Căutarea nu a răspuns.'
    case 'loading':
      return 'Se caută.'
    default:
      return ''
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
  const { containerRef, onBlur } = useGuardedBlur<HTMLDivElement>(close)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // The list caps at 65vh, so past the sixth row an arrow key moves a highlight
  // that is no longer on screen. `nearest` scrolls only when it has to, which
  // keeps the list still while the selection is already visible.
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
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      onFocus={() => {
        if (scrollToTopOnFocus) {
          containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        open()
      }}
      onBlur={onBlur}
    >
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
          onFocus={open}
          placeholder={placeholder}
          role="combobox"
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={isDropdownOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex > -1 ? `${id}-result-${activeIndex}` : undefined}
          // `pr-20` leaves room for the trailing affordance in both its forms —
          // the shortcut hint and the clear button occupy the same slot.
          className="h-12 rounded-lg border-input bg-card pl-10 pr-20 text-base shadow-none transition-colors hover:border-ring/50 focus:border-ring md:text-base"
        />

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
                clear()
                inputRef.current?.focus()
              }}
              aria-label="Șterge căutarea"
              className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          ) : (
            // The mod+K hotkey has always existed and has never been visible.
            // Hidden below sm, where there is no keyboard to press it with.
            <kbd className="hidden items-center gap-0.5 rounded-sm border bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground sm:flex">
              <span className={modifier === '⌘' ? 'text-xs leading-none' : undefined}>
                {modifier}
              </span>
              K
            </kbd>
          )}
        </div>
      </div>

      {/* Politely announced, never drawn. The visual states below carry the same
          information for everyone else. */}
      <p aria-live="polite" className="sr-only">
        {isDropdownOpen ? announcement(status) : ''}
      </p>

      {isDropdownOpen ? (
        // The listbox is the panel, not the list inside it. `aria-controls`
        // has to name an element that exists, and four of the seven states
        // draw a message rather than a list — so pinning the role to the `ul`
        // left the field pointing at a missing id whenever it was not showing
        // results, which is exactly when a screen-reader user most needs the
        // popup to be findable. Options are `div`s for the same reason: a
        // `ul` between the listbox and its options is not a valid child.
        <div
          id={listboxId}
          role="listbox"
          aria-busy={isBusy}
          className={cn(
            'absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-lg border bg-card shadow-md',
            'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-150',
          )}
        >
          <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
            <MonoLabel className="text-muted-foreground">
              {status.kind === 'results' ? 'Rezultate' : 'Caută'}
            </MonoLabel>
            {/* Stand-in data is never allowed to look served. The tag sits in
                the header rather than under the list because it qualifies every
                row, and because a reader who scans and clicks never reaches a
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

          <div className="max-h-[min(65vh,24rem)] overflow-y-auto">
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
        </div>
      ) : null}
    </div>
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
