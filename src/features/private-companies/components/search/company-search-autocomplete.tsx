import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { t } from '@lingui/core/macro'
import { Search, X } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useCompanyNameSuggestions } from '../../hooks/use-company-name-suggestions'

/** Debounce before a keystroke reaches the URL/query (PNRR convention). */
const COMMIT_DEBOUNCE_MS = 300

type Props = {
  /** The committed (URL) query. Local typing syncs back from it. */
  readonly value: string | undefined
  readonly onCommit: (value: string | undefined) => void
  /**
   * `auto` — the directory: typing commits after 300 ms and the results below
   * follow. `enter` — the hub dock: nothing happens until Enter or a click,
   * because committing would mean navigating away mid-word.
   */
  readonly commitMode?: 'auto' | 'enter'
  readonly placeholder: string
  readonly inputId: string
  readonly ariaLabel: string
  readonly className?: string
}

const INPUT_CLASS =
  'h-11 w-full rounded-none border-2 border-[#b1b4b6] bg-white px-11 text-base text-[#0b0c0c] placeholder:text-[#505a5f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:placeholder:text-[var(--pnrr-muted)] [&::-webkit-search-cancel-button]:hidden'

/**
 * Company search box with a name-suggestion dropdown. No submit button: in
 * `auto` mode the debounced draft becomes the URL `q` and drives the results
 * below; picking a suggestion that resolved to a CUI jumps straight to that
 * company's profile.
 *
 * ARIA combobox pattern: the input owns the listbox via `aria-controls` and
 * points at the highlighted option with `aria-activedescendant`; focus never
 * leaves the input.
 */
export function CompanySearchAutocomplete({
  value,
  onCommit,
  commitMode = 'auto',
  placeholder,
  inputId,
  ariaLabel,
  className,
}: Props) {
  const navigate = useNavigate()
  const committed = value ?? ''
  const [draft, setDraft] = useState(committed)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const lastCommitted = useRef(committed)
  const listboxId = useId()

  const suggestionsQuery = useCompanyNameSuggestions(draft)
  const suggestions = suggestionsQuery.data ?? []
  const showList = open && suggestions.length > 0

  // Sync back when the committed value changes from elsewhere (chip removal,
  // clear-all, deep-link) without clobbering a mid-keystroke edit.
  useEffect(() => {
    if (committed !== lastCommitted.current) {
      lastCommitted.current = committed
      setDraft(committed)
    }
  }, [committed])

  useEffect(() => {
    if (commitMode !== 'auto') return
    const next = draft.trim()
    if (next === committed) return
    const handle = window.setTimeout(() => {
      lastCommitted.current = next
      onCommit(next.length > 0 ? next : undefined)
    }, COMMIT_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [draft, committed, commitMode, onCommit])

  // A shorter list must never leave the highlight pointing past its end.
  useEffect(() => {
    setActiveIndex((index) => (index >= suggestions.length ? -1 : index))
  }, [suggestions.length])

  const commitDraft = () => {
    const next = draft.trim()
    lastCommitted.current = next
    onCommit(next.length > 0 ? next : undefined)
  }

  const openCompany = (cui: string) => {
    setOpen(false)
    void navigate({ to: '/companies/$cui', params: { cui } })
  }

  const selectSuggestion = (index: number) => {
    const suggestion = suggestions[index]
    if (!suggestion) return
    if (suggestion.cui) {
      openCompany(suggestion.cui)
      return
    }
    // A hit without a CUI is a name match only — search for it instead.
    setDraft(suggestion.label)
    lastCommitted.current = suggestion.label
    onCommit(suggestion.label)
    setOpen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index + 1) % Math.max(suggestions.length, 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      )
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (showList && activeIndex >= 0) {
        selectSuggestion(activeIndex)
        return
      }
      setOpen(false)
      commitDraft()
    }
  }

  const handleClear = () => {
    lastCommitted.current = ''
    setDraft('')
    setOpen(false)
    setActiveIndex(-1)
    onCommit(undefined)
  }

  const activeOptionId =
    showList && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined

  return (
    <div className={cn('relative min-w-0', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-[22px] h-5 w-5 -translate-y-1/2 text-[#505a5f] dark:text-[var(--pnrr-muted)]"
      />
      <input
        id={inputId}
        type="search"
        inputMode="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={draft}
        data-testid="company-search-input"
        onChange={(event) => {
          setDraft(event.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        className={INPUT_CLASS}
      />
      {draft ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label={t`Clear search`}
          className="absolute right-3 top-[22px] inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[#505a5f] transition-colors hover:text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:text-[var(--pnrr-muted)] dark:hover:text-[var(--pnrr-fg)]"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      ) : null}

      <ul
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        data-testid="company-search-suggestions"
        hidden={!showList}
        className="absolute left-0 right-0 top-11 z-20 max-h-72 overflow-y-auto border-2 border-t-0 border-[#b1b4b6] bg-white shadow-lg dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]"
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={`${suggestion.value}-${index}`}
            id={`${listboxId}-option-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            // Fires before the input's blur closes the list.
            onMouseDown={(event) => {
              event.preventDefault()
              selectSuggestion(index)
            }}
            onMouseEnter={() => setActiveIndex(index)}
            className={cn(
              'cursor-pointer px-3 py-2.5 text-sm text-[#0b0c0c] dark:text-[var(--pnrr-fg)]',
              index === activeIndex && 'bg-[#f3f2f1] dark:bg-[var(--pnrr-subtle)]',
            )}
          >
            <span className="font-semibold">{suggestion.label}</span>
            {suggestion.cui ? (
              <span className="ml-2 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                CUI {suggestion.cui}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
