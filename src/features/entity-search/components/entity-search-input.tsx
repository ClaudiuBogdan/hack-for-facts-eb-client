import { t } from '@lingui/core/macro'
import { Loader2, Search, X } from 'lucide-react'
import {
  useEffect,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'

type Props = {
  readonly query: string
  readonly inputRef: RefObject<HTMLInputElement | null>
  readonly listboxId: string
  readonly activeDescendantId: string | undefined
  /** Whether the results/skeleton listbox is currently in the DOM. */
  readonly isListboxMounted: boolean
  readonly isFetching: boolean
  readonly isPlaceholderData: boolean
  readonly onQueryCommit: (query: string) => void
  readonly onClear: () => void
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function EntitySearchInput({
  query,
  inputRef,
  listboxId,
  activeDescendantId,
  isListboxMounted,
  isFetching,
  isPlaceholderData,
  onQueryCommit,
  onClear,
  onKeyDown,
}: Props) {
  const [draftQuery, setDraftQuery] = useState(query)
  const debouncedQuery = useDebouncedValue(draftQuery, 250)

  useEffect(() => {
    setDraftQuery(query)
  }, [query])

  useEffect(() => {
    onQueryCommit(debouncedQuery)
  }, [debouncedQuery, onQueryCommit])

  useEffect(() => {
    inputRef.current?.focus()
  }, [inputRef])

  const showSpinner = isFetching && !isPlaceholderData
  const showClearButton = draftQuery.trim() !== '' && !showSpinner

  const clearSearch = () => {
    setDraftQuery('')
    onClear()
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (draftQuery.trim()) {
        clearSearch()
      } else {
        inputRef.current?.blur()
      }
      return
    }

    onKeyDown(event)
  }

  return (
    <div className="sticky top-0 z-30 bg-[var(--pnrr-bg)] pb-3">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--pnrr-muted)] sm:left-5 sm:h-6 sm:w-6"
        />
        <Input
          ref={inputRef}
          type="search"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t`Caută firme, instituții, legi, contracte, PNRR…`}
          autoFocus
          enterKeyHint="search"
          role="combobox"
          aria-label={t`Caută entități`}
          aria-autocomplete="list"
          aria-expanded={isListboxMounted}
          aria-controls={isListboxMounted ? listboxId : undefined}
          aria-activedescendant={activeDescendantId}
          className={cn(
            'h-14 w-full rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] pl-14 pr-20 text-base font-medium text-[var(--pnrr-fg)] shadow-none placeholder:font-normal placeholder:text-[var(--pnrr-muted)] focus-visible:border-[var(--pnrr-border)] focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)] focus-visible:ring-offset-0 sm:h-16 sm:text-lg',
          )}
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {showSpinner ? (
            <Loader2
              aria-hidden="true"
              className="h-5 w-5 animate-spin text-[var(--pnrr-muted)] motion-reduce:animate-none"
            />
          ) : null}
          {showClearButton ? (
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex h-9 w-9 items-center justify-center text-[var(--pnrr-muted)] hover:bg-[var(--pnrr-hover)] hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]"
              aria-label={t`Clear search`}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
