import { useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { procurementFieldClassName } from '../lib/procurement-theme'

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
 * Debounced, auto-applying search input with a clear button — no submit button.
 * `value` is the committed (URL) value; local typing commits after 300 ms, and
 * external changes (chip removal, clear-all, deep-link) sync back in without
 * clobbering mid-keystroke edits. An empty box commits `undefined`, never `''`,
 * so `cleanProcurementSearch` drops `q` from the URL.
 *
 * A local copy of the parliament pattern on purpose: procurement's strings are
 * English Lingui source text and its controls use the procurement theme tokens.
 */
export function ProcurementDebouncedSearchInput({
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
    <div className={cn('relative min-w-0 flex-1', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--pnrr-muted)]"
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
        className={cn(
          procurementFieldClassName,
          'w-full px-11 [&::-webkit-search-cancel-button]:hidden',
        )}
      />
      {draft ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label={t`Clear search`}
          className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
