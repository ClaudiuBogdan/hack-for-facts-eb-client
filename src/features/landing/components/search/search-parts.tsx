/* eslint-disable react-refresh/only-export-components -- the row class, the
   hint and announcement copy and the rows that render them are one surface. */
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { EntitySearchHit } from '@/schemas/entity-search'
import { getDocTypeMeta } from '@/features/entity-search/lib/doc-type-meta'
import { highlightSegments } from '@/features/landing/lib/search-highlight'
import type { SearchFilter } from '@/features/landing/lib/search-filters'
import type { SearchStatus } from '@/features/landing/hooks/use-landing-search'

/**
 * The row, the marks, the place line, the chips, the skeleton, the messages and
 * the announcements — everything the search draws that is not the combobox
 * itself. Kept apart from `landing-search.tsx` so the interaction model can be
 * read on its own; the four-library comparison that settled it is in
 * `docs/design/landing-search-comparison.md`.
 */

/** Rows shown while a request is out, matching the height of a real row. */
const SKELETON_ROWS = 3

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

/**
 * The row's own classes, without the element that carries them.
 *
 * Each candidate wraps the row in something different — an anchor inside a
 * `div[role=option]` for the hand-rolled one, a `Command.Item`, a
 * `Autocomplete.Item` with a `render` prop — so the shape has to be separable
 * from the wrapper or the four stop looking alike.
 */
export const resultRowClass = cn(
  // Name over a quiet subline, tabular CUI right-aligned: the same grid the
  // "Începe de aici" panel uses, so the dropdown reads as that panel answering
  // rather than as a layer over it.
  'group flex cursor-pointer items-baseline justify-between gap-3 border-b px-4 py-2.5 last:border-b-0',
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
  // The active row is styled off `data-highlighted`, which the combobox sets,
  // rather than off a prop.
  //
  // This is what the keyboard was missing. Base UI reports the highlight on the
  // element instead of handing it back to React, and the row was being rendered
  // with a hardcoded `isActive={false}` left over from an implementation that
  // did hand it back — so arrowing through the list changed the accessibility
  // tree, changed `aria-activedescendant`, scrolled the row into view, and drew
  // absolutely nothing. The list worked and looked broken.
  //
  // `data-highlighted` covers both keyboard and pointer, so hover and arrow
  // keys land on the same appearance, which is correct: there is one active row
  // and one way to show it.
  'data-highlighted:bg-muted',
)

/**
 * What goes inside a row, whatever the wrapper turns out to be.
 *
 * Reads the active state through `group-data-highlighted:` rather than a prop,
 * because the attribute is set on the row by the combobox and never travels
 * back into React.
 */
export function ResultRowContent({
  entity,
  query,
}: {
  readonly entity: EntitySearchHit
  readonly query: string
}) {
  const place = [getDocTypeMeta(entity.docType).label, entity.countyName].filter(Boolean).join(' · ')

  return (
    <>
      <span className="min-w-0">
        <Highlighted
          text={entity.title}
          query={query}
          className="block truncate text-sm font-medium text-card-foreground group-data-highlighted:text-primary"
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
        text={entity.identifiers[0] ?? ''}
        query={query}
        className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
      />
    </>
  )
}

/**
 * The pill a filter is drawn as, in the field and in its suggestion row alike.
 *
 * One element for both places on purpose: the suggestion shows the reader the
 * exact object that will appear in the field if they accept it, so accepting
 * reads as the pill moving up rather than as one thing turning into another.
 */
/**
 * The pill itself: an icon and a name. `FilterPill` resolves a filter's
 * descriptor into one; a page with a fixed scope draws one directly, with a
 * label it owns, so the field says what it searches in without the word
 * having to be a filter the reader could take off.
 */
export function ScopePill({
  label,
  Icon,
  className,
  children,
}: {
  readonly label: string
  readonly Icon: LucideIcon
  readonly className?: string
  readonly children?: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 max-w-full shrink-0 items-center gap-1.5 rounded-sm bg-muted pl-2 text-xs font-medium text-foreground',
        children ? 'pr-0.5' : 'pr-2',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
      <span className="truncate">{label}</span>
      {children}
    </span>
  )
}

export function FilterPill({
  filter,
  className,
  children,
}: {
  readonly filter: SearchFilter
  readonly className?: string
  readonly children?: React.ReactNode
}) {
  const { i18n } = useLingui()
  return (
    <ScopePill label={i18n._(filter.label)} Icon={filter.Icon} className={className}>
      {children}
    </ScopePill>
  )
}

/**
 * A filter the reader has applied, sitting in the field before the text.
 *
 * The remove button is a real button with a real name, not a decorated `×` on
 * the pill: a pill that removes itself when clicked anywhere is a pill nobody
 * can click to check what it says. Backspace on an empty field removes the last
 * one as well, which is the faster path; this is the discoverable one.
 */
export function FilterChip({
  filter,
  onRemove,
}: {
  readonly filter: SearchFilter
  /** The click is passed on so the caller can tell a pointer from a key. */
  readonly onRemove: (filter: SearchFilter, event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const { i18n } = useLingui()
  const label = i18n._(filter.label)
  return (
    <FilterPill filter={filter}>
      <button
        type="button"
        aria-label={t`Elimină filtrul ${label}`}
        onClick={(event) => {
          // The group around the field focuses the input on any press inside
          // it; this press is for the chip, and the input is focused explicitly
          // afterwards so focus does not land on a button that has just gone.
          event.stopPropagation()
          onRemove(filter, event)
        }}
        // 24px drawn, 44px hit — the same treatment as the clear button, and
        // for the same reason: WCAG 2.2's floor is 24, a thumb wants 44.
        className="relative flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors after:absolute after:-inset-2.5 after:content-[''] hover:bg-foreground/10 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3" />
      </button>
    </FilterPill>
  )
}

/**
 * What goes inside a suggestion row.
 *
 * The pill first, then the hint saying what it keeps — the same two-tier grid
 * as a result row, so the suggestion group and the results read as one list
 * that happens to open with filters. The right column says what the row *is*,
 * where a result row shows an identifier; a reader scanning the column sees at
 * once where the filters stop and the entities begin.
 */
export function FilterSuggestionContent({ filter }: { readonly filter: SearchFilter }) {
  const { i18n } = useLingui()
  return (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <FilterPill filter={filter} className="group-data-highlighted:bg-background" />
        <span className="truncate text-xs text-muted-foreground">{i18n._(filter.hint)}</span>
      </span>
      <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-wide text-muted-foreground/55">
        <Trans>Filtru</Trans>
      </span>
    </>
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

/**
 * The noun is counted, so the hint cannot be assembled from a number. Called
 * during render, so the `plural` macro resolves against the active locale.
 */
export function shortHint(remaining: number) {
  return plural(remaining, {
    one: 'Încă un caracter pentru a căuta.',
    few: 'Încă # caractere pentru a căuta.',
    other: 'Încă # de caractere pentru a căuta.',
  })
}

/** What a screen reader is told when the list changes. Kept out of the visual. */
export function announcement(status: SearchStatus, suggestionCount = 0) {
  const suggested = suggestionCount === 0
    ? ''
    : ' ' + plural(suggestionCount, {
        one: 'Un filtru sugerat.',
        few: '# filtre sugerate.',
        other: '# de filtre sugerate.',
      })
  switch (status.kind) {
    case 'results': {
      if (status.stale) return t`Se actualizează rezultatele.`
      const count = plural(status.results.length, {
        one: '# rezultat.',
        few: '# rezultate.',
        other: '# de rezultate.',
      })
      return count + suggested
    }
    case 'scoped':
      return t`Scrie un nume sau un identificator pentru a căuta.`
    case 'short':
      return suggested.trim()
    case 'empty':
      return t`Niciun rezultat.` + suggested
    case 'invalid':
      return t`Scurtează căutarea la cel mult 10 cuvinte și verifică ghilimelele.`
    case 'error':
      return t`Căutarea nu a răspuns.`
    case 'loading':
      return t`Se caută.`
    default:
      return ''
  }
}
