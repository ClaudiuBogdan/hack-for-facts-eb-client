import { useState, useEffect } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import type { PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrProjectTable } from '../table/PnrrProjectTable'
import { Search, X } from 'lucide-react'

const SEARCH_DEBOUNCE_MS = 300

export function PnrrProjectsView({
  projects,
  filterState,
}: {
  readonly projects: readonly PnrrProject[]
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}) {
  const globalSearch = filterState.search.search ?? ''
  const [inputValue, setInputValue] = useState(globalSearch)

  // Sync input with global state when changed externally (e.g. clear filters)
  useEffect(() => {
    setInputValue(globalSearch)
  }, [globalSearch])

  // Debounce global state update so typing stays responsive
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (inputValue !== globalSearch) {
        filterState.setSearch(inputValue || undefined)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [inputValue, globalSearch, filterState])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="h-10 w-1.5 bg-[var(--pnrr-blue)]" />
          <h2 className="text-2xl font-black tracking-tight text-[var(--pnrr-fg)]">
            <Trans>Proiecte</Trans>
          </h2>
          <span className="hidden text-sm text-[var(--pnrr-muted)] sm:inline">
            {projects.length.toLocaleString('ro-RO')} <Trans>proiecte</Trans>
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--pnrr-muted)]" />
        <input
          type="text"
          placeholder={t`Caută proiect...`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="h-10 w-full border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-9 py-2 text-sm text-[var(--pnrr-fg)] placeholder:text-[var(--pnrr-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => filterState.setSearch(undefined)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)]"
            aria-label={t`Clear search`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <PnrrProjectTable projects={projects} filterState={filterState} />
    </div>
  )
}
