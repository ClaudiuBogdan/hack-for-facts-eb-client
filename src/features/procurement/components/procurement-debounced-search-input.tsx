import { useEffect, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { procurementFieldClassName } from '../lib/procurement-theme'
import {
  PROCUREMENT_Q_MIN_LENGTH,
  isProcurementQTooShort,
  procurementQOrUndefined,
} from '../lib/search-query'

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
 * clobbering mid-keystroke edits.
 *
 * A term shorter than the minimum commits `undefined`, never `''` and never
 * itself: `cleanProcurementSearch` then drops `q` from the URL, so the results
 * stay unfiltered and no active-filter chip claims otherwise. A hint tells the
 * reader why their term hasn't applied yet.
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
    // A term below the minimum length commits `undefined`, not itself: the
    // server would reject it, and a `q` in the URL that isn't filtering would
    // put a lying chip in the active-filter bar.
    const next = procurementQOrUndefined(draft) ?? ''
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

  const tooShort = isProcurementQTooShort(draft)

  return (
    <div className={cn('min-w-0 flex-1', className)}>
      <div className="relative">
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
          aria-describedby={tooShort ? `${inputId}-hint` : undefined}
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
      {tooShort ? (
        <p
          id={`${inputId}-hint`}
          role="status"
          className="mt-2 text-sm text-[var(--pnrr-muted)]"
        >
          <Trans>Type at least {PROCUREMENT_Q_MIN_LENGTH} characters to search</Trans>
        </p>
      ) : null}
    </div>
  )
}
