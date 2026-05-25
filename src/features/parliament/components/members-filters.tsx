import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ParliamentMembersSearch } from '@/schemas/parliament'
import { getPanelFilterCount } from '../lib/member-search'
import {
  parliamentFilterInputClassName,
  parliamentFilterLabelClassName,
} from '../lib/table-theme'
import { MembersActiveFilters } from './members-active-filters'
import { FindRepDialog, FindRepTriggerButton } from './find-rep-dialog'
import {
  MembersFilterSheet,
  MembersFilterTriggerButton,
} from './members-filter-sheet'

type Props = {
  readonly search: ParliamentMembersSearch
  readonly onSearchChange: (search: ParliamentMembersSearch) => void
  readonly filterSheetOpen?: boolean
  readonly onFilterSheetOpenChange?: (open: boolean) => void
  readonly findRepOpen?: boolean
  readonly onFindRepOpenChange?: (open: boolean) => void
}

/** Inline search + PNRR-style filter panel trigger */
export function MembersFilters({
  search,
  onSearchChange,
  filterSheetOpen,
  onFilterSheetOpenChange,
  findRepOpen,
  onFindRepOpenChange,
}: Props) {
  const [query, setQuery] = useState(search.q ?? '')
  const [internalFilterSheetOpen, setInternalFilterSheetOpen] = useState(false)
  const [internalFindRepOpen, setInternalFindRepOpen] = useState(false)
  const isFilterSheetOpen = filterSheetOpen ?? internalFilterSheetOpen
  const setFilterSheetOpen = onFilterSheetOpenChange ?? setInternalFilterSheetOpen
  const isFindRepOpen = findRepOpen ?? internalFindRepOpen
  const setFindRepOpen = onFindRepOpenChange ?? setInternalFindRepOpen
  const latestSearchRef = useRef(search)
  const latestOnSearchChangeRef = useRef(onSearchChange)
  const queryTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    setQuery(search.q ?? '')
    if (queryTimerRef.current !== undefined) {
      window.clearTimeout(queryTimerRef.current)
      queryTimerRef.current = undefined
    }
  }, [search.q])

  useEffect(() => {
    latestSearchRef.current = search
    latestOnSearchChangeRef.current = onSearchChange
  }, [search, onSearchChange])

  useEffect(() => {
    return () => {
      if (queryTimerRef.current !== undefined) {
        window.clearTimeout(queryTimerRef.current)
      }
    }
  }, [])

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery)
    if (queryTimerRef.current !== undefined) {
      window.clearTimeout(queryTimerRef.current)
    }
    queryTimerRef.current = window.setTimeout(() => {
      const normalizedQuery = nextQuery.trim() || undefined
      latestOnSearchChangeRef.current({
        ...latestSearchRef.current,
        q: normalizedQuery,
        page: 1,
      })
      queryTimerRef.current = undefined
    }, 300)
  }

  const handleClearAll = () => {
    onSearchChange({
      tab: 'grupuri',
      page: 1,
    })
    setQuery('')
  }

  const panelFilterCount = getPanelFilterCount(search)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full min-w-0 sm:max-w-md">
          <label
            htmlFor="member-search"
            className={cn(parliamentFilterLabelClassName, 'mb-1.5 block')}
          >
            Caută după nume
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--pnrr-muted)]"
              aria-hidden
            />
            <input
              id="member-search"
              type="text"
              autoComplete="off"
              placeholder="Nume parlamentar..."
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              className={parliamentFilterInputClassName}
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  if (queryTimerRef.current !== undefined) {
                    window.clearTimeout(queryTimerRef.current)
                    queryTimerRef.current = undefined
                  }
                  setQuery('')
                  onSearchChange({ ...search, q: undefined, page: 1 })
                }}
                className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[var(--pnrr-muted)] transition-colors hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                aria-label="Șterge căutarea"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:shrink-0">
          <FindRepTriggerButton
            className="w-full sm:w-auto"
            onClick={() => setFindRepOpen(true)}
          />
          <MembersFilterTriggerButton
            activeCount={panelFilterCount}
            className="w-full sm:w-auto"
            onClick={() => setFilterSheetOpen(true)}
          />
        </div>
      </div>

      <MembersFilterSheet
        open={isFilterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        search={search}
        onSearchChange={onSearchChange}
      />

      <FindRepDialog
        open={isFindRepOpen}
        onOpenChange={setFindRepOpen}
        onApply={(updates) =>
          onSearchChange({
            ...search,
            ...updates,
            tab: 'grupuri',
            page: 1,
            find: undefined,
          })
        }
      />

      <MembersActiveFilters
        search={search}
        onSearchChange={onSearchChange}
        onClearAll={handleClearAll}
      />
    </div>
  )
}
