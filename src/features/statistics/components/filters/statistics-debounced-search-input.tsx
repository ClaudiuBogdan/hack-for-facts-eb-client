import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Debounce before a keystroke reaches the URL/query. */
const SEARCH_DEBOUNCE_MS = 300

type Props = {
  readonly value: string | undefined
  readonly onCommit: (value: string | undefined) => void
  readonly placeholder: string
  readonly inputId: string
  readonly ariaLabel: string
  readonly clearLabel: string
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
  className,
}: Props) {
  const committed = value ?? ''
  const [draft, setDraft] = useState(committed)
  const lastCommitted = useRef(committed)

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
      onCommit(next.length > 0 ? next : undefined)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [draft, committed, onCommit])

  const handleClear = () => {
    lastCommitted.current = ''
    setDraft('')
    onCommit(undefined)
  }

  return (
    <div className={cn('relative min-w-0', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
        className="h-10 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label={clearLabel}
          className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
