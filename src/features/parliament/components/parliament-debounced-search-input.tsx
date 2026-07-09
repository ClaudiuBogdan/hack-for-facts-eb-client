import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Debounce before a keystroke reaches the URL/query (PNRR convention). */
const SEARCH_DEBOUNCE_MS = 300

type Props = {
  readonly value: string | undefined
  readonly onCommit: (value: string | undefined) => void
  readonly placeholder: string
  readonly inputId: string
  readonly ariaLabel: string
  readonly className?: string
}

/**
 * Debounced, auto-applying search input with a clear button — the PNRR search
 * pattern (no submit button), restyled for the parliament GOV.UK-light theme.
 * `value` is the committed (URL) value; local typing commits after 300 ms, and
 * external changes (chip removal, clear-all, deep-link) sync back in without
 * clobbering mid-keystroke edits.
 */
export function ParliamentDebouncedSearchInput({
  value,
  onCommit,
  placeholder,
  inputId,
  ariaLabel,
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
        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#505a5f] dark:text-[var(--pnrr-muted)]"
      />
      <input
        id={inputId}
        type="search"
        inputMode="search"
        autoComplete="off"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="h-11 w-full rounded-none border-2 border-[#b1b4b6] bg-white px-11 text-base text-[#0b0c0c] placeholder:text-[#505a5f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:placeholder:text-[var(--pnrr-muted)] [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Șterge căutarea"
          className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[#505a5f] transition-colors hover:text-[#0b0c0c] dark:text-[var(--pnrr-muted)] dark:hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
