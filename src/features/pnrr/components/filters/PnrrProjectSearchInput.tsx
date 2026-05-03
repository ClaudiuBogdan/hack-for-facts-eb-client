import { useEffect, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'

const SEARCH_DEBOUNCE_MS = 300

export function PnrrProjectSearchInput({
  filterState,
  className,
  inputId = 'pnrr-project-search',
  showLabel = false,
}: {
  readonly filterState: ReturnType<typeof usePnrrFilterState>
  readonly className?: string
  readonly inputId?: string
  readonly showLabel?: boolean
}) {
  const globalSearch = filterState.search.search ?? ''
  const [inputValue, setInputValue] = useState(globalSearch)

  useEffect(() => {
    setInputValue(globalSearch)
  }, [globalSearch])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (inputValue !== globalSearch) {
        filterState.setSearch(inputValue || undefined)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [inputValue, globalSearch, filterState])

  return (
    <div className={cn('min-w-0', className)}>
      {showLabel && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]"
        >
          {t`Project search`}
        </label>
      )}
      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--pnrr-muted)]"
        />
        <input
          id={inputId}
          name="projectSearch"
          type="text"
          autoComplete="off"
          aria-label={!showLabel ? t`Project search` : undefined}
          placeholder={t`Title, beneficiary, CUI, or locality...`}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          className="h-12 w-full border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-11 py-2 text-base font-bold text-[var(--pnrr-fg)] placeholder:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('')
              filterState.setSearch(undefined)
            }}
            className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            aria-label={t`Clear search`}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
