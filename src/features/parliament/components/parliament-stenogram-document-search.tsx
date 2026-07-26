import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DOCUMENT_SEARCH_MIN_LENGTH } from '../lib/stenogram-document-search'

type Props = {
  readonly query: string
  readonly onQueryChange: (query: string) => void
  readonly matchCount: number
  readonly currentMatch: number
  readonly onStep: (direction: 1 | -1) => void
  readonly className?: string
}

/**
 * Find-in-document, with previous/next match navigation.
 *
 * Deliberately NOT a URL param: this searches text that is already on screen,
 * and routing every keystroke would rewrite history while the reader types.
 * The keyboard model mirrors what people already know from a browser's own
 * find bar — Enter for next, Shift+Enter for previous, Escape to clear — and
 * the hit counter is `aria-live` so a screen-reader user hears the count change
 * instead of having to hunt for it.
 */
export function ParliamentStenogramDocumentSearch({
  query,
  onQueryChange,
  matchCount,
  currentMatch,
  onStep,
  className,
}: Props) {
  const [draft, setDraft] = useState(query)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(query)
  }, [query])

  useEffect(() => {
    const handle = window.setTimeout(() => onQueryChange(draft), 200)
    return () => window.clearTimeout(handle)
  }, [draft, onQueryChange])

  const active = draft.trim().length >= DOCUMENT_SEARCH_MIN_LENGTH
  const disabled = !active || matchCount === 0

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search
          aria-hidden
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#505a5f] dark:text-[var(--pnrr-muted)]"
        />
        <input
          ref={inputRef}
          id="stenogram-document-search"
          type="search"
          inputMode="search"
          autoComplete="off"
          aria-label={t`Caută în textul acestei ședințe`}
          aria-describedby="stenogram-document-search-status"
          placeholder={t`Caută în ședință…`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (!disabled) onStep(event.shiftKey ? -1 : 1)
              return
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              setDraft('')
              onQueryChange('')
            }
          }}
          className="h-10 w-full rounded-none border-2 border-[#b1b4b6] bg-white px-9 text-sm text-[#0b0c0c] placeholder:text-[#505a5f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] [&::-webkit-search-cancel-button]:hidden"
        />
        {draft ? (
          <button
            type="button"
            onClick={() => {
              setDraft('')
              onQueryChange('')
              inputRef.current?.focus()
            }}
            aria-label={t`Șterge căutarea în ședință`}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center text-[#505a5f] hover:text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:text-[var(--pnrr-muted)] dark:hover:text-[var(--pnrr-fg)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          onClick={() => onStep(-1)}
          aria-label={t`Rezultatul anterior`}
          className="h-10 w-10 rounded-none border-2"
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          onClick={() => onStep(1)}
          aria-label={t`Rezultatul următor`}
          className="h-10 w-10 rounded-none border-2"
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <p
        id="stenogram-document-search-status"
        aria-live="polite"
        className="text-sm tabular-nums text-[#505a5f] dark:text-[var(--pnrr-muted)]"
      >
        {!active ? (
          <Trans>Tastați cel puțin {DOCUMENT_SEARCH_MIN_LENGTH} litere.</Trans>
        ) : matchCount === 0 ? (
          <Trans>Niciun rezultat în această ședință.</Trans>
        ) : (
          <Trans>
            {currentMatch + 1} din {matchCount}
          </Trans>
        )}
      </p>
    </div>
  )
}
