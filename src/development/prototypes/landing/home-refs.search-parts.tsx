import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  buildEntitySelectionPath,
  type EntitySelectionBehavior,
} from '@/lib/entity-navigation'
import type { EntitySearchNode } from '@/schemas/entities'
import { highlightSegments } from './home-refs.search-highlight'
import type { SearchStatus } from './home-refs.search-state'

/**
 * Everything the four candidate implementations must render identically.
 *
 * The comparison in `home-refs.prototype.tsx` puts four combobox libraries
 * behind the same search. That is only a fair test if the *only* thing varying
 * is the interaction — keyboard travel, what Escape means, where the popup goes
 * and how it scrolls. The moment one of them draws a different row, the reader
 * is comparing row designs and the result means nothing.
 *
 * So the row, the marks, the place line, the header, the skeleton, the messages
 * and the announcements live here, and each candidate composes them. Where a
 * library imposes structure that makes that impossible — cmdk owning item
 * clicks, for one — that is a finding to record against it, not a difference to
 * smooth over.
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
export function Highlighted({
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

/**
 * The row's own classes, without the element that carries them.
 *
 * Each candidate wraps the row in something different — an anchor inside a
 * `div[role=option]` for the hand-rolled one, a `Command.Item`, a
 * `Autocomplete.Item` with a `render` prop — so the shape has to be separable
 * from the wrapper or the four stop looking alike.
 */
export function resultRowClass(isActive: boolean): string {
  return cn(
    // Name over a quiet subline, tabular CUI right-aligned: the same grid the
    // "Începe de aici" panel uses, so the dropdown reads as that panel
    // answering rather than as a layer over it.
    'flex cursor-pointer items-baseline justify-between gap-3 border-b px-4 py-2.5 last:border-b-0',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
    isActive ? 'bg-muted' : 'hover:bg-muted/50',
  )
}

/** What goes inside a row, whatever the wrapper turns out to be. */
export function ResultRowContent({
  entity,
  query,
  isActive,
}: {
  readonly entity: EntitySearchNode
  readonly query: string
  readonly isActive: boolean
}) {
  const place = placeLine(entity)

  return (
    <>
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
    </>
  )
}

/** Where an entity goes when it is chosen. */
export function destinationFor(
  entity: EntitySearchNode,
  selectionBehavior: EntitySelectionBehavior,
): string {
  return buildEntitySelectionPath(
    { cui: entity.cui, entityType: entity.entity_type, isUat: entity.is_uat },
    selectionBehavior,
  )
}

export function ResultRow({
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
  return (
    <div role="option" id={id} aria-selected={isActive} data-active={isActive || undefined}>
      <Link
        to={destinationFor(entity, selectionBehavior) as '/'}
        preload="intent"
        onClick={onSelect}
        tabIndex={-1}
        className={resultRowClass(isActive)}
      >
        <ResultRowContent entity={entity} query={query} isActive={isActive} />
      </Link>
    </div>
  )
}

/** A quiet single line, for every state that is not a list. */
export function Message({ children }: { readonly children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>
}

export function Skeleton() {
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
export function useModifierKey() {
  const [label, setLabel] = useState('⌘')

  useEffect(() => {
    const isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!isApple) setLabel('Ctrl')
  }, [])

  return label
}

/**
 * Whether this reader has asked for less motion.
 *
 * Needed as a value rather than as a `motion-safe:` class because the animation
 * is not ours: it comes from the shared `PopoverContent`, whose
 * `data-[state=open]:animate-in` is a later rule than any `motion-reduce:`
 * utility added beside it, so the class-level guard silently loses the cascade —
 * measured, not assumed. An inline `animation: none` outranks both.
 *
 * Starts false so the server and the first client render agree; the effect
 * corrects it before anything has had a chance to animate.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return reduced
}

/** Romanian counts the noun, so the hint cannot be assembled from a number. */
export function shortHint(remaining: number) {
  return remaining === 1
    ? 'Încă un caracter pentru a căuta.'
    : `Încă ${remaining} caractere pentru a căuta.`
}

/** What a screen reader is told when the list changes. Kept out of the visual. */
export function announcement(status: SearchStatus) {
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
