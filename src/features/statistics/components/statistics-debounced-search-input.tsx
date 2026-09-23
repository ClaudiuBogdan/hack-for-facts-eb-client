import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Debounce before a keystroke reaches the URL/query. */
const SEARCH_DEBOUNCE_MS = 300

/**
 * `lg` is for a field that IS the page's way in — the catalog's search over
 * 1,916 datasets. It holds 16px at every width: that is also the size below
 * which iOS zooms the page on focus. `md:text-base` is not redundant — the
 * `Input` primitive carries `md:text-sm`, and tailwind-merge keeps a bare
 * `text-base` and a breakpoint-scoped `text-sm` side by side, so without it
 * the field drops to 14px on the desktop it was enlarged for.
 */
const SIZES = {
  default: {
    field: 'h-10 pl-9 pr-9 text-base md:text-sm',
    icon: 'left-3 h-4 w-4',
    clear: 'right-2 h-7 w-7',
  },
  lg: {
    field: 'h-12 pl-11 pr-11 text-base md:text-base',
    icon: 'left-3.5 h-5 w-5',
    clear: 'right-2.5 h-8 w-8',
  },
} as const

type Props = {
  readonly value: string | undefined
  readonly onCommit: (value: string | undefined) => void
  readonly placeholder: string
  readonly inputId: string
  readonly ariaLabel: string
  readonly clearLabel: string
  readonly size?: keyof typeof SIZES
  readonly className?: string
}

/**
 * Debounced, auto-applying search input with a clear button — there is no
 * submit button anywhere in the statistics module.
 *
 * `value` is the committed (URL) value. Local typing commits after 300 ms;
 * external changes (chip removal, clear-all, deep-link) sync back into the
 * draft without clobbering a mid-keystroke edit, which is what the
 * `lastCommitted` ref guards.
 */
export function StatisticsDebouncedSearchInput({
  value,
  onCommit,
  placeholder,
  inputId,
  ariaLabel,
  clearLabel,
  size = 'default',
  className,
}: Props) {
  const sizing = SIZES[size]
  const committed = value ?? ''
  const [draft, setDraft] = useState(committed)
  const lastCommitted = useRef(committed)

  // Callers pass an inline arrow (`onTermChange`), so `onCommit` has a new
  // identity every render. Holding it in a ref keeps it out of the debounce
  // effect's deps — otherwise each re-render restarts the timer and, while the
  // user keeps typing, it never fires.
  const onCommitRef = useRef(onCommit)
  onCommitRef.current = onCommit

  useEffect(() => {
    if (committed !== lastCommitted.current) {
      lastCommitted.current = committed
      setDraft(committed)
    }
  }, [committed])

  useEffect(() => {
    const next = draft.trim()
    if (next === committed) return
    const handle = window.setTimeout(() => {
      lastCommitted.current = next
      onCommitRef.current(next.length > 0 ? next : undefined)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [draft, committed])

  const handleClear = () => {
    lastCommitted.current = ''
    setDraft('')
    onCommit(undefined)
  }

  return (
    <div className={cn('relative min-w-0', className)}>
      <Search
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
          sizing.icon,
        )}
      />
      <Input
        id={inputId}
        type="search"
        inputMode="search"
        autoComplete="off"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        // The field sits on the page surface and queries the white band under
        // it, so it takes the card's white too. DESIGN.md §Elevation: borders
        // not shadows, and focus is a 2px navy ring, not the primitive's 1px.
        className={cn(
          'bg-card shadow-none transition-colors hover:border-muted-foreground/40 focus-visible:ring-2 [&::-webkit-search-cancel-button]:hidden',
          sizing.field,
        )}
      />
      {draft ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label={clearLabel}
          className={cn(
            'absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            sizing.clear,
          )}
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
