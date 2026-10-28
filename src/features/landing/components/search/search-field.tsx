/* eslint-disable react-refresh/only-export-components -- the field's classes,
   its pill and its hint are one surface, drawn by two components. */
import { useEffect, useState, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The search field's own chrome — the box, the magnifier, the scope pill, the
 * shortcut hint and the clear button's look — shared by the combobox
 * (`landing-search.tsx`) and the plain field drawn until its code has loaded
 * (`deferred-landing-search.tsx`), so the two are one box and the swap from
 * one to the other is not seen. Nothing here imports the combobox.
 */

/** Where the plain field's focus was as the combobox replaced it. */
export interface SearchFocus {
  /** The control that had it: the input, the clear button, or neither. */
  readonly focused: 'input' | 'clear' | null
  /** Whether the keyboard brought the focus to the input, so the ring is drawn. */
  readonly keyboard: boolean
  readonly selectionStart: number | null
  readonly selectionEnd: number | null
  readonly selectionDirection: 'forward' | 'backward' | 'none' | null
}

/** What the plain field hands the combobox that replaces it. */
export interface SearchHandover {
  /** The text typed into the plain field. */
  readonly term: string
  /** Its focus, written as it unmounts: null until then, and when no plain field came first. */
  readonly focus: RefObject<SearchFocus | null>
}

/** Below this width the field is never focused on mount; `useIsMobile`'s breakpoint. */
export const NARROW_VIEWPORT = '(max-width: 767px)'

/** The field: the border, radius and lift, on the group that holds the chips and the input. */
export const SEARCH_FIELD_CLASS = [
  // The field. Border, radius and lift live here rather than on the
  // input because the chips are inside them too.
  'flex min-h-12 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card py-2 pl-10 pr-20 shadow-none',
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
].join(' ')

/**
 * The blue ring is for keyboard focus only. A reader who clicked
 * into the field can see where their pointer is; a reader who
 * tabbed in cannot, and the neutral border alone is not enough
 * of an answer for them.
 */
export const SEARCH_FIELD_KEYBOARD_CLASS = 'outline-2 outline-offset-2 outline-ring'

/**
 * The input, bare: the group draws the field. Keep room for the query and
 * wrap it below long or multiple chips on narrow screens. No outline of its
 * own: a text input is focus-visible on click too, and the group draws focus
 * instead.
 */
export const SEARCH_INPUT_CLASS =
  'h-7 min-w-24 flex-1 bg-transparent text-base text-foreground outline-hidden placeholder:text-muted-foreground md:text-base'

/** The magnifier, at the field's left. */
export const SEARCH_ICON_CLASS = 'pointer-events-none absolute left-3.5 top-6 size-4 -translate-y-1/2 text-muted-foreground'

/** The right end of the field: the spinner, then the clear button or the shortcut hint. */
export const SEARCH_ACTIONS_CLASS = 'absolute right-3 top-6 flex -translate-y-1/2 items-center gap-1.5'

/**
 * The clear button. The drawn button is 24px, which is exactly WCAG 2.2's
 * floor for a target and well under the 44px that is comfortable on a phone.
 * The hit area is grown with a pseudo-element rather than padding so the
 * visible box, and the focus ring around it, stay the size the field was
 * designed for: 10px on every side makes 44×44, which fits inside the 48px
 * field and, leftwards, overlaps only the decorative spinner.
 */
export const SEARCH_CLEAR_CLASS =
  "relative rounded-sm p-1 text-muted-foreground transition-colors after:absolute after:-inset-2.5 after:content-[''] hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"

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

/** The shortcut's hint, where the clear button is not. */
export function ShortcutHint() {
  const modifier = useModifierKey()
  return (
    <kbd className="hidden items-center gap-0.5 rounded-sm border bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground sm:flex">
      <span className={modifier === '⌘' ? 'text-xs leading-none' : undefined}>{modifier}</span>K
    </kbd>
  )
}

/** Whether this reader's `mod` is Cmd: macOS and iOS. */
export function isApplePlatform() {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

const noSubscription = () => () => undefined
const serverModifier = () => '⌘'
const platformModifier = () => (isApplePlatform() ? '⌘' : 'Ctrl')

/**
 * The modifier key this reader actually presses.
 *
 * `mod+k` binds to Cmd on macOS and Ctrl everywhere else, so a hardcoded ⌘ is
 * wrong for most readers. It cannot be resolved during render either: the
 * server has no platform to read, and returning a different glyph on the client
 * than the one in the SSR HTML is a hydration mismatch. So hydration draws the
 * server's guess and React corrects it straight after; a field mounted later —
 * the combobox replacing the plain field — reads the platform at its first
 * render, with no ⌘ in between.
 */
export function useModifierKey() {
  return useSyncExternalStore(noSubscription, platformModifier, serverModifier)
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
